// Các mảnh giao diện dùng chung cho buổi học
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Avatar, StatusBadge, cx } from './ui';
import { BOOKING_STATUS } from '../utils/labels';
import { money, time } from '../utils/format';

const TZ = 'Asia/Ho_Chi_Minh';
const part = (d, opt) => new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opt }).format(new Date(d));

/** Khối ngày kiểu tờ lịch: thứ / ngày / tháng */
export function DateBlock({ date, dim }) {
  return (
    <div className={cx('flex w-14 shrink-0 flex-col items-center overflow-hidden rounded-[var(--radius-sm)] border text-center', dim ? 'border-line opacity-60' : 'border-violet/30')}>
      <div className={cx('w-full py-0.5 text-[11px] font-semibold', dim ? 'bg-wash text-muted' : 'bg-violet text-white')}>{part(date, { weekday: 'short' })}</div>
      <div className="tabular pt-1 text-xl font-bold leading-none">{part(date, { day: '2-digit' })}</div>
      <div className="pb-1 text-[11px] text-muted">th {part(date, { month: 'numeric' })}</div>
    </div>
  );
}

/** Một dòng buổi học trong danh sách */
export function BookingRow({ b, viewerRole }) {
  const other = viewerRole === 'TUTOR' ? b.student : b.tutor;
  const dim = ['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(b.status);
  return (
    <Link to={`/app/bookings/${b.id}`} className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-wash">
      <DateBlock date={b.startAt} dim={dim} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            {time(b.startAt)}–{time(b.endAt)}
          </span>
          {b.subject && <span className="text-ink-soft">· {b.subject.name}</span>}
          <span className="tabular text-sm text-muted">{b.code}</span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-ink-soft">
          <Avatar name={other?.fullName} url={other?.avatarUrl} size={22} />
          <span className="truncate">{viewerRole === 'TUTOR' ? `Học viên ${other?.fullName}` : `Gia sư ${other?.fullName}`}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <StatusBadge map={BOOKING_STATUS} value={b.status} />
        <span className="tabular text-sm font-semibold">{money(b.price)}</span>
      </div>
    </Link>
  );
}

/**
 * Tiến trình buổi học: Giữ chỗ -> Thanh toán -> Học -> Xác nhận -> Gia sư nhận tiền.
 * Các nhánh rẽ (hủy, hết hạn, tranh chấp, hoàn tiền) hiện thành dòng ghi chú bên dưới.
 */
export function BookingProgress({ b }) {
  const steps = [
    { key: 'hold', label: 'Giữ chỗ' },
    { key: 'paid', label: 'Đã thanh toán' },
    { key: 'lesson', label: 'Buổi học diễn ra' },
    { key: 'confirm', label: 'Xác nhận' },
    { key: 'released', label: 'Gia sư nhận tiền' },
  ];
  const reached = {
    PENDING_PAYMENT: 1,
    CONFIRMED: 2,
    AWAITING_CONFIRMATION: 3,
    DISPUTED: 3,
    COMPLETED: 5,
    EXPIRED: 1,
    CANCELLED: b.paidAt ? 2 : 1,
    REFUNDED: 3,
  }[b.status];
  const broken = ['EXPIRED', 'CANCELLED', 'REFUNDED', 'DISPUTED'].includes(b.status);
  return (
    <ol className="flex items-start" aria-label="Tiến trình buổi học">
      {steps.map((s, i) => {
        const done = i < reached;
        const isLast = i === steps.length - 1;
        return (
          <li key={s.key} className="relative flex flex-1 flex-col items-center text-center">
            {!isLast && <span aria-hidden className={cx('absolute left-1/2 top-3 h-0.5 w-full', i < reached - 1 ? 'bg-violet' : 'bg-line')} />}
            <span
              className={cx(
                'relative z-10 grid size-6 place-items-center rounded-full border-2 text-xs',
                done ? 'border-violet bg-violet text-white' : 'border-line bg-white text-muted',
                broken && i === reached - 1 && 'border-redpen bg-redpen',
              )}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className={cx('mt-1.5 px-1 text-xs sm:text-[13px]', done ? 'font-medium text-ink' : 'text-muted')}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
