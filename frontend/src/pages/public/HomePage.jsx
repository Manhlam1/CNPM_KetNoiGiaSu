import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { publicApi } from '../../api/accountApi';
import { tutorApi } from '../../api/tutorApi';
import { TutorRow } from '../../components/TutorRow';
import { Button, Field, Select } from '../../components/ui';
import { money } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';
import { useMeta } from '../../utils/useMeta';

const PRICE_CAPS = [150000, 200000, 300000, 500000];
const EXAMPLE_FEE = 300000;

/** Phiếu minh họa đường đi của tiền: đây là thứ đặc trưng nhất của TutorHub */
function EscrowSlip({ commission }) {
  const fee = Math.round((EXAMPLE_FEE * commission) / 100);
  const steps = [
    { title: `Bạn trả ${money(EXAMPLE_FEE)}`, note: 'TutorHub giữ hộ, gia sư chưa nhận' },
    { title: 'Buổi học diễn ra', note: 'Thứ Ba, 19:00–21:00' },
    { title: 'Bạn bấm “Xác nhận hoàn tất”', note: 'Có vấn đề thì mở khiếu nại, tiền được đóng băng' },
    { title: `Gia sư nhận ${money(EXAMPLE_FEE - fee)}`, note: `Đã trừ ${commission}% phí nền tảng (${money(fee)})` },
  ];
  return (
    <div className="relative mx-auto w-full max-w-sm rotate-[1.5deg] rounded-b-[var(--radius-md)] bg-white px-6 pb-6 pt-7 shadow-[0_18px_40px_-18px_rgba(27,35,51,0.35)]">
      <div
        aria-hidden
        className="absolute inset-x-0 -top-2 h-3"
        style={{ background: 'radial-gradient(circle at 8px -2px, transparent 7px, #fff 7.5px) 0 0 / 16px 12px repeat-x' }}
      />
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">Phiếu học phí</span>
        <span className="tabular text-sm text-muted">BK-000128</span>
      </div>
      <ol className="mt-5 flex flex-col">
        {steps.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden className="absolute left-[11px] top-6 h-[calc(100%-18px)] w-px border-l border-dashed border-line" />}
            <span className="tabular grid size-6 shrink-0 place-items-center rounded-full bg-violet-tint text-[13px] font-semibold text-violet">{i + 1}</span>
            <div>
              <div className="font-medium">{s.title}</div>
              <div className="text-sm text-muted">{s.note}</div>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-center justify-between border-t border-dashed border-line pt-4">
        <span className="text-sm text-ink-soft">Trạng thái tiền</span>
        <span className="rotate-[-6deg] rounded border-2 border-redpen px-2 py-0.5 font-[family-name:var(--font-hand)] text-xl text-redpen">Đã giải ngân</span>
      </div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const { data: meta } = useMeta();
  const { data: policies } = useAsync(() => publicApi.policies(), []);
  const { data: featured } = useAsync(() => tutorApi.search({ sort: 'rating', size: 4 }), []);
  const [form, setForm] = useState({ subjectId: '', city: '', maxPrice: '' });
  const commission = policies?.commissionPercent ?? 10;

  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams(Object.entries(form).filter(([, v]) => v));
    navigate(`/tutors?${p.toString()}`);
  };

  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <h1 className="text-[38px] font-bold leading-[1.12] sm:text-[48px]">Tìm gia sư hợp với bạn. Học xong, gia sư mới nhận tiền.</h1>
            <p className="mt-5 max-w-xl text-lg text-ink-soft">
              Lọc theo môn, khu vực và mức giá, xem hồ sơ cùng đánh giá của học viên trước. Học phí được TutorHub giữ cho tới khi bạn xác nhận buổi học đã diễn ra.
            </p>
            <form onSubmit={submit} className="oly-paper mt-8 grid gap-3 rounded-[var(--radius-md)] border border-line p-5 pl-16 sm:grid-cols-3 sm:items-end">
              <Field label="Môn học" htmlFor="h-subject">
                <Select id="h-subject" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                  <option value="">Tất cả</option>
                  {meta?.subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Thành phố" htmlFor="h-city">
                <Select id="h-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
                  <option value="">Tất cả</option>
                  {meta?.cities.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Học phí mỗi giờ" htmlFor="h-price">
                <Select id="h-price" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}>
                  <option value="">Không giới hạn</option>
                  {PRICE_CAPS.map((p) => (
                    <option key={p} value={p}>
                      Tới {money(p)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit" size="md">
                  <Search className="size-4" /> Tìm gia sư
                </Button>
              </div>
            </form>
            {meta && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">Hay được tìm:</span>
                {meta.subjects.filter((s) => ['Toán', 'Tiếng Anh', 'IELTS', 'Vật lý', 'Lập trình Python'].includes(s.name)).map((s) => (
                  <Link key={s.id} to={`/tutors?subjectId=${s.id}`} className="rounded-full border border-line bg-white px-3 py-1 text-ink-soft hover:border-violet hover:text-violet">
                    {s.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <EscrowSlip commission={commission} />
        </div>
      </section>

      {featured?.items?.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="text-2xl font-bold">Gia sư được học viên chấm điểm cao</h2>
            <Link to="/tutors" className="text-violet hover:underline">
              Xem tất cả gia sư
            </Link>
          </div>
          <div className="rounded-[var(--radius-md)] border border-line bg-white">
            {featured.items.map((t) => (
              <TutorRow key={t.id} t={t} />
            ))}
          </div>
        </section>
      )}

      <section id="giu-tien" className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="max-w-2xl text-2xl font-bold">Tiền học phí của bạn luôn ở một trong ba chỗ</h2>
          <p className="mt-2 max-w-2xl text-ink-soft">Bạn xem được trạng thái này trên từng buổi học, từ lúc thanh toán tới lúc gia sư nhận tiền.</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold text-violet">TutorHub đang giữ</h3>
              <p className="mt-1 text-ink-soft">
                Từ lúc bạn thanh toán tới khi buổi học xong. Hủy trước giờ học ít nhất {policies?.fullRefundHours ?? 24} giờ thì được hoàn đủ 100%.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-ok">Đã chuyển cho gia sư</h3>
              <p className="mt-1 text-ink-soft">
                Khi bạn bấm xác nhận hoàn tất, hoặc sau {policies?.autoReleaseHours ?? 48} giờ kể từ khi buổi học kết thúc mà bạn không khiếu nại. Gia sư nhận học phí trừ {commission}% phí nền tảng.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-redpen">Đóng băng hoặc hoàn lại cho bạn</h3>
              <p className="mt-1 text-ink-soft">
                Buổi học có vấn đề, bạn mở khiếu nại trong {policies?.autoReleaseHours ?? 48} giờ. Tiền bị đóng băng, quản trị viên xem tin nhắn và bằng chứng rồi quyết định giải ngân hay hoàn tiền.
              </p>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button to="/tutors" size="lg">
              Tìm gia sư
            </Button>
            <Button to="/register" size="lg" variant="secondary">
              Đăng ký làm gia sư
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
