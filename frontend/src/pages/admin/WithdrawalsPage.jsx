import { useState } from 'react';
import { adminFinanceApi } from '../../api/paymentApi';
import { Button, Field, Modal, PageHeader, Pagination, Panel, StatusBadge, Table, Tabs, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { dateTime, money } from '../../utils/format';
import { WITHDRAWAL_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function WithdrawalsPage() {
  const toast = useToast();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [reject, setReject] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const { data, loading, reload } = useAsync(() => adminFinanceApi.withdrawals({ status, page, size: 15 }), [status, page]);

  const approve = async (w) => {
    setBusy(w.id);
    try {
      await adminFinanceApi.approveWithdrawal(w.id);
      toast.success(`Đã duyệt rút ${money(w.amount)} cho ${w.tutorName}`);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };
  const doReject = async () => {
    setBusy(reject.id);
    try {
      await adminFinanceApi.rejectWithdrawal(reject.id, note);
      toast.success('Đã từ chối, tiền được cộng lại ví gia sư');
      setReject(null);
      setNote('');
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Yêu cầu rút tiền" description="Duyệt là xác nhận đã chuyển khoản cho gia sư (bản demo chỉ mô phỏng chuyển khoản)." />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={Object.entries(WITHDRAWAL_STATUS).map(([k, [l]]) => ({ value: k, label: l }))}
      />
      <Panel padded={false}>
        <Table
          columns={[
            { key: 'createdAt', title: 'Ngày yêu cầu', render: (w) => <span className="tabular">{dateTime(w.createdAt)}</span> },
            { key: 'tutor', title: 'Gia sư', render: (w) => <div><div className="font-medium">{w.tutorName}</div><div className="text-sm text-muted">{w.tutorEmail}</div></div> },
            { key: 'amount', title: 'Số tiền', render: (w) => <span className="tabular font-semibold">{money(w.amount)}</span> },
            { key: 'bank', title: 'Tài khoản', render: (w) => <span className="text-sm">{w.bankName} · {w.bankAccount}<br />{w.accountHolder}</span> },
            { key: 'status', title: 'Trạng thái', render: (w) => <StatusBadge map={WITHDRAWAL_STATUS} value={w.status} /> },
            {
              key: 'act',
              title: '',
              className: 'text-right',
              render: (w) =>
                w.status === 'PENDING' ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setReject(w)}>
                      Từ chối
                    </Button>
                    <Button size="sm" variant="ok" loading={busy === w.id} onClick={() => approve(w)}>
                      Đã chuyển khoản
                    </Button>
                  </div>
                ) : (
                  <span className="text-sm text-muted">{w.note}</span>
                ),
            },
          ]}
          rows={data?.items || []}
          empty={loading ? 'Đang tải…' : 'Không có yêu cầu'}
        />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>
      </Panel>
      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title="Từ chối yêu cầu rút tiền"
        footer={
          <>
            <Button variant="secondary" onClick={() => setReject(null)}>
              Quay lại
            </Button>
            <Button variant="danger" disabled={note.trim().length < 5} loading={busy === reject?.id} onClick={doReject}>
              Từ chối
            </Button>
          </>
        }
      >
        <Field label="Lý do (gia sư sẽ nhận được)" htmlFor="note">
          <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: Tên chủ tài khoản không khớp với hồ sơ" />
        </Field>
      </Modal>
    </>
  );
}
