import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, notFound } from '../../common/app.exception';
import { NotificationType, WalletTxType, WithdrawalStatus } from '../../common/enums';
import { skipTake } from '../../common/pagination';
import { ClockService } from '../m1-account/system-config/clock.service';
import { NotificationsService } from '../m5-communication/notifications.service';
import { Withdrawal } from './entities/withdrawal.entity';
import { WalletService } from './wallet.service';

export const MIN_WITHDRAWAL = 100_000;

/**
 * Rút tiền: gia sư yêu cầu -> trừ ví ngay (WITHDRAWAL_HOLD) -> admin duyệt (chuyển khoản mô phỏng)
 * hoặc từ chối (cộng lại ví, WITHDRAWAL_REVERSAL).
 */
@Injectable()
export class WithdrawalsService {
  constructor(
    @InjectRepository(Withdrawal) private readonly repo: Repository<Withdrawal>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly wallets: WalletService,
    private readonly notifications: NotificationsService,
    private readonly clock: ClockService,
  ) {}

  async request(userId: number, dto: { amount: number; bankName: string; bankAccount: string; accountHolder: string }) {
    if (dto.amount < MIN_WITHDRAWAL) throw badRequest('AMOUNT_TOO_SMALL', `Số tiền rút tối thiểu ${MIN_WITHDRAWAL.toLocaleString('vi-VN')}đ`);
    const w = await this.ds.transaction(async (manager) => {
      const wallet = await this.wallets.userWallet(manager, userId);
      const wd = await manager.save(manager.create(Withdrawal, { userId, ...dto, status: WithdrawalStatus.PENDING }));
      await this.wallets.post(manager, wallet.id, -dto.amount, WalletTxType.WITHDRAWAL_HOLD, `Yêu cầu rút tiền #${wd.id}`, { withdrawalId: wd.id });
      return wd;
    });
    await this.notifications.notifyAdmins({ type: NotificationType.WALLET, title: `Yêu cầu rút ${dto.amount.toLocaleString('vi-VN')}đ chờ duyệt`, link: '/app/admin/withdrawals' });
    return w;
  }

  async mine(userId: number, q: { page?: number; size?: number }) {
    const { page, size, skip, take } = skipTake(q);
    const [items, total] = await this.repo.findAndCount({ where: { userId }, order: { id: 'DESC' }, skip, take });
    return toPage(items, total, page, size);
  }

  async adminList(q: { page?: number; size?: number; status?: WithdrawalStatus }) {
    const { page, size, skip, take } = skipTake(q);
    const [items, total] = await this.repo.findAndCount({
      where: q.status ? { status: q.status } : {},
      relations: { user: true },
      order: { id: 'DESC' },
      skip,
      take,
    });
    return toPage(
      items.map(({ user, ...w }) => ({ ...w, tutorName: user?.fullName, tutorEmail: user?.email })),
      total,
      page,
      size,
    );
  }

  async approve(adminId: number, id: number, note?: string) {
    const wd = await this.ds.transaction(async (manager) => {
      const w = await manager.findOne(Withdrawal, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!w) throw notFound('Không tìm thấy yêu cầu rút tiền');
      if (w.status !== WithdrawalStatus.PENDING) throw badRequest('NOT_PENDING', 'Yêu cầu đã được xử lý');
      w.status = WithdrawalStatus.APPROVED;
      w.reviewedById = adminId;
      w.reviewedAt = this.clock.now();
      w.note = note ?? 'Đã chuyển khoản (mô phỏng)';
      return manager.save(w);
    });
    await this.notifications.notify(
      wd.userId,
      { type: NotificationType.WALLET, title: 'Yêu cầu rút tiền đã được duyệt', body: `${wd.amount.toLocaleString('vi-VN')}đ đã được chuyển tới tài khoản ${wd.bankName} ${wd.bankAccount}.`, link: '/app/wallet' },
      { email: true },
    );
    return wd;
  }

  async reject(adminId: number, id: number, note: string) {
    const wd = await this.ds.transaction(async (manager) => {
      const w = await manager.findOne(Withdrawal, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!w) throw notFound('Không tìm thấy yêu cầu rút tiền');
      if (w.status !== WithdrawalStatus.PENDING) throw badRequest('NOT_PENDING', 'Yêu cầu đã được xử lý');
      const wallet = await this.wallets.userWallet(manager, w.userId);
      await this.wallets.post(manager, wallet.id, w.amount, WalletTxType.WITHDRAWAL_REVERSAL, `Hoàn lại yêu cầu rút tiền #${w.id}`, { withdrawalId: w.id });
      w.status = WithdrawalStatus.REJECTED;
      w.reviewedById = adminId;
      w.reviewedAt = this.clock.now();
      w.note = note;
      return manager.save(w);
    });
    await this.notifications.notify(wd.userId, { type: NotificationType.WALLET, title: 'Yêu cầu rút tiền bị từ chối', body: `Lý do: ${note}. Số tiền đã được cộng lại vào ví.`, link: '/app/wallet' });
    return wd;
  }
}
