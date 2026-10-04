import { useState } from 'react';
import { Lock, LockOpen, Trash2 } from 'lucide-react';
import { adminAccountApi } from '../../api/accountApi';
import { Avatar, Button, Input, Modal, PageHeader, Pagination, Panel, Select, StatusBadge, Table, Alert } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { date, dateTime } from '../../utils/format';
import { ROLE, USER_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function UsersPage() {
  const toast = useToast();
  const [filter, setFilter] = useState({ q: '', role: '', status: '', page: 1 });
  const [confirm, setConfirm] = useState(null);
  const params = Object.fromEntries(Object.entries({ ...filter, size: 15 }).filter(([, v]) => v !== ''));
  const { data, loading, error, reload } = useAsync(() => adminAccountApi.users(params), [JSON.stringify(params)]);

  const act = async (fn, msg) => {
    try {
      await fn();
      toast.success(msg);
      reload({ silent: true });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      title: 'Người dùng',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.fullName} url={u.avatarUrl} size={34} />
          <div>
            <div className="font-medium">{u.fullName}</div>
            <div className="text-sm text-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    { key: 'role', title: 'Vai trò', render: (u) => ROLE[u.role] },
    { key: 'status', title: 'Trạng thái', render: (u) => <StatusBadge map={USER_STATUS} value={u.status} /> },
    { key: 'created', title: 'Ngày tạo', render: (u) => date(u.createdAt) },
    { key: 'last', title: 'Đăng nhập gần nhất', render: (u) => dateTime(u.lastLoginAt) },
    {
      key: 'actions',
      title: '',
      className: 'text-right',
      render: (u) =>
        u.role === 'ADMIN' ? null : (
          <div className="flex justify-end gap-1">
            {u.status === 'LOCKED' ? (
              <Button size="sm" variant="secondary" onClick={() => act(() => adminAccountApi.unlock(u.id), `Đã mở khóa ${u.fullName}`)}>
                <LockOpen className="size-4" /> Mở khóa
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setConfirm({ type: 'lock', user: u })}>
                <Lock className="size-4" /> Khóa
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setConfirm({ type: 'delete', user: u })} aria-label="Xóa">
              <Trash2 className="size-4 text-redpen" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader title="Người dùng" description="Khóa tài khoản vi phạm hoặc xóa mềm tài khoản không còn dùng." />
      <Panel padded={false}>
        <div className="flex flex-wrap gap-3 border-b border-line p-4">
          <Input
            placeholder="Tìm theo tên hoặc email"
            className="max-w-xs"
            value={filter.q}
            onChange={(e) => setFilter({ ...filter, q: e.target.value, page: 1 })}
          />
          <Select className="w-44" value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value, page: 1 })} aria-label="Lọc vai trò">
            <option value="">Mọi vai trò</option>
            {Object.entries(ROLE).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select className="w-48" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value, page: 1 })} aria-label="Lọc trạng thái">
            <option value="">Mọi trạng thái</option>
            {Object.entries(USER_STATUS).map(([k, [v]]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        {error && <Alert tone="bad" className="m-4">{error.message}</Alert>}
        <Table columns={columns} rows={data?.items || []} empty={loading ? 'Đang tải…' : 'Không có người dùng phù hợp'} />
        <div className="px-4 pb-4">
          <Pagination page={filter.page} totalPages={data?.totalPages} onChange={(page) => setFilter({ ...filter, page })} />
        </div>
      </Panel>
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.type === 'lock' ? 'Khóa tài khoản' : 'Xóa tài khoản'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const u = confirm.user;
                setConfirm(null);
                if (confirm.type === 'lock') act(() => adminAccountApi.lock(u.id), `Đã khóa ${u.fullName}`);
                else act(() => adminAccountApi.remove(u.id), `Đã xóa ${u.fullName}`);
              }}
            >
              {confirm?.type === 'lock' ? 'Khóa tài khoản' : 'Xóa tài khoản'}
            </Button>
          </>
        }
      >
        {confirm?.type === 'lock'
          ? `${confirm?.user.fullName} sẽ không đăng nhập được cho tới khi được mở khóa.`
          : `Tài khoản ${confirm?.user.email} sẽ bị xóa mềm (vẫn giữ dữ liệu lịch sử) và không đăng nhập được nữa.`}
      </Modal>
    </>
  );
}
