import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { adminTutorApi } from '../../api/tutorApi';
import { Alert, Avatar, Badge, Button, Field, Modal, PageHeader, Pagination, Panel, StatusBadge, Table, Tabs, Textarea } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { date, money } from '../../utils/format';
import { TEACHING_MODE, TUTOR_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function TutorApplicationsPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useAsync(() => adminTutorApi.list({ status, page, size: 10 }), [status, page]);
  const { data: counts, reload: reloadCounts } = useAsync(() => adminTutorApi.counts(), []);

  // Mở thẳng hồ sơ từ link thông báo (?open=id)
  useEffect(() => {
    const id = Number(params.get('open'));
    if (id && data?.items) {
      const found = data.items.find((x) => x.id === id);
      if (found) setOpen(found);
    }
  }, [params, data]);

  const close = () => {
    setOpen(null);
    setRejecting(false);
    setReason('');
    if (params.get('open')) setParams({});
  };

  const decide = async (approve) => {
    setBusy(true);
    try {
      if (approve) await adminTutorApi.approve(open.id);
      else await adminTutorApi.reject(open.id, reason);
      toast.success(approve ? `Đã duyệt hồ sơ ${open.fullName}` : `Đã từ chối hồ sơ ${open.fullName}`);
      close();
      reload({ silent: true });
      reloadCounts({ silent: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Gia sư',
      render: (t) => (
        <div className="flex items-center gap-3">
          <Avatar name={t.fullName} url={t.avatarUrl} size={36} />
          <div>
            <div className="font-medium">{t.fullName}</div>
            <div className="text-sm text-muted">{t.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'subjects', title: 'Môn dạy', render: (t) => t.subjects.map((s) => s.name).join(', ') || '—' },
    { key: 'rate', title: 'Học phí/giờ', render: (t) => <span className="tabular">{money(t.hourlyRate)}</span> },
    { key: 'certs', title: 'Chứng chỉ', render: (t) => t.certificates.length },
    { key: 'submitted', title: 'Ngày gửi', render: (t) => date(t.submittedAt) },
    { key: 'status', title: 'Trạng thái', render: (t) => <StatusBadge map={TUTOR_STATUS} value={t.status} /> },
    {
      key: 'act',
      title: '',
      className: 'text-right',
      render: (t) => (
        <Button size="sm" variant="secondary" onClick={() => setOpen(t)}>
          Xem hồ sơ
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Duyệt hồ sơ gia sư" description="Kiểm tra chứng chỉ và thông tin trước khi hồ sơ được hiện trong tìm kiếm." />
      <Tabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        tabs={['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].map((s) => ({ value: s, label: TUTOR_STATUS[s][0], count: counts?.[s] }))}
      />
      {error && <Alert tone="bad">{error.message}</Alert>}
      <Panel padded={false}>
        <Table columns={columns} rows={data?.items || []} empty={loading ? 'Đang tải…' : 'Không có hồ sơ nào ở trạng thái này'} />
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={data?.totalPages} onChange={setPage} />
        </div>
      </Panel>

      <Modal
        open={!!open}
        onClose={close}
        title={open ? `Hồ sơ ${open.fullName}` : ''}
        width="max-w-2xl"
        footer={
          open?.status === 'PENDING' &&
          (rejecting ? (
            <>
              <Button variant="secondary" onClick={() => setRejecting(false)}>
                Quay lại
              </Button>
              <Button variant="danger" loading={busy} disabled={reason.trim().length < 5} onClick={() => decide(false)}>
                Gửi lý do từ chối
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setRejecting(true)}>
                Từ chối
              </Button>
              <Button variant="ok" loading={busy} onClick={() => decide(true)}>
                Duyệt hồ sơ
              </Button>
            </>
          ))
        }
      >
        {open && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-semibold">{open.headline || '(chưa có tiêu đề)'}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {open.subjects.map((s) => (
                  <Badge key={s.id} tone="violet">
                    {s.name}
                  </Badge>
                ))}
                {open.levels.map((l) => (
                  <Badge key={l}>{l}</Badge>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[15px]">
              <dt className="text-muted">Học phí</dt>
              <dd className="tabular">{money(open.hourlyRate)}/giờ</dd>
              <dt className="text-muted">Khu vực</dt>
              <dd>
                {open.area ? `${open.area}, ` : ''}
                {open.city || '—'}
              </dd>
              <dt className="text-muted">Hình thức</dt>
              <dd>{TEACHING_MODE[open.teachingMode]}</dd>
              <dt className="text-muted">Kinh nghiệm</dt>
              <dd>{open.experienceYears} năm</dd>
              <dt className="text-muted">Học vấn</dt>
              <dd>{open.education || '—'}</dd>
              <dt className="text-muted">Liên hệ</dt>
              <dd>
                {open.email}
                {open.phone ? ` · ${open.phone}` : ''}
              </dd>
            </dl>
            <div>
              <div className="mb-1 text-sm font-medium text-ink-soft">Giới thiệu</div>
              <p className="whitespace-pre-line text-ink-soft">{open.bio || '—'}</p>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-ink-soft">Chứng chỉ ({open.certificates.length})</div>
              <ul className="flex flex-col gap-1.5">
                {open.certificates.map((c) => (
                  <li key={c.id}>
                    <a href={c.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-violet hover:underline">
                      <FileText className="size-4" /> {c.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {open.rejectReason && <Alert tone="bad">Lý do từ chối trước: {open.rejectReason}</Alert>}
            {rejecting && (
              <Field label="Lý do từ chối (gia sư sẽ nhận được)" htmlFor="reason">
                <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: Ảnh chứng chỉ bị mờ, vui lòng tải lại bản rõ hơn." />
              </Field>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
