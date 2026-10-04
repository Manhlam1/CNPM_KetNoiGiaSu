import {
  LayoutDashboard, Search, CalendarCheck, MessageCircle, Receipt, ShieldAlert, Bell, UserRound,
  IdCard, CalendarClock, Wallet, Users, BadgeCheck, Landmark, ArrowDownToLine, Settings2, History, FlaskConical,
} from 'lucide-react';

/** Menu theo vai trò */
export const NAV = {
  STUDENT: [
    { to: '/app', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/tutors', label: 'Tìm gia sư', icon: Search },
    { to: '/app/bookings', label: 'Lịch học', icon: CalendarCheck },
    { to: '/app/messages', label: 'Tin nhắn', icon: MessageCircle, badge: 'messages' },
    { to: '/app/payments', label: 'Thanh toán và hoàn tiền', icon: Receipt },
    { to: '/app/disputes', label: 'Khiếu nại', icon: ShieldAlert },
    { to: '/app/notifications', label: 'Thông báo', icon: Bell, badge: 'notifications' },
    { to: '/app/profile', label: 'Tài khoản', icon: UserRound },
  ],
  TUTOR: [
    { to: '/app', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/app/tutor/profile', label: 'Hồ sơ gia sư', icon: IdCard },
    { to: '/app/tutor/schedule', label: 'Lịch trống', icon: CalendarClock },
    { to: '/app/bookings', label: 'Buổi dạy', icon: CalendarCheck },
    { to: '/app/messages', label: 'Tin nhắn', icon: MessageCircle, badge: 'messages' },
    { to: '/app/wallet', label: 'Ví', icon: Wallet },
    { to: '/app/disputes', label: 'Khiếu nại', icon: ShieldAlert },
    { to: '/app/notifications', label: 'Thông báo', icon: Bell, badge: 'notifications' },
    { to: '/app/profile', label: 'Tài khoản', icon: UserRound },
  ],
  ADMIN: [
    { to: '/app', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    { to: '/app/admin/tutors', label: 'Duyệt gia sư', icon: BadgeCheck },
    { to: '/app/admin/users', label: 'Người dùng', icon: Users },
    { to: '/app/admin/bookings', label: 'Buổi học', icon: CalendarCheck },
    { to: '/app/admin/finance', label: 'Dòng tiền', icon: Landmark },
    { to: '/app/admin/withdrawals', label: 'Rút tiền', icon: ArrowDownToLine },
    { to: '/app/admin/disputes', label: 'Tranh chấp', icon: ShieldAlert },
    { to: '/app/admin/configs', label: 'Cấu hình', icon: Settings2 },
    { to: '/app/admin/audit-logs', label: 'Nhật ký', icon: History },
    { to: '/app/admin/demo', label: 'Công cụ demo', icon: FlaskConical },
    { to: '/app/notifications', label: 'Thông báo', icon: Bell, badge: 'notifications' },
    { to: '/app/profile', label: 'Tài khoản', icon: UserRound },
  ],
};
