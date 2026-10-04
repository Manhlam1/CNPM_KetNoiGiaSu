import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MessageCircle, ShieldAlert } from 'lucide-react';
import { bookingApi } from '../../api/bookingApi';
import { chatApi } from '../../api/chatApi';
import { goToPayment } from '../../api/paymentApi';
import { reviewApi } from '../../api/tutorApi';
import { BookingProgress, DateBlock } from '../../components/booking';
import { mmss, useCountdown } from '../../components/Countdown';
import { Alert, Avatar, Button, Field, GradeMark, Modal, PageLoader, Panel, StatusBadge, Textarea, cx } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dateTime, lessonTime, money } from '../../utils/format';
import { BOOKING_STATUS, DISPUTE_CATEGORY, DISPUTE_STATUS, ESCROW_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

/** Tiền của buổi học đang ở đâu */
function MoneyPanel({ b, viewerRole }) {
  const p = b.payment;
  if (!p) {
    return (
      <Panel title="Học phí">
        <div className="tabular text-2xl font-bold">{money(b.price)}</div>
        <p className="mt-1 text-ink-soft">{b.status === 'PENDING_PAYMENT' ? 'Chưa thanh toán.' : 'Không phát sinh thanh toán.'}</p>
      </Panel>
    );
  }
  const net = p.tutorAmount || null;
  return (
    <Panel title="Học phí">
      <div className="flex items-baseline justify-between gap-2">
        <span className="tabular text-2xl font-bold">{money(p.amount)}</span>
        <StatusBadge map={ESCROW_STATUS} value={p.escrowStatus} />
      </div>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1.5 text-[15px]">
        <dt className="text-muted">Thanh toán lúc</dt>
        <dd className="tabular text-right">{dateTime(p.paidAt)}</dd>
        <dt className="text-muted">Cổng thanh toán</dt>
        <dd className="text-right">{p.provider === 'MOCK' ? 'Giả lập (demo)' : 'VNPay'}</dd>
        {p.escrowStatus === 'RELEASED' && (
          <>
            <dt className="text-muted">Phí nền tảng</dt>
            <dd className="tabular text-right">−{money(p.commissionAmount)}</dd>
            <dt className="font-medium">{viewerRole === 'TUTOR' ? 'Bạn nhận' : 'Gia sư nhận'}</dt>
            <dd className="tabular text-right font-semibold text-ok">{money(net)}</dd>
            <dt className="text-muted">Giải ngân lúc</dt>
            <dd className="tabular text-right">{dateTime(p.releasedAt)}</dd>
          </>
        )}
        {p.escrowStatus === 'REFUNDED' && (
          <>
            <dt className="font-medium">Đã hoàn học viên</dt>
            <dd className="tabular text-right font-semibold text-info">{money(p.refundAmount)}</dd>
            <dt className="text-muted">Hoàn lúc</dt>
            <dd className="tabular text-right">{dateTime(p.refundedAt)}</dd>
          </>
        )}
      </dl>
      {(p.escrowStatus === 'HELD' || p.escrowStatus === 'FROZEN') && b.autoReleaseAt && (
        <p className="mt-4 border-t border-line pt-3 text-sm text-ink-soft">
          {p.escrowStatus === 'FROZEN'
            ? 'Tiền đang đóng băng cho tới khi quản trị viên xử lý khiếu nại.'
            : `Nếu học viên không xác nhận hay khiếu nại, tiền tự chuyển cho gia sư lúc ${dateTime(b.autoReleaseAt)}.`}
        </p>
      )}
    </Panel>
  );
}

function ReviewBox({ b, onDone }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  if (b.review) {
    return (
      <Panel title="Đánh giá của bạn">
        <div className="flex items-start gap-4">
          <GradeMark score={b.review.rating} />
          <div>
            <p className="text-ink-soft">{b.review.comment || 'Không có nhận xét.'}</p>
            {b.review.tutorReply && <p className="mt-2 border-l-2 border-violet pl-3 text-sm text-ink-soft">Gia sư phản hồi: {b.review.tutorReply}</p>}
          </div>
        </div>
      </Panel>
    );
  }
  if (!b.actions.canReview) return null;
  const submit = async () => {
    setBusy(true);
    try {
      await reviewApi.create({ bookingId: b.id, rating, ...(comment.trim() ? { comment: comment.trim() } : {}) });
      toast.success('Cảm ơn bạn đã đánh giá');
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel title="Chấm điểm buổi học">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Điểm">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            onClick={() => setRating(n)}
            className={cx(
              'grid size-12 place-items-center rounded-full border-2 font-[family-name:var(--font-hand)] text-2xl transition-colors',
              rating === n ? 'rotate-[-8deg] border-redpen text-redpen' : 'border-line text-muted hover:border-redpen/50',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <Field label="Nhận xét" hint="Học viên sau sẽ đọc được nhận xét này" className="mt-4" htmlFor="rv">
        <Textarea id="rv" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      </Field>
      <Button className="mt-3" onClick={submit} loading={busy}>
        Gửi đánh giá
      </Button>
    </Panel>
  );
}

export function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: b, loading, error, reload } = useAsync(() => bookingApi.detail(id), [id]);
  const holdLeft = useCountdown(b?.status === 'PENDING_PAYMENT' ? b.holdExpiresAt : null, b?.serverNow);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading && !b) return <PageLoader />;
  if (error) return <Alert tone="bad">{error.message}</Alert>;

  const isTutor = user.id === b.tutor?.userId;
  const other = isTutor ? b.student : b.tutor;
  const a = b.actions;

  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      if (msg) toast.success(msg);
      setModal(null);
      await reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    try {
      const c = await chatApi.start(isTutor ? b.student.id : b.tutor.userId);
      navigate(`/app/messages/${c.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <Link to="/app/bookings" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> {isTutor ? 'Buổi dạy' : 'Lịch học'}
      </Link>
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <DateBlock date={b.startAt} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{lessonTime(b.startAt, b.endAt)}</h1>
            <StatusBadge map={BOOKING_STATUS} value={b.status} />
          </div>
          <p className="mt-1 text-ink-soft">
            Mã {b.code}
            {b.subject ? ` · ${b.subject.name}` : ''} · đặt lúc {dateTime(b.createdAt)}
          </p>
        </div>
      </div>

      <Panel className="mb-6">
        <BookingProgress b={b} />
      </Panel>

      {/* Việc cần làm ngay */}
      {a.canPay && (
        <Alert tone="warn" className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="tabular">Khung giờ đang được giữ cho bạn thêm {mmss(holdLeft)}. Thanh toán để chốt buổi học.</span>
          <Button onClick={() => run(() => goToPayment(b.id, navigate))} loading={busy}>
            Thanh toán {money(b.price)}
          </Button>
        </Alert>
      )}
      {a.canConfirm && (
        <Alert tone="info" className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span>Buổi học đã kết thúc. Xác nhận nếu buổi học diễn ra tốt, gia sư sẽ nhận tiền ngay.</span>
          <div className="flex gap-2">
            {a.canDispute && (
              <Button variant="secondary" to={`/app/disputes/new?bookingId=${b.id}`}>
                <ShieldAlert className="size-4" /> Khiếu nại
              </Button>
            )}
            <Button variant="ok" onClick={() => setModal('confirm')}>
              Xác nhận hoàn tất
            </Button>
          </div>
        </Alert>
      )}
      {b.status === 'EXPIRED' && <Alert className="mb-6">Hết thời gian giữ chỗ trước khi thanh toán xong nên buổi học đã hủy tự động.</Alert>}
      {b.status === 'CANCELLED' && (
        <Alert className="mb-6">
          {b.cancelledBy === 'TUTOR' ? 'Gia sư' : 'Học viên'} đã hủy lúc {dateTime(b.cancelledAt)}
          {b.cancelReason ? `: “${b.cancelReason}”` : ''}. {b.refundAmount > 0 ? `Đã hoàn ${money(b.refundAmount)}.` : b.paidAt ? 'Hủy muộn nên không được hoàn tiền.' : ''}
        </Alert>
      )}
      {b.dispute && (
        <Alert tone={b.dispute.status === 'OPEN' ? 'bad' : 'neutral'} className="mb-6">
          Khiếu nại ({DISPUTE_CATEGORY[b.dispute.category]}): <StatusBadge map={DISPUTE_STATUS} value={b.dispute.status} />{' '}
          {b.dispute.resolutionNote && <span>· {b.dispute.resolutionNote}</span>}{' '}
          <Link to={`/app/disputes`} className="font-medium underline">
            Xem khiếu nại
          </Link>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Panel title={isTutor ? 'Học viên' : 'Gia sư'}>
            <div className="flex flex-wrap items-center gap-4">
              <Avatar name={other?.fullName} url={other?.avatarUrl} size={52} />
              <div className="flex-1">
                <div className="font-semibold">{other?.fullName}</div>
                {!isTutor && (
                  <Link to={`/tutors/${b.tutor.profileId}`} className="text-sm text-violet hover:underline">
                    Xem hồ sơ gia sư
                  </Link>
                )}
              </div>
              {a.canChat && user.role !== 'ADMIN' && (
                <Button variant="secondary" onClick={openChat}>
                  <MessageCircle className="size-4" /> Nhắn tin
                </Button>
              )}
            </div>
            {b.note && <p className="mt-4 rounded-[var(--radius-sm)] bg-wash px-3 py-2 text-ink-soft">Lời nhắn: {b.note}</p>}
          </Panel>

          {(a.canCancel || a.canMarkTaught) && (
            <Panel title="Thao tác">
              <div className="flex flex-wrap gap-2">
                {a.canMarkTaught && (
                  <Button onClick={() => run(() => bookingApi.markTaught(b.id), 'Đã ghi nhận bạn dạy xong buổi này')} loading={busy}>
                    Tôi đã dạy xong buổi này
                  </Button>
                )}
                {a.canCancel && (
                  <Button variant="secondary" onClick={() => setModal('cancel')}>
                    Hủy buổi học
                  </Button>
                )}
              </div>
              {a.canCancel && a.cancelRefundPercent !== null && (
                <p className="mt-3 text-sm text-ink-soft">
                  {isTutor
                    ? 'Gia sư hủy: học viên được hoàn 100%.'
                    : a.cancelRefundPercent === 100
                      ? 'Hủy bây giờ bạn được hoàn 100% học phí.'
                      : 'Đã quá hạn hủy miễn phí: hủy bây giờ sẽ không được hoàn tiền.'}
                </p>
              )}
              {b.tutorMarkedTaughtAt && <p className="mt-3 text-sm text-ok">Gia sư đã đánh dấu dạy xong lúc {dateTime(b.tutorMarkedTaughtAt)}.</p>}
            </Panel>
          )}

          {!isTutor && <ReviewBox b={b} onDone={() => reload({ silent: true })} />}
          {isTutor && b.review && (
            <Panel title="Học viên đánh giá">
              <div className="flex items-start gap-4">
                <GradeMark score={b.review.rating} />
                <p className="text-ink-soft">{b.review.comment || 'Không có nhận xét.'}</p>
              </div>
            </Panel>
          )}
        </div>
        <MoneyPanel b={b} viewerRole={isTutor ? 'TUTOR' : user.role} />
      </div>

      <Modal
        open={modal === 'cancel'}
        onClose={() => setModal(null)}
        title={`Hủy buổi học ${b.code}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Giữ buổi học
            </Button>
            <Button variant="danger" loading={busy} onClick={() => run(() => bookingApi.cancel(b.id, reason.trim() || undefined), 'Đã hủy buổi học')}>
              Hủy buổi học
            </Button>
          </>
        }
      >
        <p className="text-ink-soft">
          {b.status === 'PENDING_PAYMENT'
            ? 'Buổi học chưa thanh toán nên không phát sinh tiền. Khung giờ sẽ được mở lại.'
            : a.cancelRefundPercent === 100
              ? `${isTutor ? 'Học viên' : 'Bạn'} được hoàn ${money(b.price)}.`
              : `Bạn sẽ không được hoàn tiền. ${money(b.price)} được chuyển cho gia sư theo chính sách hủy muộn.`}
        </p>
        <Field label="Lý do" hint="Không bắt buộc, bên kia sẽ thấy" className="mt-4" htmlFor="reason">
          <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </Field>
      </Modal>

      <Modal
        open={modal === 'confirm'}
        onClose={() => setModal(null)}
        title="Xác nhận buổi học đã hoàn tất"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Để sau
            </Button>
            <Button variant="ok" loading={busy} onClick={() => run(() => bookingApi.confirm(b.id), 'Đã xác nhận, gia sư đã nhận tiền')}>
              Xác nhận và chuyển tiền
            </Button>
          </>
        }
      >
        <p className="text-ink-soft">
          Sau khi xác nhận, TutorHub chuyển học phí cho gia sư và bạn không mở khiếu nại cho buổi này được nữa. Nếu buổi học có vấn đề, hãy chọn “Khiếu nại” thay vì xác nhận.
        </p>
      </Modal>
    </>
  );
}
