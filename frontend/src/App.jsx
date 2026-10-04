import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { GuestOnly, RequireAuth } from './components/RequireAuth';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { MailboxPage } from './pages/dev/MailboxPage';
import { HomePage } from './pages/public/HomePage';
import { DashboardPage } from './pages/app/DashboardPage';
import { ProfilePage } from './pages/app/ProfilePage';
import { UsersPage } from './pages/admin/UsersPage';
import { ConfigsPage } from './pages/admin/ConfigsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { TutorApplicationsPage } from './pages/admin/TutorApplicationsPage';
import { TutorSearchPage } from './pages/public/TutorSearchPage';
import { TutorDetailPage } from './pages/public/TutorDetailPage';
import { TutorProfilePage } from './pages/tutor/TutorProfilePage';
import { SchedulePage } from './pages/tutor/SchedulePage';
import { BookingsPage } from './pages/app/BookingsPage';
import { BookingDetailPage } from './pages/app/BookingDetailPage';
import { WalletPage } from './pages/app/WalletPage';
import { PaymentsPage } from './pages/app/PaymentsPage';
import { MockGatewayPage } from './pages/payment/MockGatewayPage';
import { PaymentResultPage } from './pages/payment/PaymentResultPage';
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage';
import { FinancePage } from './pages/admin/FinancePage';
import { WithdrawalsPage } from './pages/admin/WithdrawalsPage';
import { DemoToolsPage } from './pages/admin/DemoToolsPage';
import { MessagesPage } from './pages/app/MessagesPage';
import { NotificationsPage } from './pages/app/NotificationsPage';
import { DisputesPage } from './pages/app/DisputesPage';
import { DisputeNewPage } from './pages/app/DisputeNewPage';
import { DisputeDetailPage } from './pages/app/DisputeDetailPage';
import { AdminDisputesPage } from './pages/admin/AdminDisputesPage';

const ADMIN = ['ADMIN'];
const TUTOR = ['TUTOR'];
const STUDENT = ['STUDENT'];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tutors" element={<TutorSearchPage />} />
        <Route path="/tutors/:id" element={<TutorDetailPage />} />
        <Route path="/dev/mailbox" element={<MailboxPage />} />
        <Route path="/payment/result" element={<PaymentResultPage />} />
      </Route>
      <Route path="/payment/mock" element={<RequireAuth roles={STUDENT}><MockGatewayPage /></RequireAuth>} />

      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/verify-otp" element={<GuestOnly><VerifyOtpPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />

      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="messages" element={<RequireAuth roles={['STUDENT', 'TUTOR']}><MessagesPage /></RequireAuth>} />
        <Route path="messages/:id" element={<RequireAuth roles={['STUDENT', 'TUTOR']}><MessagesPage /></RequireAuth>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="disputes" element={<RequireAuth roles={['STUDENT', 'TUTOR']}><DisputesPage /></RequireAuth>} />
        <Route path="disputes/new" element={<RequireAuth roles={STUDENT}><DisputeNewPage /></RequireAuth>} />
        <Route path="disputes/:id" element={<DisputeDetailPage />} />
        <Route path="admin/disputes" element={<RequireAuth roles={ADMIN}><AdminDisputesPage /></RequireAuth>} />
        <Route path="admin/disputes/:id" element={<RequireAuth roles={ADMIN}><DisputeDetailPage /></RequireAuth>} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:id" element={<BookingDetailPage />} />
        <Route path="payments" element={<RequireAuth roles={STUDENT}><PaymentsPage /></RequireAuth>} />
        <Route path="wallet" element={<RequireAuth roles={TUTOR}><WalletPage /></RequireAuth>} />
        <Route path="tutor/schedule" element={<RequireAuth roles={TUTOR}><SchedulePage /></RequireAuth>} />
        <Route path="admin/bookings" element={<RequireAuth roles={ADMIN}><AdminBookingsPage /></RequireAuth>} />
        <Route path="admin/finance" element={<RequireAuth roles={ADMIN}><FinancePage /></RequireAuth>} />
        <Route path="admin/withdrawals" element={<RequireAuth roles={ADMIN}><WithdrawalsPage /></RequireAuth>} />
        <Route path="admin/demo" element={<RequireAuth roles={ADMIN}><DemoToolsPage /></RequireAuth>} />
 <Route path="tutor/profile" element={<RequireAuth roles={TUTOR}><TutorProfilePage /></RequireAuth>} />
        <Route path="admin/tutors" element={<RequireAuth roles={ADMIN}><TutorApplicationsPage /></RequireAuth>} />
        <Route path="admin/users" element={<RequireAuth roles={ADMIN}><UsersPage /></RequireAuth>} />
        <Route path="admin/configs" element={<RequireAuth roles={ADMIN}><ConfigsPage /></RequireAuth>} />
        <Route path="admin/audit-logs" element={<RequireAuth roles={ADMIN}><AuditLogsPage /></RequireAuth>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
