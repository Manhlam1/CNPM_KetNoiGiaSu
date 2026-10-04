import { Link } from 'react-router-dom';

export function LogoMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="7" fill="var(--color-violet)" />
      <path d="M9 11h14M16 11v12" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="23.5" cy="22.5" r="3" fill="var(--color-redpen)" />
    </svg>
  );
}

export function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2 text-lg font-bold text-ink" aria-label="TutorHub - trang chủ">
      <LogoMark />
      TutorHub
    </Link>
  );
}
