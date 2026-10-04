import { useState } from 'react';
import { walletApi } from '../../api/paymentApi';
import { Alert, Button, Field, Input, Modal, PageHeader, Pagination, Panel, Stat, StatusBadge, Table, Tabs } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { dateTime, money } from '../../utils/format';
import { WALLET_TX, WITHDRAWAL_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

const MIN = 100000;

/** Ví gia sư: số dư, tiền đang giữ, lịch sử, rút tiền */
export function WalletPage() {
  const toast = useToast();
  const [tab, setTab] = useState('tx');
  const [page, setPage] = useState(1);
  const [wPage, setWPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ amount: '', bankName: '', bankAccount: '', accountHolder: '' });
  const [busy, setBusy] = useState(false);
  const summary = useAsync(() => walletApi.me(), []);
  const txs = useAsync(() => walletApi.transactions({ page, size: 10 }), [page]);
  const wds = useAsync(() => walletApi.myWithdrawals({ page: wPage, size: 10 }), [wPage]);
  const s = summary.data;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await walletApi.withdraw({ ...form, amount: Number(form.amount) });
      toast.success('Đã gửi yêu cầu rút tiền');
      setOpen(false);
      setForm({ amount: '', bankName: '', bankAccount: '', accountHolder: '' });
      summary.reload({ silent: true });
      txs.reload({ silent: true });
      wds.reload({ silent: true });
      setTab('wd');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Ví"
        description="Tiền về ví khi học viên xác nhận buổi học hoặc hết hạn khiếu nại. TutorHub giữ lại phí nền tảng trên mỗi buổi."
        actions={
          <Button onClick={() => setOpen(true)} disabled={!s || s.balance < MIN}>
            Rút tiền
          </Button>
        }
      />
      {summary.error && <Alert tone="bad">{summary.error.message}</Alert>}
      {s && (
        <div className="mb-6 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-5">
            <Stat label="Số dư rút được" value={money(s.balance)} />
          </div>
          <div className="bg-white p-5">
            <Stat label="TutorHub đang giữ" value={money(s.heldInEscrow)} sub="Học phí các buổi chưa hoàn tất" />
          </div>
          <div className="bg-white p-5">
            <Stat label="Tổng đã nhận" value={money(s.totalEarned)} />
          </div>
          <div className="bg-white p-5">
            <Stat label="Đã rút" value={money(s.withdrawn)} sub={s.pendingWithdrawal ? `${money(s.pendingWithdrawal)} đang chờ duyệt` : null} />
          </div>
        </div>
      )}
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'tx', label: 'Lịch sử giao dịch' },
          { value: 'wd', label: 'Yêu cầu rút tiền' },
        ]}
      />
      {tab === 'tx' ? (
        <Panel padded={false}>
          <Table
            columns={[
              { key: 'createdAt', title: 'Thời điểm', render: (t) => <span className="tabular whitespace-nowrap">{dateTime(t.createdAt)}</span> },
              { key: 'type', title: 'Loại', render: (t) => WALLET_TX[t.type] },
              { key: 'description', title: 'Nội dung' },
              { key: 'amount', title: 'Số tiền', className: 'text-right', render: (t) => <span className={`tabular font-semibold ${t.amount > 0 ? 'text-ok' : 'text-redpen'}`}>{t.amount > 0 ? '+' : ''}{money(t.amount)}</span> },
              { key: 'balanceAfter', title: 'Số dư sau', className: 'text-right', render: (t) => <span className="tabular">{money(t.balanceAfter)}</span> },
            ]}
            rows={txs.data?.items || []}
            empty="Chưa có giao dịch nào"
          />
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={txs.data?.totalPages} onChange={setPage} />
          </div>
        </Panel>
      ) : (
        <Panel padded={false}>
          <Table
            columns={[
              { key: 'createdAt', title: 'Ngày yêu cầu', render: (w) => <span className="tabular">{dateTime(w.createdAt)}</span> },
              { key: 'amount', title: 'Số tiền', render: (w) => <span className="tabular font-semibold">{money(w.amount)}</span> },
              { key: 'bank', title: 'Tài khoản nhận', render: (w) => `${w.bankName} · ${w.bankAccount}` },
              { key: 'status', title: 'Trạng thái', render: (w) => <StatusBadge map={WITHDRAWAL_STATUS} value={w.status} /> },
              { key: 'note', title: 'Ghi chú', render: (w) => <span className="text-sm text-ink-soft">{w.note || '—'}</span> },
            ]}
            rows={wds.data?.items || []}
            empty="Chưa có yêu cầu rút tiền"
          />
          <div className="px-4 pb-4">
            <Pagination page={wPage} totalPages={wds.data?.totalPages} onChange={setWPage} />
          </div>
        </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Rút tiền về tài khoản ngân hàng"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" form="wd-form" loading={busy}>
              Gửi yêu cầu
            </Button>
          </>
        }
      >
        <form id="wd-form" onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Số tiền" hint={`Tối thiểu ${money(MIN)}, tối đa ${money(s?.balance)}`} htmlFor="amt">
            <Input id="amt" type="number" min={MIN} max={s?.balance} step={10000} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Ngân hàng" htmlFor="bank">
            <Input id="bank" required value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Vietcombank" />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số tài khoản" htmlFor="acc">
              <Input id="acc" required inputMode="numeric" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value.replace(/\D/g, '') })} />
            </Field>
            <Field label="Chủ tài khoản" htmlFor="holder">
              <Input id="holder" required value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value.toUpperCase() })} />
            </Field>
          </div>
          <p className="text-sm text-muted">Số tiền bị trừ khỏi ví ngay khi gửi yêu cầu. Nếu quản trị viên từ chối, tiền được cộng lại.</p>
        </form>
      </Modal>
    </>
  );
}
