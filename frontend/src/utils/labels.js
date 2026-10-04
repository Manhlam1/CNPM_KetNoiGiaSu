// Nhãn tiếng Việt cho các enum từ backend + tông màu hiển thị
export const ROLE = { STUDENT: 'Học viên', TUTOR: 'Gia sư', ADMIN: 'Quản trị viên' };
export const USER_STATUS = {
  PENDING_VERIFICATION: ['Chưa xác thực', 'warn'],
  ACTIVE: ['Đang hoạt động', 'ok'],
  LOCKED: ['Đã khóa', 'bad'],
};
export const TUTOR_STATUS = {
  DRAFT: ['Bản nháp', 'neutral'],
  PENDING: ['Chờ duyệt', 'warn'],
  APPROVED: ['Đã duyệt', 'ok'],
  REJECTED: ['Bị từ chối', 'bad'],
};
export const TEACHING_MODE = { ONLINE: 'Online', OFFLINE: 'Tại nhà', BOTH: 'Online hoặc tại nhà' };

export const BOOKING_STATUS = {
  PENDING_PAYMENT: ['Chờ thanh toán', 'warn'],
  EXPIRED: ['Hết hạn', 'neutral'],
  CONFIRMED: ['Đã thanh toán', 'violet'],
  CANCELLED: ['Đã hủy', 'neutral'],
  AWAITING_CONFIRMATION: ['Chờ xác nhận', 'info'],
  COMPLETED: ['Hoàn tất', 'ok'],
  DISPUTED: ['Tranh chấp', 'bad'],
  REFUNDED: ['Đã hoàn tiền', 'neutral'],
};
export const ESCROW_STATUS = {
  NONE: ['Chưa trả tiền', 'neutral'],
  HELD: ['TutorHub đang giữ', 'violet'],
  RELEASED: ['Đã giải ngân cho gia sư', 'ok'],
  REFUNDED: ['Đã hoàn cho học viên', 'info'],
  FROZEN: ['Đóng băng (tranh chấp)', 'bad'],
};
export const PAYMENT_STATUS = { PENDING: ['Chờ thanh toán', 'warn'], SUCCESS: ['Thành công', 'ok'], FAILED: ['Thất bại', 'bad'] };
export const WALLET_TX = {
  PAYMENT_IN: 'Học viên thanh toán (vào ví giữ hộ)',
  ESCROW_OUT: 'Rời ví giữ hộ',
  RELEASE_TO_TUTOR: 'Nhận tiền buổi học',
  COMMISSION: 'Hoa hồng nền tảng',
  REFUND: 'Hoàn tiền',
  WITHDRAWAL_HOLD: 'Yêu cầu rút tiền',
  WITHDRAWAL_REVERSAL: 'Hoàn lại do từ chối rút',
};
export const WITHDRAWAL_STATUS = { PENDING: ['Chờ duyệt', 'warn'], APPROVED: ['Đã chuyển', 'ok'], REJECTED: ['Từ chối', 'bad'] };
export const DISPUTE_CATEGORY = {
  TUTOR_NO_SHOW: 'Gia sư không đến',
  QUALITY: 'Chất lượng buổi học',
  INAPPROPRIATE: 'Hành vi không phù hợp',
  OTHER: 'Lý do khác',
};
export const DISPUTE_STATUS = {
  OPEN: ['Đang xử lý', 'bad'],
  RESOLVED_RELEASE: ['Đã giải ngân cho gia sư', 'ok'],
  RESOLVED_REFUND: ['Đã hoàn tiền học viên', 'info'],
};
export const WEEKDAYS = ['', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
