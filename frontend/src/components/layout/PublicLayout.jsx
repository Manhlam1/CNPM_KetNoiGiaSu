import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../Logo';
import { Avatar, Button, cx } from '../ui';

const navCls = ({ isActive }) => cx('rounded px-3 py-2 text-[15px]', isActive ? 'font-semibold text-violet' : 'text-ink-soft hover:text-ink');

export function PublicLayout() {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 sm:flex">
            <NavLink to="/tutors" className={navCls}>
              Tìm gia sư
            </NavLink>
            <a href="/#giu-tien" className="rounded px-3 py-2 text-[15px] text-ink-soft hover:text-ink">
              Cách giữ tiền
            </a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link to="/app" className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-wash">
                <Avatar name={user.fullName} url={user.avatarUrl} size={32} />
                <span className="hidden text-[15px] font-medium sm:inline">Trang của tôi</span>
              </Link>
            ) : (
              <>
                <Button variant="ghost" to="/login">
                  Đăng nhập
                </Button>
                <Button to="/register">Đăng ký</Button>
              </>
            )}
          </div>
        </div>
        <nav className="flex gap-1 border-t border-line px-2 sm:hidden">
          <NavLink to="/tutors" className={navCls}>
            Tìm gia sư
          </NavLink>
          <a href="/#giu-tien" className="rounded px-3 py-2 text-[15px] text-ink-soft">
            Cách giữ tiền
          </a>
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
          <span>TutorHub — đồ án môn Nhập môn Công nghệ phần mềm, HUST</span>
          <span>Học phí được TutorHub giữ cho tới khi buổi học hoàn tất.</span>
        </div>
      </footer>
    </div>
  );
}
