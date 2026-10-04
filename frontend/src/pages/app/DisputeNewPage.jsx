import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { bookingApi } from '../../api/bookingApi';
import { disputeApi } from '../../api/disputeApi';
import { Alert, Button, Field, PageHeader, PageLoader, Panel, Textarea, cx } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { dateTime, lessonTime, money } from '../../utils/format';
import { DISPUTE_CATEGORY } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function DisputeNewPage() {
  const [params] = useSearchParams();
  const bookingId = Number(params.get('bookingId'));
  const navigate = useNavigate();
  const toast = useToast();
  const { data: b, loading, error } = useAsync(() => bookingApi.detail(bookingId), [bookingId]);
  const [form, setForm] = useState({ category: 'TUTOR_NO_SHOW', description: '', files: [] });
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="bad">{error.message}</Alert>;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await disputeApi.open({ bookingId, ...form });
      toast.success('Đã gửi khiếu nại, học phí được đóng băng');
      navigate(`/app/disputes/${d.id}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={`Khiếu nại buổi học ${b.code}`} description={`${lessonTime(b.startAt, b.endAt)} · gia sư ${b.tutor?.fullName} · ${money(b.price)}`} />
      {!b.actions.canDispute ? (
        <Alert tone="warn">Buổi học này không mở khiếu nại được (chưa kết thúc, đã xác nhận hoặc đã quá hạn).</Alert>
      ) : (
        <Panel>
          <form onSubmit={submit} className="flex max-w-2xl flex-col gap-5">
            <Alert tone="info">
              Hạn mở khiếu nại tới {dateTime(b.autoReleaseAt)}. Sau khi gửi, học phí {money(b.price)} bị đóng băng; quản trị viên xem tin nhắn giữa hai bên, bằng chứng và phản hồi của gia sư rồi quyết định hoàn tiền hay chuyển cho gia sư.
            </Alert>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-soft">Vấn đề gặp phải</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(DISPUTE_CATEGORY).map(([k, l]) => (
                  <label key={k} className={cx('cursor-pointer rounded-[var(--radius-sm)] border px-3 py-2.5', form.category === k ? 'border-violet bg-violet-tint font-medium text-violet' : 'border-line bg-white')}>
                    <input type="radio" name="category" value={k} checked={form.category === k} onChange={() => setForm({ ...form, category: k })} className="sr-only" />
                    {l}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Mô tả chi tiết" hint={`${form.description.length}/3000, tối thiểu 20 ký tự`} htmlFor="desc">
              <Textarea id="desc" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={3000} placeholder="Chuyện gì đã xảy ra, vào lúc nào, bạn đã liên hệ gia sư chưa…" />
            </Field>
            <Field label="Bằng chứng" hint="Tối đa 3 ảnh hoặc PDF, mỗi file 5MB (ảnh chụp tin nhắn, màn hình phòng học…)" htmlFor="files">
              <input
                id="files"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={(e) => setForm({ ...form, files: Array.from(e.target.files || []).slice(0, 3) })}
                className="text-sm file:mr-3 file:rounded file:border file:border-line file:bg-white file:px-3 file:py-1.5"
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="danger" loading={busy} disabled={form.description.trim().length < 20}>
                Gửi khiếu nại
              </Button>
              <Button variant="secondary" to={`/app/bookings/${bookingId}`}>
                Quay lại
              </Button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );
}
