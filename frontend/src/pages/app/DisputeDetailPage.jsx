import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { disputeApi } from '../../api/disputeApi';
import { Alert, Button, Field, PageHeader, PageLoader, Panel, StatusBadge, Textarea, cx } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dateTime, lessonTime, money, time } from '../../utils/format';
import { BOOKING_STATUS, DISPUTE_CATEGORY, DISPUTE_STATUS, ESCROW_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

/** Chi tiết khiếu nại — dùng chung cho học viên, gia sư và quản trị viên (admin có thêm tin nhắn + quyết định) */
export function DisputeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const { data: d, loading, error, setData } = useAsync(() => disputeApi.detail(id), [id]);
  const [response, setResponse] = useState('');
  const [decision, setDecision] = useState('REFUND');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return <PageLoader />;
  if (error) return <Alert tone="bad">{error.message}</Alert>;

  const isAdmin = user.role === 'ADMIN';
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      setData(await fn());
      toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to={isAdmin ? '/app/admin/disputes' : '/app/disputes'} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Khiếu nại
      </Link>
      <PageHeader
        title={`Khiếu nại buổi ${d.bookingCode}`}
        description={`${DISPUTE_CATEGORY[d.category]} · mở lúc ${dateTime(d.createdAt)}`}
        actions={<StatusBadge map={DISPUTE_STATUS} value={d.status} />}
      />
      {d.status !== 'OPEN' && (
        <Alert tone={d.status === 'RESOLVED_REFUND' ? 'info' : 'ok'} className="mb-6">
          Đã xử lý lúc {dateTime(d.resolvedAt)}: {d.status === 'RESOLVED_REFUND' ? 'hoàn học phí cho học viên' : 'chuyển học phí cho gia sư'}. Ghi chú: {d.resolutionNote}
        </Alert>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Panel title={`Học viên ${d.student?.fullName} trình bày`}>
            <p className="whitespace-pre-line text-ink-soft">{d.description}</p>
            {d.evidenceUrls.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {d.evidenceUrls.map((u, i) =>
                  u.endsWith('.pdf') ? (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded border border-line px-3 py-2 text-violet hover:underline">
                      <FileText className="size-4" /> Bằng chứng {i + 1}
                    </a>
                  ) : (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      <img src={u} alt={`Bằng chứng ${i + 1}`} className="size-24 rounded border border-line object-cover" />
                    </a>
                  ),
                )}
              </div>
            )}
          </Panel>

          <Panel title={`Gia sư ${d.tutor?.fullName} phản hồi`}>
            {d.tutorResponse ? (
              <>
                <p className="whitespace-pre-line text-ink-soft">{d.tutorResponse}</p>
                <p className="mt-2 text-sm text-muted">Gửi lúc {dateTime(d.tutorRespondedAt)}</p>
              </>
            ) : d.canRespond ? (
              <div className="flex flex-col gap-3">
                <Field label="Phản hồi của bạn" hint="Quản trị viên sẽ đọc phản hồi này trước khi quyết định" htmlFor="resp">
                  <Textarea id="resp" rows={4} value={response} onChange={(e) => setResponse(e.target.value)} maxLength={3000} />
                </Field>
                <div>
                  <Button loading={busy} disabled={response.trim().length < 10} onClick={() => run(() => disputeApi.respond(d.id, response.trim()), 'Đã gửi phản hồi')}>
                    Gửi phản hồi
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted">Gia sư chưa phản hồi.</p>
            )}
          </Panel>

          {isAdmin && (
            <Panel title="Tin nhắn giữa hai bên" padded={false}>
              {d.conversation?.messages.length ? (
                <ul className="thin-scroll max-h-96 overflow-y-auto px-5 py-4">
                  {d.conversation.messages.map((m) => {
                    const fromStudent = m.senderId === d.student?.id;
                    return (
                      <li key={m.id} className="mb-2 text-[14.5px]">
                        <span className={cx('font-semibold', fromStudent ? 'text-info' : 'text-violet')}>{fromStudent ? d.student?.fullName : d.tutor?.fullName}</span>{' '}
                        <span className="tabular text-xs text-muted">{dateTime(m.createdAt)}</span>
                        <p className="text-ink-soft">{m.content}</p>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-5 py-4 text-muted">Hai bên chưa nhắn tin với nhau trên TutorHub.</p>
              )}
            </Panel>
          )}

          {d.canResolve && (
            <Panel title="Quyết định">
              <div className="flex flex-col gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['REFUND', 'Hoàn tiền cho học viên', `Học viên nhận lại ${money(d.payment?.amount)}`],
                    ['RELEASE', 'Chuyển tiền cho gia sư', 'Gia sư nhận học phí trừ hoa hồng'],
                  ].map(([v, l, s]) => (
                    <label key={v} className={cx('cursor-pointer rounded-[var(--radius-sm)] border p-3', decision === v ? 'border-violet bg-violet-tint' : 'border-line')}>
                      <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} className="sr-only" />
                      <div className={cx('font-semibold', decision === v && 'text-violet')}>{l}</div>
                      <div className="text-sm text-ink-soft">{s}</div>
                    </label>
                  ))}
                </div>
                <Field label="Ghi chú gửi hai bên" htmlFor="note">
                  <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Căn cứ quyết định…" />
                </Field>
                <div>
                  <Button variant={decision === 'REFUND' ? 'danger' : 'ok'} loading={busy} disabled={note.trim().length < 5} onClick={() => run(() => disputeApi.resolve(d.id, decision, note.trim()), 'Đã xử lý khiếu nại')}>
                    {decision === 'REFUND' ? 'Hoàn tiền cho học viên' : 'Chuyển tiền cho gia sư'}
                  </Button>
                </div>
              </div>
            </Panel>
          )}
        </div>

        <Panel title="Buổi học">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[15px]">
            <dt className="text-muted">Mã</dt>
            <dd>
              <Link to={`/app/bookings/${d.booking.id}`} className="text-violet hover:underline">
                {d.booking.code}
              </Link>
            </dd>
            <dt className="text-muted">Thời gian</dt>
            <dd>{lessonTime(d.booking.startAt, d.booking.endAt)}</dd>
            {d.booking.subject && (
              <>
                <dt className="text-muted">Môn</dt>
                <dd>{d.booking.subject}</dd>
              </>
            )}
            <dt className="text-muted">Trạng thái</dt>
            <dd>
              <StatusBadge map={BOOKING_STATUS} value={d.booking.status} />
            </dd>
            <dt className="text-muted">Học phí</dt>
            <dd className="tabular font-semibold">{money(d.booking.price)}</dd>
            {d.payment && (
              <>
                <dt className="text-muted">Tiền</dt>
                <dd>
                  <StatusBadge map={ESCROW_STATUS} value={d.payment.escrowStatus} />
                </dd>
              </>
            )}
            <dt className="text-muted">Gia sư báo đã dạy</dt>
            <dd>{d.booking.tutorMarkedTaughtAt ? `Có, lúc ${time(d.booking.tutorMarkedTaughtAt)}` : 'Không'}</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}
