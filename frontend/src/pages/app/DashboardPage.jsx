import { Link } from 'react-router-dom';
import { AlertCircle, ArrowDownToLine, BadgeCheck, ShieldAlert } from 'lucide-react';
import { adminAccountApi } from '../../api/accountApi';
import { bookingApi } from '../../api/bookingApi';
import { walletApi } from '../../api/paymentApi';
import { tutorApi } from '../../api/tutorApi';
import { BookingRow } from '../../components/booking';
import { ColumnChart } from '../../components/ColumnChart';
import { Alert, Button, EmptyState, GradeMark, PageHeader, PageLoader, Panel, Stat, StatusBadge, Table, cx } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { date, dateTime, money, number } from '../../utils/format';
import { BOOKING_STATUS, TUTOR_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

const compactVnd = (v) => (v >= 1_000_000 ? `${(v / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));
const monthLabel = (m) => `T${Number(m.slice(5))}`;

function StatStrip({ items }) {
  return (
    <div className={cx('mb-6 grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-2', items.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
      {items.map((it) => (
        <div key={it.label} className="bg-white p-5">
          <Stat {...it} />
        </div>
      ))}
    </div>
  );
}

function AdminDashboard() {
  const { data: d, loading, error } = useAsync(() => adminAccountApi.dashboard(), []);
  if (loading) return <PageLoader />;
  if (error) return <Alert tone="bad">{error.message}</Alert>;
  const todo = [
    { n: d.pendingTutors, label: 'hồ sơ gia sư chờ duyệt', to: '/app/admin/tutors', icon: BadgeCheck },
    { n: d.openDisputes, label: 'khiếu nại đang mở, tiền đang đóng băng', to: '/app/admin/disputes', icon: ShieldAlert },
    { n: d.pendingWithdrawals.count, label: `yêu cầu rút tiền (${money(d.pendingWithdrawals.amount)})`, to: '/app/admin/withdrawals', icon: ArrowDownToLine },
  ];
  const completed = d.bookings.COMPLETED || 0;
  return (
    <>
      <PageHeader title="Tổng quan hệ thống" description={`Số liệu tới ${dateTime(new Date())}.`} />
      <Panel title="Cần xử lý" padded={false} className="mb-6">
        <ul>
          {todo.map((t) => {
            const Icon = t.icon;
            return (
              <li key={t.to}>
                <Link to={t.to} className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0 hover:bg-wash">
                  <Icon className={cx('size-5', t.n ? 'text-redpen' : 'text-muted')} />
                  <span className={cx('tabular text-lg font-bold', !t.n && 'text-muted')}>{t.n}</span>
                  <span className={t.n ? 'text-ink' : 'text-muted'}>{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Panel>
      <StatStrip
        items={[
          { label: 'Học viên', value: number(d.users.STUDENT || 0) },
          { label: 'Gia sư', value: number(d.users.TUTOR || 0) },
          { label: 'Buổi học hoàn tất', value: number(completed), sub: `${number((d.bookings.CONFIRMED || 0) + (d.bookings.AWAITING_CONFIRMATION || 0))} buổi đang diễn ra` },
          { label: 'Học viên đã thanh toán', value: money(d.totalPaid), sub: `${d.paymentCount} giao dịch` },
        ]}
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Tiền học viên thanh toán theo tháng">
          <ColumnChart data={d.monthly.map((x) => ({ label: monthLabel(x.month), value: x.gmv }))} format={money} compact={compactVnd} label="Tiền học viên thanh toán 6 tháng gần nhất" />
        </Panel>
        <Panel title="Hoa hồng nền tảng theo tháng">
          <ColumnChart data={d.monthly.map((x) => ({ label: monthLabel(x.month), value: x.commission }))} format={money} compact={compactVnd} label="Hoa hồng nền tảng 6 tháng gần nhất" />
        </Panel>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title="Buổi học mới nhất" padded={false} actions={<Link to="/app/admin/bookings" className="text-sm text-violet hover:underline">Xem tất cả</Link>}>
          <Table
            columns={[
              { key: 'code', title: 'Mã', render: (b) => <Link to={`/app/bookings/${b.id}`} className="tabular font-medium text-violet hover:underline">{b.code}</Link> },
              { key: 'people', title: 'Học viên → Gia sư', render: (b) => <span className="text-sm">{b.student} → {b.tutor}</span> },
              { key: 'startAt', title: 'Ngày học', render: (b) => date(b.startAt) },
              { key: 'status', title: 'Trạng thái', render: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} /> },
            ]}
            rows={d.recentBookings}
          />
        </Panel>
        <Panel title="Ví hệ thống">
          <div className="flex flex-col gap-4">
            <Stat label="Đang giữ hộ (escrow)" value={money(d.balances.ESCROW)} sub="Chờ buổi học hoàn tất hoặc xử lý khiếu nại" />
            <Stat label="Hoa hồng đã thu" value={money(d.balances.PLATFORM)} />
            <Button variant="secondary" to="/app/admin/finance">
              Xem dòng tiền
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function StudentDashboard({ user }) {
  const action = useAsync(() => bookingApi.mine({ scope: 'action', size: 5 }), []);
  const upcoming = useAsync(() => bookingApi.mine({ scope: 'upcoming', size: 4 }), []);
  const wallet = useAsync(() => walletApi.me(), []);
  const awaiting = action.data?.items.filter((b) => b.status === 'AWAITING_CONFIRMATION') || [];
  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} actions={<Button to="/tutors">Tìm gia sư</Button>} />
      {awaiting.length > 0 && (
        <Panel title="Chờ bạn xác nhận" padded={false} className="mb-6 border-info/40">
          <p className="border-b border-line px-5 py-3 text-ink-soft">Buổi học đã xong. Xác nhận để gia sư nhận tiền, hoặc mở khiếu nại nếu có vấn đề.</p>
          {awaiting.map((b) => (
            <BookingRow key={b.id} b={b} viewerRole="STUDENT" />
          ))}
        </Panel>
      )}
      {wallet.data && (
        <StatStrip
          items={[
            { label: 'TutorHub đang giữ cho bạn', value: money(wallet.data.heldInEscrow), sub: 'Học phí các buổi chưa hoàn tất' },
            { label: 'Đã thanh toán', value: money(wallet.data.totalPaid) },
            { label: 'Đã được hoàn', value: money(wallet.data.totalRefunded) },
          ]}
        />
      )}
      <Panel title="Buổi học sắp tới" padded={false} actions={<Link to="/app/bookings" className="text-sm text-violet hover:underline">Lịch học</Link>}>
        {upcoming.data?.items.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Chưa có buổi học nào sắp tới" action={<Button to="/tutors">Tìm gia sư</Button>}>
              Chọn gia sư theo môn, khu vực và mức giá, rồi đặt một khung giờ trống.
            </EmptyState>
          </div>
        ) : (
          upcoming.data?.items.map((b) => <BookingRow key={b.id} b={b} viewerRole="STUDENT" />)
        )}
      </Panel>
    </>
  );
}

function TutorDashboard({ user }) {
  const profile = useAsync(() => tutorApi.mine(), []);
  const upcoming = useAsync(() => bookingApi.mine({ scope: 'upcoming', size: 4 }), []);
  const wallet = useAsync(() => walletApi.me(), []);
  const p = profile.data;
  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} actions={<Button to="/app/tutor/schedule">Mở thêm lịch trống</Button>} />
      {p && p.status !== 'APPROVED' && (
        <Alert tone={p.status === 'REJECTED' ? 'bad' : 'warn'} className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            Hồ sơ của bạn: <StatusBadge map={TUTOR_STATUS} value={p.status} />
            {p.status === 'DRAFT' && 'Hoàn thiện và gửi duyệt để học viên tìm thấy bạn.'}
            {p.status === 'PENDING' && 'Quản trị viên đang xem hồ sơ.'}
            {p.status === 'REJECTED' && `Lý do: ${p.rejectReason}`}
          </span>
          <Button size="sm" to="/app/tutor/profile">
            Mở hồ sơ
          </Button>
        </Alert>
      )}
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {wallet.data && (
          <div className="grid gap-px overflow-hidden rounded-[var(--radius-md)] border border-line bg-line sm:grid-cols-3">
            <div className="bg-white p-5">
              <Stat label="Số dư rút được" value={money(wallet.data.balance)} />
            </div>
            <div className="bg-white p-5">
              <Stat label="TutorHub đang giữ" value={money(wallet.data.heldInEscrow)} sub="Về ví khi học viên xác nhận" />
            </div>
            <div className="bg-white p-5">
              <Stat label="Tổng đã nhận" value={money(wallet.data.totalEarned)} />
            </div>
          </div>
        )}
        {p && (
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <GradeMark score={p.ratingAvg} count={p.ratingCount} />
              <div className="text-right text-sm text-ink-soft">
                <div className="tabular text-xl font-bold text-ink">{p.completedLessons}</div>
                buổi đã dạy
              </div>
            </div>
          </Panel>
        )}
      </div>
      <Panel title="Buổi dạy sắp tới" padded={false} actions={<Link to="/app/bookings" className="text-sm text-violet hover:underline">Tất cả buổi dạy</Link>}>
        {upcoming.data?.items.length === 0 ? (
          <p className="px-5 py-6 text-ink-soft">Chưa có buổi nào sắp tới. Mở thêm khung giờ trống để học viên đặt lịch.</p>
        ) : (
          upcoming.data?.items.map((b) => <BookingRow key={b.id} b={b} viewerRole="TUTOR" />)
        )}
      </Panel>
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  if (user.role === 'ADMIN') return <AdminDashboard />;
  if (user.role === 'TUTOR') return <TutorDashboard user={user} />;
  return <StudentDashboard user={user} />;
}
