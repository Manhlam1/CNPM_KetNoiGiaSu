import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest } from '../../common/app.exception';
import { EscrowStatus, PaymentStatus, Role, WalletTxType, WalletType, WithdrawalStatus } from '../../common/enums';
import { skipTake } from '../../common/pagination';
import { Payment } from './entities/payment.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Withdrawal } from './entities/withdrawal.entity';

export const ESCROW_WALLET = 'ESCROW';
export const PLATFORM_WALLET = 'PLATFORM';

export interface PostRefs {
  bookingId?: number | null;
  paymentId?: number | null;
  withdrawalId?: number | null;
}

/**
 * Ví + sổ cái. Mọi thay đổi số dư đi qua post(): khóa dòng ví (SELECT ... FOR UPDATE),
 * cộng/trừ, ghi WalletTransaction với số dư sau giao dịch. Không bao giờ sửa thẳng số dư.
 * Luôn khóa ví ESCROW trước, sau đó mới tới ví người dùng/PLATFORM -> tránh deadlock.
 */
@Injectable()
export class WalletService implements OnModuleInit {
  constructor(
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction) private readonly txs: Repository<WalletTransaction>,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  async onModuleInit() {
    await this.ensureSystemWallets();
  }

  async ensureSystemWallets() {
    for (const [code, type] of [
      [ESCROW_WALLET, WalletType.ESCROW],
      [PLATFORM_WALLET, WalletType.PLATFORM],
    ] as const) {
      await this.wallets.createQueryBuilder().insert().into(Wallet).values({ code, type, balance: 0, createdAt: new Date(), updatedAt: new Date() }).orIgnore().updateEntity(false).execute();
    }
  }

  async systemWallet(manager: EntityManager, code: string): Promise<Wallet> {
    return manager.findOneByOrFail(Wallet, { code });
  }

  async userWallet(manager: EntityManager, userId: number): Promise<Wallet> {
    const found = await manager.findOneBy(Wallet, { userId });
    if (found) return found;
    await manager
      .createQueryBuilder()
      .insert()
      .into(Wallet)
      .values({ code: `USER-${userId}`, type: WalletType.USER, userId, balance: 0, createdAt: new Date(), updatedAt: new Date() })
      .orIgnore()
      .updateEntity(false)
      .execute();
    return manager.findOneByOrFail(Wallet, { userId });
  }

  /** Ghi một bút toán vào ví (phải gọi trong transaction) */
  async post(manager: EntityManager, walletId: number, amount: number, type: WalletTxType, description: string, refs: PostRefs = {}) {
    if (!Number.isSafeInteger(amount) || amount === 0) return null;
    const w = await manager.findOne(Wallet, { where: { id: walletId }, lock: { mode: 'pessimistic_write' } });
    if (!w) throw badRequest('WALLET_NOT_FOUND', 'Không tìm thấy ví');
    const after = w.balance + amount;
    if (after < 0) throw badRequest('INSUFFICIENT_BALANCE', 'Số dư ví không đủ');
    w.balance = after;
    await manager.save(w);
    return manager.save(
      manager.create(WalletTransaction, {
        walletId: w.id,
        type,
        amount,
        balanceAfter: after,
        description: description.slice(0, 255),
        bookingId: refs.bookingId ?? null,
        paymentId: refs.paymentId ?? null,
        withdrawalId: refs.withdrawalId ?? null,
      }),
    );
  }

  /** Tổng quan ví của người dùng đang đăng nhập */
  async summary(userId: number, role: Role) {
    const wallet = await this.userWallet(this.ds.manager, userId);
    const sum = async (sql: string, params: any[]) => Number((await this.ds.query(sql, params))[0]?.s || 0);

    if (role === Role.TUTOR) {
      const held = await sum(
        `SELECT COALESCE(SUM(p.amount),0) s FROM payments p JOIN bookings b ON b.id = p.bookingId
         WHERE b.tutorUserId = ? AND p.status = ? AND p.escrowStatus IN (?, ?)`,
        [userId, PaymentStatus.SUCCESS, EscrowStatus.HELD, EscrowStatus.FROZEN],
      );
      const earned = await sum(`SELECT COALESCE(SUM(amount),0) s FROM wallet_transactions WHERE walletId = ? AND type = ?`, [wallet.id, WalletTxType.RELEASE_TO_TUTOR]);
      const pendingWithdrawal = await sum(`SELECT COALESCE(SUM(amount),0) s FROM withdrawals WHERE userId = ? AND status = ?`, [userId, WithdrawalStatus.PENDING]);
      const withdrawn = await sum(`SELECT COALESCE(SUM(amount),0) s FROM withdrawals WHERE userId = ? AND status = ?`, [userId, WithdrawalStatus.APPROVED]);
      return { walletId: wallet.id, balance: wallet.balance, heldInEscrow: held, totalEarned: earned, pendingWithdrawal, withdrawn };
    }
    const paid = await sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE studentId = ? AND status = ?`, [userId, PaymentStatus.SUCCESS]);
    const held = await sum(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE studentId = ? AND status = ? AND escrowStatus IN (?, ?)`, [
      userId,
      PaymentStatus.SUCCESS,
      EscrowStatus.HELD,
      EscrowStatus.FROZEN,
    ]);
    const refunded = await sum(`SELECT COALESCE(SUM(amount),0) s FROM wallet_transactions WHERE walletId = ? AND type = ?`, [wallet.id, WalletTxType.REFUND]);
    return { walletId: wallet.id, balance: wallet.balance, totalPaid: paid, heldInEscrow: held, totalRefunded: refunded };
  }

  async transactions(userId: number, q: { page?: number; size?: number }) {
    const wallet = await this.userWallet(this.ds.manager, userId);
    const { page, size, skip, take } = skipTake(q);
    const [items, total] = await this.txs.findAndCount({ where: { walletId: wallet.id }, order: { id: 'DESC' }, skip, take });
    return toPage(items, total, page, size);
  }

  /**
   * Kiểm tra bất biến tiền:
   *  1) Tổng tiền vào (thanh toán thành công) = tiền đang giữ + gia sư nhận + hoa hồng + hoàn cho học viên
   *  2) Số dư ví escrow = tổng các khoản thanh toán đang HELD/FROZEN
   *  3) Số dư mỗi ví = tổng các dòng sổ cái của ví đó
   */
  async checkInvariants(manager: EntityManager = this.ds.manager) {
    const n = async (sql: string, params: any[] = []) => Number((await manager.query(sql, params))[0]?.s || 0);
    const escrow = await this.systemWallet(manager, ESCROW_WALLET);
    const totalIn = await n(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = ?`, [PaymentStatus.SUCCESS]);
    const held = await n(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = ? AND escrowStatus IN (?, ?)`, [PaymentStatus.SUCCESS, EscrowStatus.HELD, EscrowStatus.FROZEN]);
    const out = await n(`SELECT COALESCE(SUM(amount),0) s FROM wallet_transactions WHERE type IN (?, ?, ?)`, [WalletTxType.RELEASE_TO_TUTOR, WalletTxType.COMMISSION, WalletTxType.REFUND]);
    const mismatched = await manager.query(
      `SELECT w.id, w.code, w.balance, COALESCE(SUM(t.amount),0) AS ledger FROM wallets w
       LEFT JOIN wallet_transactions t ON t.walletId = w.id GROUP BY w.id HAVING w.balance <> ledger`,
    );
    return {
      totalIn,
      heldInEscrow: held,
      paidOut: out,
      escrowBalance: escrow.balance,
      moneyConserved: totalIn === held + out,
      escrowMatchesHeld: escrow.balance === held,
      walletsMatchLedger: mismatched.length === 0,
      ok: totalIn === held + out && escrow.balance === held && mismatched.length === 0,
    };
  }

  async balances() {
    const rows = await this.wallets.find({ where: { code: In([ESCROW_WALLET, PLATFORM_WALLET]) } });
    return Object.fromEntries(rows.map((w) => [w.code, w.balance]));
  }

  withdrawalRepo(manager: EntityManager) {
    return manager.getRepository(Withdrawal);
  }

  paymentRepo(manager: EntityManager) {
    return manager.getRepository(Payment);
  }
}
