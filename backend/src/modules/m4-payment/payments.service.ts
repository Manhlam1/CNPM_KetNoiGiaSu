import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Not, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, forbidden, notFound } from '../../common/app.exception';
import { BookingStatus, EscrowStatus, NotificationType, PaymentProvider, PaymentStatus } from '../../common/enums';
import { EVENTS, PaymentSucceededEvent, PaymentSucceededResult } from '../../common/events';
import { skipTake } from '../../common/pagination';
import { cfg } from '../../config/configuration';
import { ClockService } from '../m1-account/system-config/clock.service';
import { Booking } from '../m3-booking/entities/booking.entity';
import { NotificationsService } from '../m5-communication/notifications.service';
import { Payment } from './entities/payment.entity';
import { EscrowService } from './escrow.service';
import { buildPaymentUrl, verifyReturn, vnpDate } from './vnpay.util';

export interface GatewayResult {
  txnRef: string;
  success: boolean;
  amount: number; // đồng
  providerTxnNo?: string;
  bankCode?: string;
  raw?: string;
  failureReason?: string;
}

/** Mã phản hồi IPN theo quy ước VNPay */
export type IpnCode = '00' | '01' | '02' | '04' | '97' | '99';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly escrow: EscrowService,
    private readonly events: EventEmitter2,
    private readonly clock: ClockService,
    private readonly notifications: NotificationsService,
  ) {}

  providers() {
    const c = cfg().payment;
    const vnpayReady = !!(c.vnpay.tmnCode && c.vnpay.hashSecret);
    const available = [PaymentProvider.MOCK, ...(vnpayReady ? [PaymentProvider.VNPAY] : [])];
    const def = c.provider === 'vnpay' && vnpayReady ? PaymentProvider.VNPAY : PaymentProvider.MOCK;
    return { default: def, available };
  }

  /** Tạo lần thanh toán cho buổi học đang chờ thanh toán, trả về URL cổng thanh toán */
  async createForBooking(studentId: number, bookingId: number, requested: PaymentProvider | undefined, ip: string) {
    const booking = await this.ds.getRepository(Booking).findOne({ where: { id: bookingId }, relations: { tutorProfile: { user: true } } });
    if (!booking) throw notFound('Không tìm thấy buổi học');
    if (booking.studentId !== studentId) throw forbidden('Đây không phải buổi học của bạn');
    if (booking.status !== BookingStatus.PENDING_PAYMENT) throw badRequest('BOOKING_NOT_PAYABLE', 'Buổi học không ở trạng thái chờ thanh toán');
    const now = this.clock.now();
    if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) throw badRequest('HOLD_EXPIRED', 'Đã hết thời gian giữ chỗ, vui lòng đặt lại');

    const { default: def, available } = this.providers();
    const provider = requested ?? def;
    if (!available.includes(provider)) throw badRequest('PROVIDER_UNAVAILABLE', 'Cổng thanh toán này chưa được cấu hình');

    const txnRef = `TH${bookingId}${Date.now().toString().slice(-8)}${randomBytes(2).toString('hex').toUpperCase()}`;
    const payment = await this.payments.save(
      this.payments.create({ bookingId, studentId, amount: booking.price, provider, status: PaymentStatus.PENDING, escrowStatus: EscrowStatus.NONE, txnRef }),
    );

    let paymentUrl: string;
    if (provider === PaymentProvider.VNPAY) {
      const c = cfg().payment.vnpay;
      paymentUrl = buildPaymentUrl(
        c.payUrl,
        {
          vnp_Version: '2.1.0',
          vnp_Command: 'pay',
          vnp_TmnCode: c.tmnCode,
          vnp_Locale: 'vn',
          vnp_CurrCode: 'VND',
          vnp_TxnRef: txnRef,
          vnp_OrderInfo: `Thanh toan buoi hoc ${booking.code}`,
          vnp_OrderType: 'other',
          vnp_Amount: String(booking.price * 100), // VNPay nhận số tiền x100
          vnp_ReturnUrl: c.returnUrl,
          vnp_IpAddr: ip || '127.0.0.1',
          // Ngày tạo/hết hạn theo giờ thật (VNPay so với đồng hồ của họ)
          vnp_CreateDate: vnpDate(new Date()),
          vnp_ExpireDate: vnpDate(new Date(Date.now() + 15 * 60_000)),
        },
        c.hashSecret,
      );
    } else {
      paymentUrl = `/payment/mock?txnRef=${encodeURIComponent(txnRef)}`;
    }
    return { paymentId: payment.id, txnRef, provider, amount: payment.amount, paymentUrl, holdExpiresAt: booking.holdExpiresAt };
  }

  /**
   * Xử lý kết quả từ cổng thanh toán (IPN, Return URL, hoặc cổng giả lập).
   * Idempotent: gọi lặp nhiều lần với cùng txnRef chỉ ghi nhận tiền một lần.
   */
  async handleGatewayResult(r: GatewayResult): Promise<{ code: IpnCode; message: string; bookingId?: number; status?: string }> {
    let notifyAfter: (() => Promise<void>) | null = null;
    const result = await this.ds.transaction(async (manager) => {
      const p = await manager.findOne(Payment, { where: { txnRef: r.txnRef }, lock: { mode: 'pessimistic_write' } });
      if (!p) return { code: '01' as IpnCode, message: 'Order not found' };
      if (p.status !== PaymentStatus.PENDING) {
        return { code: '02' as IpnCode, message: 'Order already confirmed', bookingId: p.bookingId, status: p.status };
      }
      if (Math.round(r.amount) !== p.amount) {
        return { code: '04' as IpnCode, message: 'Invalid amount', bookingId: p.bookingId };
      }
      p.rawResponse = r.raw ?? null;
      p.providerTxnNo = r.providerTxnNo ?? null;
      p.bankCode = r.bankCode ?? null;

      if (!r.success) {
        p.status = PaymentStatus.FAILED;
        p.failureReason = r.failureReason ?? 'Giao dịch không thành công';
        await manager.save(p);
        return { code: '00' as IpnCode, message: 'Confirm Success', bookingId: p.bookingId, status: p.status };
      }

      p.status = PaymentStatus.SUCCESS;
      p.paidAt = this.clock.now();
      await manager.save(p);
      await this.escrow.hold(manager, p); // tiền vào ví giữ hộ

      // Báo M3 xác nhận buổi học (cùng transaction)
      const results: PaymentSucceededResult[] = await this.events.emitAsync(EVENTS.PAYMENT_SUCCEEDED, {
        bookingId: p.bookingId,
        paymentId: p.id,
        manager,
      } satisfies PaymentSucceededEvent);
      const accepted = results.length > 0 && results.every((x) => x?.accepted);

      if (!accepted) {
        // Trả tiền khi buổi học đã hết hạn giữ chỗ/đã hủy -> hoàn ngay cho học viên
        await this.escrow.refundPayment(manager, p);
        notifyAfter = () =>
          this.notifications.notify(
            p.studentId,
            {
              type: NotificationType.PAYMENT,
              title: 'Đã hoàn tiền do buổi học không còn giữ chỗ',
              body: 'Khoản thanh toán tới sau khi hết thời gian giữ chỗ nên TutorHub đã hoàn lại vào ví của bạn.',
              link: `/app/bookings/${p.bookingId}`,
            },
            { email: true },
          );
        return { code: '00' as IpnCode, message: 'Confirm Success', bookingId: p.bookingId, status: 'REFUNDED' };
      }

      const booking = await manager.findOne(Booking, { where: { id: p.bookingId }, relations: { student: true } });
      notifyAfter = async () => {
        await this.notifications.notify(p.studentId, {
          type: NotificationType.PAYMENT,
          title: `Thanh toán thành công buổi học ${booking?.code}`,
          body: 'TutorHub đang giữ học phí. Sau buổi học, hãy bấm xác nhận hoàn tất để gia sư nhận tiền.',
          link: `/app/bookings/${p.bookingId}`,
        });
        if (booking) {
          await this.notifications.notify(
            booking.tutorUserId,
            {
              type: NotificationType.BOOKING,
              title: `Có buổi học mới ${booking.code}`,
              body: `${booking.student?.fullName} đã đặt và thanh toán. Học phí đang được TutorHub giữ.`,
              link: `/app/bookings/${p.bookingId}`,
            },
            { email: true },
          );
        }
      };
      return { code: '00' as IpnCode, message: 'Confirm Success', bookingId: p.bookingId, status: p.status };
    });
    if (notifyAfter) await (notifyAfter as () => Promise<void>)();
    return result;
  }

  // ---------------------------------------------------------------- Cổng giả lập (MOCK)

  async mockInfo(studentId: number, txnRef: string) {
    const p = await this.payments.findOneBy({ txnRef });
    if (!p || p.provider !== PaymentProvider.MOCK) throw notFound('Không tìm thấy giao dịch');
    if (p.studentId !== studentId) throw forbidden('Đây không phải giao dịch của bạn');
    const booking = await this.ds.getRepository(Booking).findOne({ where: { id: p.bookingId }, relations: { tutorProfile: { user: true }, subject: true } });
    return {
      txnRef: p.txnRef,
      amount: p.amount,
      status: p.status,
      bookingId: p.bookingId,
      bookingCode: booking?.code,
      tutorName: booking?.tutorProfile?.user?.fullName,
      subject: booking?.subject?.name ?? null,
      startAt: booking?.startAt,
      endAt: booking?.endAt,
      holdExpiresAt: booking?.holdExpiresAt,
      serverNow: this.clock.now(),
    };
  }

  async mockComplete(studentId: number, txnRef: string, success: boolean) {
    const p = await this.payments.findOneBy({ txnRef });
    if (!p || p.provider !== PaymentProvider.MOCK) throw notFound('Không tìm thấy giao dịch');
    if (p.studentId !== studentId) throw forbidden('Đây không phải giao dịch của bạn');
    const r = await this.handleGatewayResult({
      txnRef,
      success,
      amount: p.amount,
      providerTxnNo: `MOCK${Date.now()}`,
      bankCode: 'MOCKBANK',
      raw: JSON.stringify({ mock: true, success }),
      failureReason: success ? undefined : 'Người dùng hủy giao dịch trên cổng giả lập',
    });
    return { bookingId: p.bookingId, status: r.status ?? (success ? 'SUCCESS' : 'FAILED') };
  }

  // ---------------------------------------------------------------- VNPay

  /** Chuyển query VNPay về GatewayResult (sau khi đã kiểm tra chữ ký) */
  private fromVnpQuery(q: Record<string, any>): GatewayResult {
    const success = q.vnp_ResponseCode === '00' && q.vnp_TransactionStatus === '00';
    return {
      txnRef: String(q.vnp_TxnRef || ''),
      success,
      amount: Math.round(Number(q.vnp_Amount || 0) / 100),
      providerTxnNo: q.vnp_TransactionNo,
      bankCode: q.vnp_BankCode,
      raw: JSON.stringify(q),
      failureReason: success ? undefined : `VNPay trả mã ${q.vnp_ResponseCode}`,
    };
  }

  async vnpayIpn(q: Record<string, any>): Promise<{ RspCode: IpnCode; Message: string }> {
    try {
      if (!verifyReturn(q, cfg().payment.vnpay.hashSecret)) return { RspCode: '97', Message: 'Invalid signature' };
      const r = await this.handleGatewayResult(this.fromVnpQuery(q));
      return { RspCode: r.code, Message: r.message };
    } catch (e: any) {
      this.logger.error(`IPN lỗi: ${e.message}`);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }

  /** Return URL: trình duyệt người dùng quay về. Trả về URL frontend để redirect. */
  async vnpayReturn(q: Record<string, any>): Promise<string> {
    const fe = cfg().frontendUrl;
    if (!verifyReturn(q, cfg().payment.vnpay.hashSecret)) return `${fe}/payment/result?status=invalid`;
    const r = this.fromVnpQuery(q);
    const p = await this.payments.findOneBy({ txnRef: r.txnRef });
    if (!p) return `${fe}/payment/result?status=invalid`;
    if (cfg().payment.vnpay.processOnReturn) await this.handleGatewayResult(r);
    return `${fe}/payment/result?bookingId=${p.bookingId}&status=${r.success ? 'success' : 'failed'}`;
  }

  // ---------------------------------------------------------------- Tra cứu

  async listMine(studentId: number, q: { page?: number; size?: number }) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.payments
      .createQueryBuilder('p')
      .leftJoin(Booking, 'b', 'b.id = p.bookingId')
      .leftJoin('b.tutorProfile', 'tp')
      .leftJoin('tp.user', 'tu')
      .select(['p'])
      .addSelect(['b.code', 'b.startAt', 'b.endAt', 'b.status', 'tu.fullName'])
      .where('p.studentId = :sid', { sid: studentId })
      .andWhere('p.status <> :pending', { pending: PaymentStatus.PENDING })
      .orderBy('p.id', 'DESC')
      .offset(skip)
      .limit(take);
    const total = await this.payments.count({ where: { studentId, status: Not(PaymentStatus.PENDING) } });
    const raw = await qb.getRawAndEntities();
    const items = raw.entities.map((p, i) => ({
      ...this.toDto(p),
      bookingCode: raw.raw[i].b_code,
      bookingStatus: raw.raw[i].b_status,
      startAt: raw.raw[i].b_startAt,
      tutorName: raw.raw[i].tu_fullName,
    }));
    return toPage(items, total, page, size);
  }

  async adminList(q: { page?: number; size?: number; status?: PaymentStatus; escrowStatus?: EscrowStatus; q?: string }) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.payments
      .createQueryBuilder('p')
      .leftJoin(Booking, 'b', 'b.id = p.bookingId')
      .leftJoin('b.student', 'st')
      .leftJoin('b.tutorProfile', 'tp')
      .leftJoin('tp.user', 'tu')
      .select(['p'])
      .addSelect(['b.code', 'b.status', 'st.fullName', 'tu.fullName']);
    if (q.status) qb.andWhere('p.status = :s', { s: q.status });
    if (q.escrowStatus) qb.andWhere('p.escrowStatus = :e', { e: q.escrowStatus });
    if (q.q) qb.andWhere('(p.txnRef LIKE :q OR b.code LIKE :q)', { q: `%${q.q}%` });
    const total = await qb.getCount();
    const raw = await qb.orderBy('p.id', 'DESC').offset(skip).limit(take).getRawAndEntities();
    const items = raw.entities.map((p, i) => ({
      ...this.toDto(p),
      bookingCode: raw.raw[i].b_code,
      bookingStatus: raw.raw[i].b_status,
      studentName: raw.raw[i].st_fullName,
      tutorName: raw.raw[i].tu_fullName,
    }));
    return toPage(items, total, page, size);
  }

  toDto(p: Payment) {
    return {
      id: p.id,
      bookingId: p.bookingId,
      amount: p.amount,
      provider: p.provider,
      status: p.status,
      escrowStatus: p.escrowStatus,
      txnRef: p.txnRef,
      providerTxnNo: p.providerTxnNo,
      bankCode: p.bankCode,
      paidAt: p.paidAt,
      releasedAt: p.releasedAt,
      refundedAt: p.refundedAt,
      commissionAmount: p.commissionAmount,
      tutorAmount: p.tutorAmount,
      refundAmount: p.refundAmount,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
    };
  }
}
