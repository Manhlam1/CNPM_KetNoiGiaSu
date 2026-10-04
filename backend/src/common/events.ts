import { EntityManager } from 'typeorm';

/** Sự kiện nội bộ giữa các module (tránh phụ thuộc vòng M3 <-> M4) */
export const EVENTS = {
  /** M4 phát khi cổng thanh toán báo thành công; M3 lắng nghe để xác nhận buổi học */
  PAYMENT_SUCCEEDED: 'payment.succeeded',
};

/** Chạy CHUNG transaction với bên phát (manager) để đảm bảo toàn vẹn */
export interface PaymentSucceededEvent {
  bookingId: number;
  paymentId: number;
  manager: EntityManager;
}

/** Kết quả listener trả về: buổi học có nhận khoản thanh toán này không */
export interface PaymentSucceededResult {
  accepted: boolean;
  reason?: string;
}
