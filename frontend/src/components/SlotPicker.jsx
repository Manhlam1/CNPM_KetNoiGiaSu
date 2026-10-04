import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { publicApi } from '../api/accountApi';
import { availabilityApi, bookingApi } from '../api/bookingApi';
import { goToPayment } from '../api/paymentApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { lessonTime, money, time, vnDateKey } from '../utils/format';
import { useAsync } from '../utils/useAsync';
import { Alert, Button, Field, Select, Spinner, Textarea, cx } from './ui';

const TZ = 'Asia/Ho_Chi_Minh';
const dayLabel = (key) => {
  const d = new Date(`${key}T12:00:00+07:00`);
  return {
    weekday: new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, weekday: 'short' }).format(d),
    day: new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(d),
  };
};
const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Học viên chọn một khung giờ trống của gia sư rồi giữ chỗ + thanh toán */
export function SlotPicker({ tutor, disabled }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: slots, loading, error } = useAsync(() => availabilityApi.publicSlots(tutor.id), [tutor.id]);
  const { data: policies } = useAsync(() => publicApi.policies(), []);
  const [weekStart, setWeekStart] = useState(null);
  const [selected, setSelected] = useState(null);
  const [subjectId, setSubjectId] = useState(tutor.subjects.length === 1 ? String(tutor.subjects[0].id) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const byDay = useMemo(() => {
    const m = new Map();
    (slots || []).forEach((s) => {
      const k = vnDateKey(s.startAt);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(s);
    });
    return m;
  }, [slots]);

  if (loading) return <Spinner />;
  if (error) return <Alert tone="bad">{error.message}</Alert>;
  if (!slots?.length) return <p className="text-ink-soft">Gia sư chưa mở khung giờ trống trong 4 tuần tới. Bạn có thể nhắn tin để hỏi lịch.</p>;

  const first = weekStart || vnDateKey(slots[0].startAt);
  const days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  const lastKey = vnDateKey(slots[slots.length - 1].startAt);
  const todayKey = vnDateKey(new Date());

  const book = async () => {
    if (!user) return navigate(`/login?next=/tutors/${tutor.id}`);
    setBusy(true);
    try {
      const b = await bookingApi.create({ slotId: selected.id, ...(subjectId ? { subjectId: Number(subjectId) } : {}), ...(note.trim() ? { note: note.trim() } : {}) });
      toast.success(`Đã giữ chỗ ${b.code}. Hoàn tất thanh toán trong ${policies?.holdMinutes ?? 15} phút.`);
      await goToPayment(b.id, navigate);
    } catch (err) {
      toast.error(err.message);
      if (err.errorCode === 'SLOT_TAKEN') setSelected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button variant="secondary" size="sm" disabled={first <= todayKey} onClick={() => setWeekStart(addDays(first, -7))} aria-label="Tuần trước">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm text-ink-soft">
          {dayLabel(days[0]).day} – {dayLabel(days[6]).day}
        </span>
        <Button variant="secondary" size="sm" disabled={addDays(first, 7) > lastKey} onClick={() => setWeekStart(addDays(first, 7))} aria-label="Tuần sau">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {days.map((k) => {
          const list = byDay.get(k) || [];
          const l = dayLabel(k);
          return (
            <div key={k} className={cx('rounded-[var(--radius-sm)] border p-2', list.length ? 'border-line bg-white' : 'border-dashed border-line bg-wash/50')}>
              <div className="mb-1.5 text-center">
                <div className="text-xs capitalize text-muted">{l.weekday}</div>
                <div className="tabular text-sm font-semibold">{l.day}</div>
              </div>
              <div className="flex flex-col gap-1">
                {list.length === 0 && <span className="py-1 text-center text-xs text-muted">Không có</span>}
                {list.map((s) => (
                  <button
                    key={s.id}
                    disabled={disabled}
                    onClick={() => setSelected(s)}
                    aria-pressed={selected?.id === s.id}
                    className={cx(
                      'tabular rounded px-1 py-1.5 text-[13px] font-medium transition-colors',
                      selected?.id === s.id ? 'bg-violet text-white' : 'bg-violet-tint text-violet hover:bg-violet/15',
                      disabled && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    {time(s.startAt)}–{time(s.endAt)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 rounded-[var(--radius-md)] border border-violet/30 bg-violet-tint/40 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-semibold">{lessonTime(selected.startAt, selected.endAt)}</div>
            <div className="tabular text-xl font-bold">{money(selected.price)}</div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[220px_1fr]">
            <Field label="Môn học" htmlFor="sp-subject">
              <Select id="sp-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Chưa chọn</option>
                {tutor.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Lời nhắn cho gia sư" hint="Không bắt buộc" htmlFor="sp-note">
              <Textarea id="sp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ví dụ: em cần ôn chương Đạo hàm" />
            </Field>
          </div>
          {user && user.role !== 'STUDENT' ? (
            <Alert tone="warn" className="mt-3">
              Chỉ tài khoản học viên đặt được buổi học.
            </Alert>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={book} loading={busy} size="lg">
                Giữ chỗ và thanh toán
              </Button>
              <span className="text-sm text-ink-soft">Khung giờ được giữ {policies?.holdMinutes ?? 15} phút trong lúc bạn thanh toán.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
