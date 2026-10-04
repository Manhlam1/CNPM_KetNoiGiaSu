import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui';

const VIEW = {
  success: {
    icon: CheckCircle2,
    tone: 'text-ok',
    title: 'Thanh toán thành công',
    body: 'TutorHub đang giữ học phí. Sau buổi học, hãy vào trang buổi học bấm “Xác nhận hoàn tất” để gia sư nhận tiền.',
  },
  refunded: {
    icon: RotateCcw,
    tone: 'text-info',
    title: 'Đã hoàn tiền',
    body: 'Khoản thanh toán tới sau khi hết thời gian giữ chỗ nên đã được hoàn vào ví của bạn. Hãy chọn khung giờ khác.',
  },
  failed: { icon: XCircle, tone: 'text-redpen', title: 'Thanh toán chưa thành công', body: 'Bạn chưa bị trừ tiền. Có thể thanh toán lại trong thời gian giữ chỗ.' },
  invalid: { icon: XCircle, tone: 'text-redpen', title: 'Không xác thực được kết quả', body: 'Chữ ký từ cổng thanh toán không hợp lệ. Vui lòng kiểm tra lại trạng thái buổi học.' },
};

export function PaymentResultPage() {
  const [params] = useSearchParams();
  const v = VIEW[params.get('status')] || VIEW.invalid;
  const Icon = v.icon;
  const bookingId = params.get('bookingId');
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Icon className={`mx-auto size-14 ${v.tone}`} />
      <h1 className="mt-4 text-2xl font-bold">{v.title}</h1>
      <p className="mt-2 text-ink-soft">{v.body}</p>
      <div className="mt-6 flex justify-center gap-2">
        {bookingId && <Button to={`/app/bookings/${bookingId}`}>Xem buổi học</Button>}
        <Button variant="secondary" to="/app/bookings">
          Lịch học của tôi
        </Button>
      </div>
    </div>
  );
}
