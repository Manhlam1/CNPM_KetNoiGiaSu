import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { availabilityApi } from '../../api/bookingApi';
import { Alert, Button, Field, Input, PageHeader, Panel, Select, cx } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { time, vnDateKey } from '../../utils/format';
import { WEEKDAYS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

const TZ = 'Asia/Ho_Chi_Minh';
const addDays = (key, n) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
/** Thứ Hai của tuần chứa ngày key */
const mondayOf = (key) => {
  const dow = new Date(`${key}T00:00:00Z`).getUTCDay() || 7;
  return addDays(key, 1 - dow);
};
const label = (key, opt) => new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, ...opt }).format(new Date(`${key}T12:00:00+07:00`));

const SLOT_STYLE = {
  AVAILABLE: 'border-violet/30 bg-violet-tint text-violet',
  HELD: 'border-warn/40 bg-warn-tint text-warn',
  BOOKED: 'border-ink/20 bg-ink text-white',
};

export function SchedulePage() {
  const toast = useToast();
  const [week, setWeek] = useState(() => mondayOf(vnDateKey(new Date())));
  const [form, setForm] = useState({ type: 'WEEKLY', dayOfWeek: '1', date: '', startTime: '19:00', endTime: '21:00' });
  const [saving, setSaving] = useState(false);
  const rules = useAsync(() => availabilityApi.rules(), []);
  const from = new Date(`${week}T00:00:00+07:00`).toISOString();
  const to = new Date(`${addDays(week, 7)}T00:00:00+07:00`).toISOString();
  const slots = useAsync(() => availabilityApi.mySlots({ from, to }), [week]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const byDay = useMemo(() => {
    const m = new Map(days.map((d) => [d, []]));
    (slots.data || []).forEach((s) => m.get(vnDateKey(s.startAt))?.push(s));
    return m;
  }, [slots.data, week]); // eslint-disable-line react-hooks/exhaustive-deps

  const addRule = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { type: form.type, startTime: form.startTime, endTime: form.endTime };
      if (form.type === 'WEEKLY') body.dayOfWeek = Number(form.dayOfWeek);
      else body.date = form.date;
      await availabilityApi.createRule(body);
      toast.success('Đã mở khung giờ, học viên có thể đặt ngay');
      rules.reload({ silent: true });
      slots.reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeRule = async (r) => {
    try {
      const res = await availabilityApi.deleteRule(r.id);
      toast.success(`Đã xóa lịch, hủy ${res.cancelledSlots} khung giờ còn trống`);
      rules.reload({ silent: true });
      slots.reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelSlot = async (s) => {
    try {
      await availabilityApi.cancelSlot(s.id);
      slots.reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const weekly = (rules.data || []).filter((r) => r.type === 'WEEKLY');
  const oneOff = (rules.data || []).filter((r) => r.type === 'ONE_OFF');

  return (
    <>
      <PageHeader title="Lịch trống" description="Mở khung giờ bạn rảnh. Lịch lặp hằng tuần tự sinh khung giờ cho 4 tuần tới; học viên chọn một khung để đặt." />
      {rules.error && <Alert tone="bad" className="mb-4">{rules.error.message}</Alert>}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-6">
          <Panel title="Thêm khung giờ">
            <form onSubmit={addRule} className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-sm)] bg-wash p-1">
                {[
                  ['WEEKLY', 'Lặp hằng tuần'],
                  ['ONE_OFF', 'Một ngày'],
                ].map(([v, l]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => setForm({ ...form, type: v })}
                    className={cx('rounded px-2 py-1.5 text-sm', form.type === v ? 'bg-white font-semibold text-ink shadow-sm' : 'text-ink-soft')}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {form.type === 'WEEKLY' ? (
                <Field label="Thứ" htmlFor="dow">
                  <Select id="dow" value={form.dayOfWeek} onChange={(e) => setForm({ ...form, dayOfWeek: e.target.value })}>
                    {WEEKDAYS.slice(1).map((d, i) => (
                      <option key={d} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <Field label="Ngày" htmlFor="date">
                  <Input id="date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Từ" htmlFor="st">
                  <Input id="st" type="time" step={900} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </Field>
                <Field label="Đến" htmlFor="et">
                  <Input id="et" type="time" step={900} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </Field>
              </div>
              <p className="text-sm text-muted">Mỗi buổi từ 30 phút đến 4 giờ, trong khoảng 06:00–23:00.</p>
              <Button type="submit" loading={saving}>
                <Plus className="size-4" /> Thêm khung giờ
              </Button>
            </form>
          </Panel>

          <Panel title="Lịch đang mở" padded={false}>
            <ul>
              {weekly.length + oneOff.length === 0 && <li className="px-5 py-4 text-sm text-muted">Chưa có lịch nào.</li>}
              {[...weekly, ...oneOff].map((r) => (
                <li key={r.id} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0">
                  <div className="flex-1">
                    <div className="font-medium">{r.type === 'WEEKLY' ? `${WEEKDAYS[r.dayOfWeek]} hằng tuần` : label(r.date, { weekday: 'long', day: '2-digit', month: '2-digit' })}</div>
                    <div className="tabular text-sm text-ink-soft">
                      {r.startTime}–{r.endTime}
                    </div>
                  </div>
                  <button onClick={() => removeRule(r)} className="rounded p-1.5 text-muted hover:bg-wash hover:text-redpen" aria-label="Xóa lịch">
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel
          title={`Tuần ${label(week, { day: '2-digit', month: '2-digit' })} – ${label(addDays(week, 6), { day: '2-digit', month: '2-digit' })}`}
          actions={
            <div className="flex gap-1">
              <Button variant="secondary" size="sm" onClick={() => setWeek(addDays(week, -7))} aria-label="Tuần trước">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setWeek(mondayOf(vnDateKey(new Date())))}>
                Tuần này
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setWeek(addDays(week, 7))} aria-label="Tuần sau">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          }
        >
          <div className="mb-3 flex flex-wrap gap-3 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-violet-tint ring-1 ring-violet/30" /> Trống
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-warn-tint ring-1 ring-warn/40" /> Đang giữ chỗ chờ thanh toán
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-ink" /> Đã có học viên
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d) => (
              <div key={d} className="min-h-32 rounded-[var(--radius-sm)] border border-line p-2">
                <div className="mb-2 text-center">
                  <div className="text-xs capitalize text-muted">{label(d, { weekday: 'short' })}</div>
                  <div className="tabular text-sm font-semibold">{label(d, { day: '2-digit', month: '2-digit' })}</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {byDay.get(d)?.map((s) => (
                    <div key={s.id} className={cx('group relative rounded border px-1.5 py-1 text-[12.5px]', SLOT_STYLE[s.status])}>
                      <div className="tabular font-semibold">
                        {time(s.startAt)}–{time(s.endAt)}
                      </div>
                      {s.booking ? (
                        <Link to={`/app/bookings/${s.booking.id}`} className="block truncate underline-offset-2 hover:underline">
                          {s.booking.studentName}
                        </Link>
                      ) : (
                        s.status === 'AVAILABLE' && (
                          <button
                            onClick={() => cancelSlot(s)}
                            className="absolute right-0.5 top-0.5 rounded p-0.5 opacity-60 hover:bg-white/60 hover:opacity-100"
                            aria-label="Hủy khung giờ này"
                          >
                            <X className="size-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
