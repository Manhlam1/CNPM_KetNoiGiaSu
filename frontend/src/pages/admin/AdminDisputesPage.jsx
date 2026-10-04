import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputeApi } from '../../api/disputeApi';
import { PageHeader, Pagination, Panel, StatusBadge, Table, Tabs } from '../../components/ui';
import { dateTime, money } from '../../utils/format';
import { DISPUTE_CATEGORY, DISPUTE_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function AdminDisputesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('OPEN');
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => disputeApi.adminList({ status, page, size: 15 }), [status, page]);
  return (
    <>
      <PageHeader title="Tranh chấp" description="Học phí của các buổi đang tranh chấp bị đóng băng cho tới khi bạn quyết định." />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={Object.entries(DISPUTE_STATUS).map(([k, [l]]) => ({ value: k, label: l }))}
      />
      <Panel padded={false}>
        <Table
          onRowClick={(d) => navigate(`/app/admin/disputes/${d.id}`)}
          columns={[
            { key: 'created', title: 'Mở lúc', render: (d) => <span className="tabular">{dateTime(d.createdAt)}</span> },
            { key: 'code', title: 'Buổi học', render: (d) => <span className="tabular font-medium">{d.bookingCode}</span> },
            { key: 'cat', title: 'Lý do', render: (d) => DISPUTE_CATEGORY[d.category] },
            { key: 'people', title: 'Học viên / Gia sư', render: (d) => <span className="text-sm">{d.student?.fullName} / {d.tutor?.fullName}</span> },
            { key: 'amount', title: 'Học phí', render: (d) => <span className="tabular">{money(d.amount)}</span> },
            { key: 'resp', title: 'Gia sư phản hồi', render: (d) => (d.hasTutorResponse ? 'Đã phản hồi' : '—') },
            { key: 'status', title: 'Trạng thái', render: (d) => <StatusBadge map={DISPUTE_STATUS} value={d.status} /> },
          ]}
          rows={data?.items || []}
          empty={loading ? 'Đang tải…' : 'Không có khiếu nại'}
        />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>
      </Panel>
    </>
  );
}
