/**
 * Chính sách hủy buổi học đã thanh toán (hàm thuần, có unit test):
 *  - Gia sư hủy: luôn hoàn 100% cho học viên, slot bị hủy.
 *  - Học viên hủy trước giờ học >= fullRefundHours: hoàn 100%, slot mở lại cho người khác.
 *  - Học viên hủy muộn hơn: không hoàn, tiền giải ngân cho gia sư (trừ hoa hồng), slot bị hủy.
 */
export type CancelActor = 'STUDENT' | 'TUTOR';

export interface CancelDecision {
  refundAmount: number; // số tiền hoàn cho học viên
  releaseToTutor: boolean; // true = giải ngân cho gia sư thay vì hoàn
  reopenSlot: boolean; // slot có mở lại cho người khác đặt không
  refundPercent: number;
}

export function decideCancellation(params: { actor: CancelActor; price: number; startAt: Date; now: Date; fullRefundHours: number }): CancelDecision {
  const { actor, price, startAt, now, fullRefundHours } = params;
  if (actor === 'TUTOR') return { refundAmount: price, releaseToTutor: false, reopenSlot: false, refundPercent: 100 };
  const hoursBefore = (startAt.getTime() - now.getTime()) / 3_600_000;
  if (hoursBefore >= fullRefundHours) return { refundAmount: price, releaseToTutor: false, reopenSlot: true, refundPercent: 100 };
  return { refundAmount: 0, releaseToTutor: true, reopenSlot: false, refundPercent: 0 };
}
