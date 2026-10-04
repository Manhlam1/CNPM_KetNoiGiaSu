import { WalletTxType } from '../../common/enums';
import { WalletService } from './wallet.service';

/** Unit test WalletService.post với EntityManager giả lập */
describe('WalletService.post', () => {
  let wallet: any;
  let saved: any[];
  let manager: any;
  const svc = new WalletService({} as any, {} as any, {} as any);

  beforeEach(() => {
    wallet = { id: 1, balance: 100_000 };
    saved = [];
    manager = {
      findOne: jest.fn(async () => wallet),
      save: jest.fn(async (x: any) => {
        saved.push({ ...x });
        return x;
      }),
      create: (_cls: any, data: any) => ({ ...data }),
    };
  });

  it('cộng tiền và ghi sổ cái với số dư sau giao dịch', async () => {
    const tx = await svc.post(manager, 1, 50_000, WalletTxType.RELEASE_TO_TUTOR, 'Nhận tiền', { bookingId: 9 });
    expect(wallet.balance).toBe(150_000);
    expect(tx).toMatchObject({ walletId: 1, amount: 50_000, balanceAfter: 150_000, bookingId: 9, type: WalletTxType.RELEASE_TO_TUTOR });
    // Khóa dòng ví trước khi đọc số dư
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
  });

  it('không cho số dư âm', async () => {
    await expect(svc.post(manager, 1, -150_000, WalletTxType.WITHDRAWAL_HOLD, 'Rút')).rejects.toThrow('Số dư ví không đủ');
    expect(wallet.balance).toBe(100_000);
    expect(saved).toHaveLength(0);
  });

  it('bỏ qua bút toán 0đ', async () => {
    expect(await svc.post(manager, 1, 0, WalletTxType.COMMISSION, 'Không có gì')).toBeNull();
    expect(manager.findOne).not.toHaveBeenCalled();
  });
});
