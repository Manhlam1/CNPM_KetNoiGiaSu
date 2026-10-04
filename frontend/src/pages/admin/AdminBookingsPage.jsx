import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingApi } from '../../api/bookingApi';
import { Alert, Input, PageHeader, Pagination, Panel, Select, StatusBadge, Table } from '../../components/ui';
import { dateTime, money } from '../../utils/format';
import { BOOKING_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function AdminBookingsPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ status: '', q: '', page: 1 });
  const params = Object.fromEntries(Object.entries({ ...f, size: 15 }).filter(([, v]) => v !== ''));
  const { data, loading, error } = useAsync(() => bookingApi.adminList(params), [JSON.stringify(params)]);
  const { data: counts } = useAsync(() => bookingApi.adminCounts(), []);
  return (
    <>
      <PageHeader title="Buổi học" description="Toàn bộ buổi học trên hệ thống và trạng thái tiền của từng buổi." />
      <Panel padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <Input className="max-w-xs" placeholder="Mã buổi, tên học viên/gia sư" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
          <Select className="w-60" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} aria-label="Trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(BOOKING_STATUS).map(([k, [l]]) => (
              <option key={k} value={k}>
                {l} {counts ? `(${counts[k]})` : ''}
              </option>
            ))}
          </Select>
        </div>
        {error && <Alert tone="bad" className="m-4">{error.message}</Alert>}
        <Table
          onRowClick={(b) => navigate(`/app/bookings/${b.id}`)}
          columns={[
            { key: 'code', title: 'Mã', render: (b) => <span className="tabular font-medium">{b.code}</span> },
            { key: 'time', title: 'Thời gian', render: (b) => <span className="tabular whitespace-nowrap">{dateTime(b.startAt)}</span> },
            { key: 'student', title: 'Học viên', render: (b) => b.student?.fullName },
            { key: 'tutor', title: 'Gia sư', render: (b) => b.tutor?.fullName },
            { key: 'price', title: 'Học phí', render: (b) => <span className="tabular">{money(b.price)}</span> },
            { key: 'status', title: 'Trạng thái', render: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} /> },
          ]}
          rows={data?.items || []}
          empty={loading ? 'Đang tải…' : 'Không có buổi học phù hợp'}
        />
        <div className="px-4 pb-4">
          <Pagination page={f.page} totalPages={data?.totalPages} onChange={(page) => setF({ ...f, page })} />
        </div>
      </Panel>
    </>
  );
}
