import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useRealtime } from '../../context/RealtimeContext';
import { ROLE } from '../../utils/labels';
import { Logo } from '../Logo';
import { Avatar, cx } from '../ui';
import { NAV } from './navigation';
import { NotificationBell } from '../NotificationBell';

/** Khung sau đăng nhập: thanh bên theo vai trò + nội dung */
export function AppLayout() {
  const { user, logout } = useAuth();
  const { counts } = useRealtime();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const items = NAV[user?.role] || [];

  const doLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <nav className="flex flex-col gap-0.5 p-3" aria-label="Menu chính">
      {items.map((it) => {
        const Icon = it.icon;
        const n = it.badge ? counts[it.badge] : 0;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-[15px] transition-colors',
                isActive ? 'bg-violet-tint font-semibold text-violet' : 'text-ink-soft hover:bg-wash hover:text-ink',
              )
            }
          >
            <Icon className="size-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{it.label}</span>
            {n > 0 && <span className="tabular rounded-full bg-redpen px-1.5 text-xs font-semibold text-white">{n > 99 ? '99+' : n}</span>}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-wash/60">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-white px-4">
        <button className="rounded p-1.5 text-ink-soft hover:bg-wash lg:hidden" onClick={() => setOpen(true)} aria-label="Mở menu">
          <Menu className="size-5" />
        </button>
        <Logo to="/" />
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar name={user?.fullName} url={user?.avatarUrl} size={32} />
            <div className="leading-tight">
              <div className="text-sm font-medium">{user?.fullName}</div>
              <div className="text-xs text-muted">{ROLE[user?.role]}</div>
            </div>
          </div>
          <button onClick={doLogout} className="ml-1 flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-ink-soft hover:bg-wash hover:text-ink">
            <LogOut className="size-4" /> <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </header>
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-line bg-white lg:block">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-50 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
            <aside className="h-full w-72 overflow-y-auto bg-white" onClick={(e) => e.stopPropagation()}>
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <Logo to="/" />
                <button onClick={() => setOpen(false)} aria-label="Đóng menu" className="rounded p-1.5 hover:bg-wash">
                  <X className="size-5" />
                </button>
              </div>
              {sidebar}
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
