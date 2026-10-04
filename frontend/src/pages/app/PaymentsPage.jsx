import { useState } from 'react';
import { Link } from 'react-router-dom';
import { paymentApi, walletApi } from '../../api/paymentApi';
import { Alert, PageHeader, Pagination, Panel, Stat, StatusBadge, Table } from '../../components/ui';
import { dateTime, money } from '../../utils/format';
import { ESCROW_STATUS, PAYMENT_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

/** Học viên: lịch sử thanh toán + tiền đang giữ + tiền được hoàn */
export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const summary = useAsync(() => walletApi.me(), []);
  const list = useAsync(() => paymentApi.mine({ page, size: 10 }), [page]);
  const s = summary.data;
  return (
    <>
      <PageHeader title="Thanh toán và hoàn tiền" description="Mỗi khoản thanh toán hiện rõ tiền đang ở đâu: TutorHub đang giữ, đã chuyển cho gia sư hay đã hoàn cho bạn." />
      {summary.error && <Alert tone="bad">{summary.error.message}</Alert>}
      {s && (
        <div className="mb-6 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5">
            <Stat label="Tổng đã thanh toán" value={money(s.totalPaid)} />
          </div>
          <div className="bg-white p-5">
            <Stat label="TutorHub đang giữ" value={money(s.heldInEscrow)} sub="Chưa chuyển cho gia sư" />
          </div>
          <div className="bg-white p-5">
            <Stat label="Đã được hoàn" value={money(s.totalRefunded)} />
          </div>
          <div className="bg-white p-5">
            <Stat label="Số dư ví hoàn tiền" value={money(s.balance)} sub="Bản demo: tiền hoàn được ghi vào ví" />
          </div>
        </div>
      )}
      <Panel padded={false}>
        <Table
          columns={[
            { key: 'paidAt', title: 'Thời điểm', render: (p) => <span className="tabular whitespace-nowrap">{dateTime(p.paidAt || p.createdAt)}</span> },
            {
              key: 'booking',
              title: 'Buổi học',
              render: (p) => (
                <Link to={`/app/bookings/${p.bookingId}`} className="text-violet hover:underline">
                  {p.bookingCode}
                </Link>
              ),
            },
            { key: 'tutorName', title: 'Gia sư' },
            { key: 'amount', title: 'Số tiền', render: (p) => <span className="tabular font-semibold">{money(p.amount)}</span> },
            { key: 'status', title: 'Kết quả', render: (p) => <StatusBadge map={PAYMENT_STATUS} value={p.status} /> },
            { key: 'escrow', title: 'Tiền đang ở', render: (p) => (p.status === 'SUCCESS' ? <StatusBadge map={ESCROW_STATUS} value={p.escrowStatus} /> : '—') },
          ]}
          rows={list.data?.items || []}
          empty="Bạn chưa thanh toán buổi học nào"
        />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={list.data?.totalPages} onChange={setPage} />
        </div>
      </Panel>
    </>
  );
}
