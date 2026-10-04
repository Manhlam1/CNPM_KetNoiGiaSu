import { EscrowStatus, PaymentStatus, WalletTxType } from '../../common/enums';
import { EscrowService } from './escrow.service';

/** Unit test EscrowService với WalletService/EntityManager giả lập (không cần DB) */
describe('EscrowService', () => {
  const W = { ESCROW: { id: 1 }, PLATFORM: { id: 2 }, tutor: { id: 10 }, student: { id: 20 } };
  let posts: { walletId: number; amount: number; type: WalletTxType }[];
  let payment: any;
  let manager: any;
  let escrow: EscrowService;

  beforeEach(() => {
    posts = [];
    payment = { id: 5, bookingId: 7, studentId: 3, amount: 400_000, status: PaymentStatus.SUCCESS, escrowStatus: EscrowStatus.HELD };
    const wallets: any = {
      systemWallet: async (_m: any, code: 'ESCROW' | 'PLATFORM') => W[code],
      userWallet: async (_m: any, userId: number) => (userId === 2 ? W.tutor : W.student),
      post: async (_m: any, walletId: number, amount: number, type: WalletTxType) => posts.push({ walletId, amount, type }),
    };
    manager = {
      findOne: jest.fn(async () => payment),
      findOneByOrFail: jest.fn(async () => ({ id: 7, code: 'BK-000007', tutorUserId: 2 })),
      save: jest.fn(async (x: any) => x),
    };
    escrow = new EscrowService(wallets, { commissionPercent: () => 10 } as any, { now: () => new Date('2026-10-10T00:00:00Z') } as any);
  });

  it('release: ví giữ hộ -400k, gia sư +360k, nền tảng +40k (khóa ví ESCROW trước)', async () => {
    const r = await escrow.release(manager, 7);
    expect(r).toEqual({ amount: 400_000, commission: 40_000, tutorNet: 360_000 });
    expect(posts).toEqual([
      { walletId: 1, amount: -400_000, type: WalletTxType.ESCROW_OUT },
      { walletId: 10, amount: 360_000, type: WalletTxType.RELEASE_TO_TUTOR },
      { walletId: 2, amount: 40_000, type: WalletTxType.COMMISSION },
    ]);
    expect(posts.reduce((s, p) => s + p.amount, 0)).toBe(0); // tiền không tự sinh ra hay mất đi
    expect(payment.escrowStatus).toBe(EscrowStatus.RELEASED);
    expect(payment.tutorAmount).toBe(360_000);
  });

  it('refund: ví giữ hộ -400k, học viên +400k', async () => {
    await escrow.refund(manager, 7);
    expect(posts).toEqual([
      { walletId: 1, amount: -400_000, type: WalletTxType.ESCROW_OUT },
      { walletId: 20, amount: 400_000, type: WalletTxType.REFUND },
    ]);
    expect(payment.escrowStatus).toBe(EscrowStatus.REFUNDED);
  });

  it('không giải ngân 2 lần', async () => {
    await escrow.release(manager, 7);
    await expect(escrow.release(manager, 7)).rejects.toThrow('không còn ở trạng thái giữ');
    expect(posts).toHaveLength(3);
  });

  it('tiền đóng băng vẫn giải ngân/hoàn được khi admin xử lý', async () => {
    payment.escrowStatus = EscrowStatus.FROZEN;
    await escrow.refund(manager, 7);
    expect(payment.escrowStatus).toBe(EscrowStatus.REFUNDED);
  });

  it('freeze chỉ áp dụng cho tiền đang giữ', async () => {
    await escrow.freeze(manager, 7);
    expect(payment.escrowStatus).toBe(EscrowStatus.FROZEN);
    await expect(escrow.freeze(manager, 7)).rejects.toThrow();
  });

  it('hold ghi PAYMENT_IN vào ví giữ hộ và không ghi 2 lần', async () => {
    payment.escrowStatus = EscrowStatus.NONE;
    await escrow.hold(manager, payment);
    expect(posts).toEqual([{ walletId: 1, amount: 400_000, type: WalletTxType.PAYMENT_IN }]);
    expect(payment.escrowStatus).toBe(EscrowStatus.HELD);
    await expect(escrow.hold(manager, payment)).rejects.toThrow();
  });

  it('chưa thanh toán thì không giải ngân được', async () => {
    manager.findOne.mockResolvedValueOnce(null);
    await expect(escrow.release(manager, 7)).rejects.toThrow('chưa được thanh toán');
  });
});
