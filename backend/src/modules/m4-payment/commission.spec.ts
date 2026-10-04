import { splitCommission } from './commission';

describe('Tính hoa hồng (số nguyên đồng)', () => {
  it('10% của 300.000đ là 30.000đ, gia sư nhận 270.000đ', () => {
    expect(splitCommission(300_000, 10)).toEqual({ commission: 30_000, tutorNet: 270_000 });
  });

  it('luôn bảo toàn: hoa hồng + gia sư nhận = học phí', () => {
    for (const amount of [1, 999, 123_457, 375_000, 1_999_999]) {
      for (const pct of [0, 7.5, 10, 12.5, 15, 33.33]) {
        const { commission, tutorNet } = splitCommission(amount, pct);
        expect(Number.isInteger(commission)).toBe(true);
        expect(commission + tutorNet).toBe(amount);
        expect(commission).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('phần trăm lẻ làm tròn tới đồng', () => {
    expect(splitCommission(123_457, 12.5).commission).toBe(15_432);
  });

  it('từ chối số tiền không hợp lệ', () => {
    expect(() => splitCommission(-1, 10)).toThrow();
    expect(() => splitCommission(10.5, 10)).toThrow();
  });
});
