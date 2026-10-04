import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/accountApi';
import { AuthShell } from '../../components/layout/AuthShell';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const DEMO = [
  ['Học viên', 'hocvien@tutorhub.vn'],
  ['Gia sư', 'giasu@tutorhub.vn'],
  ['Quản trị', 'admin@tutorhub.vn'],
];

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: params.get('email') || '', password: '' });
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(form.email, form.password);
      signIn(res);
      navigate(params.get('next') || '/app', { replace: true });
    } catch (err) {
      setError(err.message);
      setErrorCode(err.errorCode);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Đăng nhập" subtitle="Chào mừng bạn quay lại TutorHub.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && (
          <Alert tone="bad">
            {error}
            {errorCode === 'EMAIL_NOT_VERIFIED' && (
              <>
                {' '}
                <Link className="font-semibold underline" to={`/verify-otp?email=${encodeURIComponent(form.email)}&resend=1`}>
                  Xác thực ngay
                </Link>
              </>
            )}
          </Alert>
        )}
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Mật khẩu" htmlFor="password">
          <Input id="password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-violet hover:underline">
            Quên mật khẩu?
          </Link>
        </div>
        <Button type="submit" size="lg" loading={loading}>
          Đăng nhập
        </Button>
        <p className="text-center text-ink-soft">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-semibold text-violet hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
      <div className="mt-8 rounded-[var(--radius-md)] border border-dashed border-line p-4 text-sm">
        <p className="font-medium text-ink-soft">Tài khoản mẫu để demo (mật khẩu đều là 123456)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map(([label, email]) => (
            <button
              key={email}
              type="button"
              onClick={() => setForm({ email, password: '123456' })}
              className="rounded-full border border-line bg-white px-3 py-1 text-ink-soft hover:border-violet hover:text-violet"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  );
}
