import { Link } from 'react-router-dom';
import { publicApi } from '../api/accountApi';
import { useAsync } from '../utils/useAsync';

/** Ở chế độ demo (không có SMTP), chỉ đường tới hộp thư dev để lấy mã OTP */
export function DevMailHint() {
  const { data } = useAsync(() => publicApi.devInfo(), []);
  if (!data?.demoMode || data.mailTransport !== 'console') return null;
  return (
    <p className="rounded-[var(--radius-sm)] bg-warn-tint px-3 py-2 text-sm text-warn">
      Đang chạy chế độ demo, email không gửi thật.{' '}
      <Link to="/dev/mailbox" target="_blank" className="font-semibold underline">
        Mở hộp thư demo
      </Link>{' '}
      để xem mã OTP.
    </p>
  );
}
