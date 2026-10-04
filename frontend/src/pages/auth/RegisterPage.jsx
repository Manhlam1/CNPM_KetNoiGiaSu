import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Presentation } from 'lucide-react';
import { authApi } from '../../api/accountApi';
import { AuthShell } from '../../components/layout/AuthShell';
import { Alert, Button, Field, Input, cx } from '../../components/ui';

const ROLES = [
  { value: 'STUDENT', label: 'Tôi muốn học', desc: 'Tìm gia sư, đặt lịch và thanh toán an toàn', icon: GraduationCap },
  { value: 'TUTOR', label: 'Tôi muốn dạy', desc: 'Tạo hồ sơ, mở lịch trống và nhận học viên', icon: Presentation },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ role: 'STUDENT', fullName: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    setLoading(true);
    try {
      const body = { role: form.role, fullName: form.fullName, email: form.email, password: form.password };
      if (form.phone.trim()) body.phone = form.phone.trim();
      await authApi.register(body);
      navigate(`/verify-otp?email=${encodeURIComponent(form.email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Tạo tài khoản" subtitle="Mã xác thực sẽ được gửi tới email của bạn.">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="bad">{error}</Alert>}
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-1.5 text-sm font-medium text-ink-soft">Bạn đến TutorHub để</legend>
          {ROLES.map((r) => {
            const Icon = r.icon;
            const on = form.role === r.value;
            return (
              <label
                key={r.value}
                className={cx(
                  'cursor-pointer rounded-[var(--radius-md)] border p-3 transition-colors',
                  on ? 'border-violet bg-violet-tint' : 'border-line bg-white hover:border-ink-soft/40',
                )}
              >
                <input type="radio" name="role" value={r.value} checked={on} onChange={set('role')} className="sr-only" />
                <Icon className={cx('size-5', on ? 'text-violet' : 'text-muted')} />
                <div className="mt-1.5 font-semibold">{r.label}</div>
                <div className="text-sm text-ink-soft">{r.desc}</div>
              </label>
            );
          })}
        </fieldset>
        <Field label="Họ và tên" htmlFor="fullName">
          <Input id="fullName" required value={form.fullName} onChange={set('fullName')} autoComplete="name" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </Field>
          <Field label="Số điện thoại" hint="Không bắt buộc" htmlFor="phone">
            <Input id="phone" value={form.phone} onChange={set('phone')} autoComplete="tel" placeholder="0912345678" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mật khẩu" hint="Tối thiểu 6 ký tự" htmlFor="password">
            <Input id="password" type="password" required value={form.password} onChange={set('password')} autoComplete="new-password" />
          </Field>
          <Field label="Nhập lại mật khẩu" htmlFor="confirm">
            <Input id="confirm" type="password" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </Field>
        </div>
        <Button type="submit" size="lg" loading={loading}>
          Tạo tài khoản
        </Button>
        <p className="text-center text-ink-soft">
          Đã có tài khoản?{' '}
          <Link to="/login" className="font-semibold text-violet hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
