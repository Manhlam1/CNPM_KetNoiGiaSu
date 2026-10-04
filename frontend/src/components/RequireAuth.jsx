import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui';

/** Bọc route cần đăng nhập; roles = danh sách vai trò được vào */
export function RequireAuth({ roles, children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();
  if (initializing) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/app" replace />;
  return children;
}

/** Trang chỉ dành cho khách (đã đăng nhập thì vào /app) */
export function GuestOnly({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <PageLoader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}
