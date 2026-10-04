import { BookingStatus as S } from '../../common/enums';
import { assertTransition, canTransition, InvalidTransitionError, isTerminal } from './booking-state';

describe('Bảng chuyển trạng thái buổi học', () => {
  it.each([
    [S.PENDING_PAYMENT, S.CONFIRMED],
    [S.PENDING_PAYMENT, S.EXPIRED],
    [S.PENDING_PAYMENT, S.CANCELLED],
    [S.CONFIRMED, S.CANCELLED],
    [S.CONFIRMED, S.AWAITING_CONFIRMATION],
    [S.AWAITING_CONFIRMATION, S.COMPLETED],
    [S.AWAITING_CONFIRMATION, S.DISPUTED],
    [S.DISPUTED, S.COMPLETED],
    [S.DISPUTED, S.REFUNDED],
  ])('cho phép %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    [S.PENDING_PAYMENT, S.COMPLETED], // chưa trả tiền không thể hoàn tất
    [S.CONFIRMED, S.COMPLETED], // phải qua bước chờ xác nhận
    [S.CONFIRMED, S.DISPUTED], // chưa học xong chưa được khiếu nại
    [S.AWAITING_CONFIRMATION, S.CANCELLED], // học xong rồi không hủy được
    [S.COMPLETED, S.REFUNDED],
    [S.EXPIRED, S.CONFIRMED],
    [S.CANCELLED, S.CONFIRMED],
  ])('chặn %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(InvalidTransitionError);
  });

  it('các trạng thái kết thúc không đi tiếp được', () => {
    [S.EXPIRED, S.CANCELLED, S.COMPLETED, S.REFUNDED].forEach((s) => expect(isTerminal(s)).toBe(true));
    [S.PENDING_PAYMENT, S.CONFIRMED, S.AWAITING_CONFIRMATION, S.DISPUTED].forEach((s) => expect(isTerminal(s)).toBe(false));
  });
});
