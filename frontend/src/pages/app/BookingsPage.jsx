import { useState } from 'react';
import { bookingApi } from '../../api/bookingApi';
import { BookingRow } from '../../components/booking';
import { Alert, Button, EmptyState, PageHeader, Pagination, Panel, Tabs } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAsync } from '../../utils/useAsync';

const TABS = [
  { value: 'upcoming', label: 'Sắp tới', statuses: ['PENDING_PAYMENT', 'CONFIRMED'] },
  { value: 'action', label: 'Cần xử lý', statuses: ['AWAITING_CONFIRMATION', 'DISPUTED'] },
  { value: 'past', label: 'Đã qua', statuses: ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED'] },
];

export function BookingsPage() {
  const { user } = useAuth();
  const isTutor = user.role === 'TUTOR';
  const [scope, setScope] = useState('upcoming');
  const [page, setPage] = useState(1);
  const { data, loading, error } = useAsync(() => bookingApi.mine({ scope, page, size: 10 }), [scope, page]);
  const { data: counts } = useAsync(() => bookingApi.counts(), []);
  const count = (t) => (counts ? t.statuses.reduce((s, k) => s + (counts[k] || 0), 0) : undefined);

  return (
    <>
      <PageHeader
        title={isTutor ? 'Buổi dạy' : 'Lịch học'}
        description={isTutor ? 'Các buổi học viên đã đặt với bạn. Học phí được TutorHub giữ cho tới khi học viên xác nhận.' : 'Các buổi bạn đã đặt, từ lúc giữ chỗ tới khi hoàn tất.'}
        actions={!isTutor && <Button to="/tutors">Đặt buổi mới</Button>}
      />
      <Tabs
        tabs={TABS.map((t) => ({ value: t.value, label: t.label, count: count(t) }))}
        value={scope}
        onChange={(v) => {
          setScope(v);
          setPage(1);
        }}
      />
      {error && <Alert tone="bad">{error.message}</Alert>}
      {data && data.items.length === 0 ? (
        <EmptyState title={scope === 'action' ? 'Không có việc cần xử lý' : 'Chưa có buổi học nào'}>
          {isTutor ? 'Mở thêm khung giờ trống để học viên đặt lịch.' : 'Tìm gia sư phù hợp rồi chọn một khung giờ trống.'}
        </EmptyState>
      ) : (
        <Panel padded={false} className={loading ? 'opacity-60' : ''}>
          {data?.items.map((b) => (
            <BookingRow key={b.id} b={b} viewerRole={user.role} />
          ))}
        </Panel>
      )}
      <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
    </>
  );
}
