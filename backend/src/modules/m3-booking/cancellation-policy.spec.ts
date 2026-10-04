import { decideCancellation } from './cancellation-policy';

const H = 3_600_000;
const now = new Date('2026-10-10T00:00:00Z');
const at = (hoursFromNow: number) => new Date(now.getTime() + hoursFromNow * H);

describe('Chính sách hủy buổi học', () => {
  it('gia sư hủy: luôn hoàn 100% cho học viên, không mở lại slot', () => {
    const d = decideCancellation({ actor: 'TUTOR', price: 400_000, startAt: at(2), now, fullRefundHours: 24 });
    expect(d).toEqual({ refundAmount: 400_000, releaseToTutor: false, reopenSlot: false, refundPercent: 100 });
  });

  it('học viên hủy trước >= 24 giờ: hoàn 100%, mở lại slot', () => {
    const d = decideCancellation({ actor: 'STUDENT', price: 400_000, startAt: at(24), now, fullRefundHours: 24 });
    expect(d.refundAmount).toBe(400_000);
    expect(d.reopenSlot).toBe(true);
    expect(d.releaseToTutor).toBe(false);
  });

  it('học viên hủy muộn (< 24 giờ): không hoàn, giải ngân cho gia sư', () => {
    const d = decideCancellation({ actor: 'STUDENT', price: 400_000, startAt: at(23.9), now, fullRefundHours: 24 });
    expect(d).toEqual({ refundAmount: 0, releaseToTutor: true, reopenSlot: false, refundPercent: 0 });
  });

  it('ngưỡng giờ hoàn tiền lấy theo cấu hình', () => {
    expect(decideCancellation({ actor: 'STUDENT', price: 100_000, startAt: at(5), now, fullRefundHours: 4 }).refundPercent).toBe(100);
    expect(decideCancellation({ actor: 'STUDENT', price: 100_000, startAt: at(5), now, fullRefundHours: 6 }).refundPercent).toBe(0);
  });
});
