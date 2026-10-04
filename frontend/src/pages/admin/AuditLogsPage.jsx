import { useState } from 'react';
import { adminAccountApi } from '../../api/accountApi';
import { Alert, PageHeader, Pagination, Panel, Select, Table } from '../../components/ui';
import { dateTime } from '../../utils/format';
import { useAsync } from '../../utils/useAsync';

export function AuditLogsPage() {
  const [filter, setFilter] = useState({ action: '', page: 1 });
  const params = Object.fromEntries(Object.entries({ ...filter, size: 20 }).filter(([, v]) => v !== ''));
  const { data, loading, error } = useAsync(() => adminAccountApi.auditLogs(params), [JSON.stringify(params)]);
  const { data: actions } = useAsync(() => adminAccountApi.auditActions(), []);

  const columns = [
    { key: 'createdAt', title: 'Thời điểm', render: (r) => <span className="tabular whitespace-nowrap">{dateTime(r.createdAt)}</span> },
    { key: 'actorEmail', title: 'Người thực hiện' },
    { key: 'action', title: 'Thao tác', render: (r) => <code className="text-sm">{r.action}</code> },
    { key: 'path', title: 'Đường dẫn', render: (r) => <span className="text-sm text-ink-soft">{r.method} {r.path}</span> },
    { key: 'detail', title: 'Dữ liệu gửi lên', render: (r) => <span className="line-clamp-2 max-w-xs break-all text-sm text-muted">{r.detail || '—'}</span> },
  ];

  return (
    <>
      <PageHeader title="Nhật ký thao tác" description="Mọi thao tác thay đổi dữ liệu của quản trị viên được ghi tự động." />
      <Panel padded={false}>
        <div className="border-b border-line p-4">
          <Select className="w-64" value={filter.action} onChange={(e) => setFilter({ action: e.target.value, page: 1 })} aria-label="Lọc thao tác">
            <option value="">Mọi thao tác</option>
            {actions?.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        {error && <Alert tone="bad" className="m-4">{error.message}</Alert>}
        <Table columns={columns} rows={data?.items || []} empty={loading ? 'Đang tải…' : 'Chưa có thao tác nào'} />
        <div className="px-4 pb-4">
          <Pagination page={filter.page} totalPages={data?.totalPages} onChange={(page) => setFilter({ ...filter, page })} />
        </div>
      </Panel>
    </>
  );
}
