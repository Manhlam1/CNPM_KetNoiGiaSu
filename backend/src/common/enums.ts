// ============================================================
//  Tất cả enum dùng chung của hệ thống (lưu dạng chuỗi trong DB)
// ============================================================

/** Vai trò người dùng */
export enum Role {
  STUDENT = 'STUDENT',
  TUTOR = 'TUTOR',
  ADMIN = 'ADMIN',
}

/** Trạng thái tài khoản */
export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION', // chưa xác thực email OTP
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED', // admin khóa
}

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
}

/** Trạng thái hồ sơ gia sư (admin duyệt) */
export enum TutorProfileStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TeachingMode {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  BOTH = 'BOTH',
}

export enum AvailabilityRuleType {
  WEEKLY = 'WEEKLY', // lặp theo tuần
  ONE_OFF = 'ONE_OFF', // khung lẻ một ngày
}

export enum SlotStatus {
  AVAILABLE = 'AVAILABLE',
  HELD = 'HELD', // đang giữ cho một booking chờ thanh toán
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
}

/** Trạng thái buổi học — xem sơ đồ trong docs/SDD.md */
export enum BookingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  EXPIRED = 'EXPIRED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  AWAITING_CONFIRMATION = 'AWAITING_CONFIRMATION',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentProvider {
  MOCK = 'MOCK',
  VNPAY = 'VNPAY',
}

/** Kết quả từ cổng thanh toán */
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

/** Trạng thái tiền giữ hộ (escrow) */
export enum EscrowStatus {
  NONE = 'NONE', // chưa trả tiền
  HELD = 'HELD', // hệ thống đang giữ
  RELEASED = 'RELEASED', // đã giải ngân cho gia sư
  REFUNDED = 'REFUNDED', // đã hoàn cho học viên
  FROZEN = 'FROZEN', // đóng băng do tranh chấp
}

export enum WalletType {
  USER = 'USER',
  ESCROW = 'ESCROW', // ví hệ thống chứa tiền đang giữ
  PLATFORM = 'PLATFORM', // ví hệ thống nhận hoa hồng
}

/** Loại dòng sổ cái */
export enum WalletTxType {
  PAYMENT_IN = 'PAYMENT_IN', // tiền học viên trả vào ví escrow
  ESCROW_OUT = 'ESCROW_OUT', // tiền rời ví escrow (giải ngân hoặc hoàn)
  RELEASE_TO_TUTOR = 'RELEASE_TO_TUTOR', // gia sư nhận (đã trừ hoa hồng)
  COMMISSION = 'COMMISSION', // nền tảng nhận hoa hồng
  REFUND = 'REFUND', // học viên nhận tiền hoàn
  WITHDRAWAL_HOLD = 'WITHDRAWAL_HOLD', // trừ ví khi gia sư yêu cầu rút
  WITHDRAWAL_REVERSAL = 'WITHDRAWAL_REVERSAL', // cộng lại khi admin từ chối rút
}

export enum WithdrawalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum DisputeCategory {
  TUTOR_NO_SHOW = 'TUTOR_NO_SHOW', // gia sư không đến
  QUALITY = 'QUALITY', // chất lượng buổi học
  INAPPROPRIATE = 'INAPPROPRIATE', // hành vi/nội dung không phù hợp
  OTHER = 'OTHER',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  RESOLVED_RELEASE = 'RESOLVED_RELEASE', // admin quyết giải ngân cho gia sư
  RESOLVED_REFUND = 'RESOLVED_REFUND', // admin quyết hoàn tiền học viên
}

export enum DisputeDecision {
  RELEASE = 'RELEASE',
  REFUND = 'REFUND',
}

export enum NotificationType {
  ACCOUNT = 'ACCOUNT',
  TUTOR_PROFILE = 'TUTOR_PROFILE',
  BOOKING = 'BOOKING',
  PAYMENT = 'PAYMENT',
  WALLET = 'WALLET',
  REVIEW = 'REVIEW',
  MESSAGE = 'MESSAGE',
  DISPUTE = 'DISPUTE',
  SYSTEM = 'SYSTEM',
}
