import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { paymentApi } from '../../api/paymentApi';
import { mmss, useCountdown } from '../../components/Countdown';
import { Alert, Button, PageLoader } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { lessonTime, money } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

/**
 * Cổng thanh toán GIẢ LẬP (PAYMENT_PROVIDER=mock) để demo không cần tài khoản VNPay/ngrok.
 * Bấm "Thanh toán thành công" = cổng thanh toán báo về kết quả thành công (giống IPN).
 */
export function MockGatewayPage() {
  const [params] = useSearchParams();
  const txnRef = params.get('txnRef');
  const navigate = useNavigate();
  const toast = useToast();
  const { data, loading, error } = useAsync(() => paymentApi.mockInfo(txnRef), [txnRef]);
  const left = useCountdown(data?.holdExpiresAt, data?.serverNow);
  const [busy, setBusy] = useState(null);

  const finish = async (success) => {
    setBusy(success ? 'ok' : 'cancel');
    try {
      const r = await paymentApi.mockComplete(txnRef, success);
      navigate(`/payment/result?bookingId=${r.bookingId}&status=${success ? (r.status === 'REFUNDED' ? 'refunded' : 'success') : 'failed'}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
      setBusy(null);
    }
  };

  if (loading) return <PageLoader />;
  return (
    <div className="min-h-screen bg-[#eef1f5] px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 rounded-[var(--radius-sm)] border border-dashed border-warn/50 bg-warn-tint px-4 py-2 text-center text-sm text-warn">
          Cổng thanh toán giả lập dùng để demo. Không có tiền thật được chuyển.
        </div>
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-line bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-line bg-ink px-5 py-4 text-white">
            <Landmark className="size-6" />
            <div>
              <div className="font-semibold">Cổng thanh toán thử nghiệm</div>
              <div className="text-sm text-white/70">Mã giao dịch {txnRef}</div>
            </div>
          </div>
          {error ? (
            <div className="p-5">
              <Alert tone="bad">{error.message}</Alert>
            </div>
          ) : (
            <div className="p-5">
              <div className="text-sm text-muted">Số tiền thanh toán</div>
              <div className="tabular text-[34px] font-bold">{money(data.amount)}</div>
              <dl className="mt-4 grid grid-cols-[110px_1fr] gap-y-2 text-[15px]">
                <dt className="text-muted">Đơn hàng</dt>
                <dd>Buổi học {data.bookingCode}</dd>
                <dt className="text-muted">Gia sư</dt>
                <dd>{data.tutorName}</dd>
                {data.subject && (
                  <>
                    <dt className="text-muted">Môn</dt>
                    <dd>{data.subject}</dd>
                  </>
                )}
                <dt className="text-muted">Thời gian</dt>
                <dd>{lessonTime(data.startAt, data.endAt)}</dd>
                <dt className="text-muted">Người nhận</dt>
                <dd>TutorHub (giữ hộ tới khi buổi học hoàn tất)</dd>
              </dl>
              {data.status !== 'PENDING' ? (
                <Alert tone="info" className="mt-5">
                  Giao dịch đã được xử lý ({data.status}).
                </Alert>
              ) : (
                <>
                  <p className="tabular mt-5 text-sm text-ink-soft">{left > 0 ? `Chỗ được giữ thêm ${mmss(left)}` : 'Đã hết thời gian giữ chỗ. Nếu vẫn thanh toán, tiền sẽ được hoàn lại.'}</p>
                  <div className="mt-3 flex flex-col gap-2">
                    <Button size="lg" variant="ok" loading={busy === 'ok'} disabled={!!busy} onClick={() => finish(true)}>
                      Thanh toán thành công
                    </Button>
                    <Button size="lg" variant="secondary" loading={busy === 'cancel'} disabled={!!busy} onClick={() => finish(false)}>
                      Hủy giao dịch
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
