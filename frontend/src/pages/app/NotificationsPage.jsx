import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CalendarCheck, CreditCard, IdCard, MessageCircle, ShieldAlert, Star, Wallet } from 'lucide-react';
import { notificationApi } from '../../api/chatApi';
import { Button, EmptyState, PageHeader, Pagination, Panel, Tabs, cx } from '../../components/ui';
import { useRealtime } from '../../context/RealtimeContext';
import { useToast } from '../../context/ToastContext';
import { relative } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

const ICON = { BOOKING: CalendarCheck, PAYMENT: CreditCard, WALLET: Wallet, TUTOR_PROFILE: IdCard, MESSAGE: MessageCircle, DISPUTE: ShieldAlert, REVIEW: Star };

export function NotificationsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshCounts } = useRealtime();
  const [tab, setTab] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, reload, setData } = useAsync(() => notificationApi.list({ page, size: 15, ...(tab === 'unread' ? { unreadOnly: true } : {}) }), [tab, page]);

  const open = async (n) => {
    if (!n.readAt) {
      await notificationApi.read(n.id).catch(() => {});
      setData((d) => ({ ...d, items: d.items.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) }));
      refreshCounts();
    }
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    try {
      await notificationApi.readAll();
      refreshCounts();
      reload({ silent: true });
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Thông báo" actions={<Button variant="secondary" onClick={readAll}>Đánh dấu đã đọc tất cả</Button>} />
      <Tabs
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          { value: 'all', label: 'Tất cả' },
          { value: 'unread', label: 'Chưa đọc' },
        ]}
      />
      {data && data.items.length === 0 ? (
        <EmptyState title="Không có thông báo">Thông báo về buổi học, thanh toán và ví sẽ hiện ở đây.</EmptyState>
      ) : (
        <Panel padded={false} className={loading ? 'opacity-60' : ''}>
          <ul>
            {data?.items.map((n) => {
              const Icon = ICON[n.type] || Bell;
              return (
                <li key={n.id}>
                  <button onClick={() => open(n)} className={cx('flex w-full gap-3 border-b border-line px-5 py-4 text-left last:border-0 hover:bg-wash', !n.readAt && 'bg-violet-tint/30')}>
                    <Icon className={cx('mt-0.5 size-5 shrink-0', n.readAt ? 'text-muted' : 'text-violet')} />
                    <div className="min-w-0 flex-1">
                      <div className={cx(n.readAt ? 'font-medium' : 'font-semibold')}>{n.title}</div>
                      {n.body && <p className="mt-0.5 text-[14.5px] text-ink-soft">{n.body}</p>}
                    </div>
                    <span className="shrink-0 text-sm text-muted">{relative(n.createdAt)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
    </>
  );
}
