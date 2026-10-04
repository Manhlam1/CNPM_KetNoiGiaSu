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

const ADMIN = ['ADMIN'];
const TUTOR = ['TUTOR'];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tutors" element={<TutorSearchPage />} />
        <Route path="/tutors/:id" element={<TutorDetailPage />} />
        <Route path="/dev/mailbox" element={<MailboxPage />} />
      </Route>

      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/verify-otp" element={<GuestOnly><VerifyOtpPage /></GuestOnly>} />
      <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />

      <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
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
