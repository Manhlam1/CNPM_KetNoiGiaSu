import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { badRequest } from '../../common/app.exception';
import { EscrowStatus, PaymentStatus, WalletTxType } from '../../common/enums';
import { SystemConfigService } from '../m1-account/system-config/system-config.service';
import { ClockService } from '../m1-account/system-config/clock.service';
import { Booking } from '../m3-booking/entities/booking.entity';
import { splitCommission } from './commission';
import { Payment } from './entities/payment.entity';
import { ESCROW_WALLET, PLATFORM_WALLET, WalletService } from './wallet.service';

/**
 * Cơ chế giữ tiền (escrow). Mọi hàm nhận EntityManager của transaction bên gọi,
 * để thay đổi trạng thái buổi học và dòng tiền cùng thành công hoặc cùng thất bại.
 *
 *   hold    : học viên trả -> ví ESCROW (+)                         HELD
 *   release : ESCROW (-) -> gia sư (+ phần còn lại) & PLATFORM (+ hoa hồng)   RELEASED
 *   refund  : ESCROW (-) -> ví học viên (+)                          REFUNDED
 *   freeze  : giữ nguyên tiền, chặn tự giải ngân                      FROZEN
 */
@Injectable()
export class EscrowService {
  constructor(
    private readonly wallets: WalletService,
    private readonly configs: SystemConfigService,
    private readonly clock: ClockService,
  ) {}

  /** Khoản thanh toán thành công của buổi học (khóa dòng để xử lý tuần tự) */
  async lockPaymentOf(manager: EntityManager, bookingId: number): Promise<Payment | null> {
    return manager.findOne(Payment, { where: { bookingId, status: PaymentStatus.SUCCESS }, lock: { mode: 'pessimistic_write' } });
  }

  async hold(manager: EntityManager, payment: Payment) {
    if (payment.escrowStatus !== EscrowStatus.NONE) throw badRequest('ESCROW_STATE', 'Khoản thanh toán đã được ghi nhận');
    const escrow = await this.wallets.systemWallet(manager, ESCROW_WALLET);
    await this.wallets.post(manager, escrow.id, payment.amount, WalletTxType.PAYMENT_IN, `Giữ hộ học phí buổi học #${payment.bookingId}`, {
      bookingId: payment.bookingId,
      paymentId: payment.id,
    });
    payment.escrowStatus = EscrowStatus.HELD;
    await manager.save(payment);
  }

  async release(manager: EntityManager, bookingId: number) {
    const p = await this.lockPaymentOf(manager, bookingId);
    if (!p) throw badRequest('NO_PAYMENT', 'Buổi học chưa được thanh toán');
    if (p.escrowStatus !== EscrowStatus.HELD && p.escrowStatus !== EscrowStatus.FROZEN) {
      throw badRequest('ESCROW_NOT_HELD', 'Tiền của buổi học không còn ở trạng thái giữ');
    }
    const booking = await manager.findOneByOrFail(Booking, { id: bookingId });
    const { commission, tutorNet } = splitCommission(p.amount, this.configs.commissionPercent());
    const escrow = await this.wallets.systemWallet(manager, ESCROW_WALLET);
    const tutorWallet = await this.wallets.userWallet(manager, booking.tutorUserId);
    const platform = await this.wallets.systemWallet(manager, PLATFORM_WALLET);
    const label = booking.code || `#${bookingId}`;
    const refs = { bookingId, paymentId: p.id };

    await this.wallets.post(manager, escrow.id, -p.amount, WalletTxType.ESCROW_OUT, `Giải ngân buổi học ${label}`, refs);
    await this.wallets.post(manager, tutorWallet.id, tutorNet, WalletTxType.RELEASE_TO_TUTOR, `Nhận tiền buổi học ${label}`, refs);
    await this.wallets.post(manager, platform.id, commission, WalletTxType.COMMISSION, `Hoa hồng buổi học ${label}`, refs);

    p.escrowStatus = EscrowStatus.RELEASED;
    p.releasedAt = this.clock.now();
    p.commissionAmount = commission;
    p.tutorAmount = tutorNet;
    await manager.save(p);
    return { amount: p.amount, commission, tutorNet };
  }

  async refund(manager: EntityManager, bookingId: number) {
    const p = await this.lockPaymentOf(manager, bookingId);
    if (!p) return null; // chưa trả tiền thì không có gì để hoàn
    return this.refundPayment(manager, p);
  }

  async refundPayment(manager: EntityManager, p: Payment) {
    if (p.escrowStatus !== EscrowStatus.HELD && p.escrowStatus !== EscrowStatus.FROZEN) {
      throw badRequest('ESCROW_NOT_HELD', 'Tiền của buổi học không còn ở trạng thái giữ');
    }
    const escrow = await this.wallets.systemWallet(manager, ESCROW_WALLET);
    const studentWallet = await this.wallets.userWallet(manager, p.studentId);
    const refs = { bookingId: p.bookingId, paymentId: p.id };
    await this.wallets.post(manager, escrow.id, -p.amount, WalletTxType.ESCROW_OUT, `Hoàn tiền buổi học #${p.bookingId}`, refs);
    await this.wallets.post(manager, studentWallet.id, p.amount, WalletTxType.REFUND, `Hoàn tiền buổi học #${p.bookingId}`, refs);
    p.escrowStatus = EscrowStatus.REFUNDED;
    p.refundedAt = this.clock.now();
    p.refundAmount = p.amount;
    await manager.save(p);
    return { refundAmount: p.amount };
  }

  async freeze(manager: EntityManager, bookingId: number) {
    const p = await this.lockPaymentOf(manager, bookingId);
    if (!p || p.escrowStatus !== EscrowStatus.HELD) throw badRequest('ESCROW_NOT_HELD', 'Không có khoản tiền đang giữ để đóng băng');
    p.escrowStatus = EscrowStatus.FROZEN;
    await manager.save(p);
  }
}
