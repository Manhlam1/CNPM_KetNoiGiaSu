import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/ui';

export function DashboardPage() {
  const { user } = useAuth();
  return <PageHeader title={`Xin chào, ${user.fullName}`} description="Tổng quan sẽ hiển thị ở đây." />;
}
