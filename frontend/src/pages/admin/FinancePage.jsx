import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { adminFinanceApi } from '../../api/paymentApi';
import { Alert, Input, PageHeader, Pagination, Panel, Select, Stat, StatusBadge, Table } from '../../components/ui';
import { dateTime, money } from '../../utils/format';
import { ESCROW_STATUS, PAYMENT_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

/** Dòng tiền: ví giữ hộ, ví hoa hồng, kiểm tra bất biến, danh sách thanh toán */
export function FinancePage() {
  const [f, setF] = useState({ status: '', escrowStatus: '', q: '', page: 1 });
  const params = Object.fromEntries(Object.entries({ ...f, size: 15 }).filter(([, v]) => v !== ''));
  const summary = useAsync(() => adminFinanceApi.summary(), []);
  const list = useAsync(() => adminFinanceApi.payments(params), [JSON.stringify(params)]);
  const inv = summary.data?.invariants;

  return (
    <>
      <PageHeader title="Dòng tiền" description="Tiền học viên trả vào ví giữ hộ, rồi ra gia sư (trừ hoa hồng) hoặc hoàn lại học viên." />
      {summary.error && <Alert tone="bad">{summary.error.message}</Alert>}
      {inv && (
        <>
          <div className="mb-4 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white p-5">
              <Stat label="Tổng học viên đã trả" value={money(inv.totalIn)} />
            </div>
            <div className="bg-white p-5">
              <Stat label="Ví giữ hộ (escrow)" value={money(summary.data.balances.ESCROW)} sub="Chờ buổi học hoàn tất" />
            </div>
            <div className="bg-white p-5">
              <Stat label="Hoa hồng nền tảng" value={money(summary.data.balances.PLATFORM)} />
            </div>
            <div className="bg-white p-5">
              <Stat label="Đã chi ra" value={money(inv.paidOut)} sub="Cho gia sư, hoa hồng và hoàn tiền" />
            </div>
          </div>
          <Alert tone={inv.ok ? 'ok' : 'bad'} className="mb-6 flex items-start gap-2">
            {inv.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
            <span>
              {inv.ok
                ? `Sổ sách khớp: ${money(inv.totalIn)} đã thu = ${money(inv.heldInEscrow)} đang giữ + ${money(inv.paidOut)} đã chi ra; số dư từng ví khớp sổ cái.`
                : `Sổ sách KHÔNG khớp. Bảo toàn tiền: ${inv.moneyConserved ? 'đúng' : 'sai'}, ví giữ hộ khớp: ${inv.escrowMatchesHeld ? 'đúng' : 'sai'}, ví khớp sổ cái: ${inv.walletsMatchLedger ? 'đúng' : 'sai'}.`}
            </span>
          </Alert>
        </>
      )}
      <Panel padded={false} title="Các khoản thanh toán">
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <Input className="max-w-xs" placeholder="Mã giao dịch hoặc mã buổi" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value, page: 1 })} />
          <Select className="w-48" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value, page: 1 })} aria-label="Kết quả">
            <option value="">Mọi kết quả</option>
            {Object.entries(PAYMENT_STATUS).map(([k, [l]]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
          <Select className="w-56" value={f.escrowStatus} onChange={(e) => setF({ ...f, escrowStatus: e.target.value, page: 1 })} aria-label="Trạng thái tiền">
            <option value="">Mọi trạng thái tiền</option>
            {Object.entries(ESCROW_STATUS).map(([k, [l]]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <Table
          columns={[
            { key: 'createdAt', title: 'Tạo lúc', render: (p) => <span className="tabular whitespace-nowrap">{dateTime(p.createdAt)}</span> },
            { key: 'txnRef', title: 'Mã giao dịch', render: (p) => <span className="tabular text-sm">{p.txnRef}</span> },
            {
              key: 'booking',
              title: 'Buổi học',
              render: (p) => (
                <Link className="text-violet hover:underline" to={`/app/bookings/${p.bookingId}`}>
                  {p.bookingCode}
                </Link>
              ),
            },
            { key: 'people', title: 'Học viên → Gia sư', render: (p) => <span className="text-sm">{p.studentName} → {p.tutorName}</span> },
            { key: 'amount', title: 'Số tiền', render: (p) => <span className="tabular font-semibold">{money(p.amount)}</span> },
            { key: 'commission', title: 'Hoa hồng', render: (p) => <span className="tabular">{p.commissionAmount ? money(p.commissionAmount) : '—'}</span> },
            { key: 'status', title: 'Kết quả', render: (p) => <StatusBadge map={PAYMENT_STATUS} value={p.status} /> },
            { key: 'escrow', title: 'Tiền', render: (p) => <StatusBadge map={ESCROW_STATUS} value={p.escrowStatus} /> },
          ]}
          rows={list.data?.items || []}
          empty={list.loading ? 'Đang tải…' : 'Chưa có thanh toán'}
        />
        <div className="px-4 pb-4">
          <Pagination page={f.page} totalPages={list.data?.totalPages} onChange={(page) => setF({ ...f, page })} />
        </div>
      </Panel>
    </>
  );
}
