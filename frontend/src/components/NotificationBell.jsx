import { Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRealtime } from '../context/RealtimeContext';

export function NotificationBell() {
  const { counts } = useRealtime();
  const n = counts.notifications;
  return (
    <Link to="/app/notifications" className="relative rounded p-2 text-ink-soft hover:bg-wash hover:text-ink" aria-label={`Thông báo${n ? `, ${n} chưa đọc` : ''}`}>
      <Bell className="size-5" />
      {n > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-redpen px-1 text-[11px] font-semibold text-white">
          {n > 99 ? '99+' : n}
        </span>
      )}
    </Link>
  );
}
