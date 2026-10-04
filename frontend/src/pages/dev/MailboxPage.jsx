import { RefreshCw } from 'lucide-react';
import { publicApi } from '../../api/accountApi';
import { Button, EmptyState, PageLoader, Alert } from '../../components/ui';
import { dateTime } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

/** Hộp thư demo: hiển thị email (OTP...) khi chạy không có SMTP */
export function MailboxPage() {
  const { data, loading, error, reload } = useAsync(() => publicApi.devMails(), []);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Hộp thư demo</h1>
          <p className="text-ink-soft">Email hệ thống gửi đi khi chạy chế độ demo (không có SMTP). Mới nhất ở trên cùng.</p>
        </div>
        <Button variant="secondary" onClick={() => reload()}>
          <RefreshCw className="size-4" /> Tải lại
        </Button>
      </div>
      {loading && <PageLoader />}
      {error && <Alert tone="bad">{error.message}</Alert>}
      {data && data.length === 0 && <EmptyState title="Chưa có email nào">Đăng ký tài khoản hoặc bấm quên mật khẩu để nhận mã OTP.</EmptyState>}
      <ul className="flex flex-col gap-3">
        {data?.map((m) => {
          const code = m.body.match(/\b\d{6}\b/)?.[0];
          return (
            <li key={m.id} className="rounded-[var(--radius-md)] border border-line bg-white p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold">{m.subject}</span>
                <span className="text-sm text-muted">{dateTime(m.createdAt)}</span>
              </div>
              <div className="text-sm text-ink-soft">Gửi tới {m.to}</div>
              {code && <div className="mt-2 font-[family-name:var(--font-hand)] text-4xl tracking-widest text-redpen">{code}</div>}
              <pre className="mt-2 whitespace-pre-wrap font-sans text-[14px] text-ink-soft">{m.body}</pre>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
