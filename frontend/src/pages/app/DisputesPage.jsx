import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputeApi } from '../../api/disputeApi';
import { EmptyState, PageHeader, Pagination, Panel, StatusBadge, Table } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { date, money } from '../../utils/format';
import { DISPUTE_CATEGORY, DISPUTE_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

/** Danh sách khiếu nại của học viên / khiếu nại về buổi dạy của gia sư */
export function DisputesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, loading } = useAsync(() => disputeApi.mine({ page, size: 10 }), [page]);
  const isTutor = user.role === 'TUTOR';
  return (
    <>
      <PageHeader
        title="Khiếu nại"
        description={isTutor ? 'Khiếu nại của học viên về buổi dạy của bạn. Gửi phản hồi để quản trị viên có đủ thông tin.' : 'Mở khiếu nại từ trang buổi học trong thời hạn sau giờ học. Học phí được đóng băng cho tới khi xử lý xong.'}
      />
      {data && data.items.length === 0 ? (
        <EmptyState title="Không có khiếu nại nào">{isTutor ? 'Mọi buổi dạy đều suôn sẻ.' : 'Nếu buổi học có vấn đề, mở trang buổi học và chọn “Khiếu nại”.'}</EmptyState>
      ) : (
        <Panel padded={false}>
          <Table
            onRowClick={(d) => navigate(`/app/disputes/${d.id}`)}
            columns={[
              { key: 'code', title: 'Buổi học', render: (d) => <span className="tabular font-medium">{d.bookingCode}</span> },
              { key: 'cat', title: 'Lý do', render: (d) => DISPUTE_CATEGORY[d.category] },
              { key: 'other', title: isTutor ? 'Học viên' : 'Gia sư', render: (d) => (isTutor ? d.student?.fullName : d.tutor?.fullName) },
              { key: 'amount', title: 'Học phí', render: (d) => <span className="tabular">{money(d.amount)}</span> },
              { key: 'created', title: 'Ngày mở', render: (d) => date(d.createdAt) },
              { key: 'status', title: 'Trạng thái', render: (d) => <StatusBadge map={DISPUTE_STATUS} value={d.status} /> },
            ]}
            rows={data?.items || []}
            empty={loading ? 'Đang tải…' : ''}
          />
        </Panel>
      )}
      <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
    </>
  );
}
