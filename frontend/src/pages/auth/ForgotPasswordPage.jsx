import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../api/accountApi';
import { DevMailHint } from '../../components/DevMailHint';
import { AuthShell } from '../../components/layout/AuthShell';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useToast } from '../../context/ToastContext';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: '', code: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(form.email);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newPassword !== form.confirm) return setError('Mật khẩu nhập lại không khớp');
    setLoading(true);
    try {
      await authApi.resetPassword({ email: form.email, code: form.code, newPassword: form.newPassword });
      toast.success('Đặt lại mật khẩu thành công, hãy đăng nhập');
      navigate(`/login?email=${encodeURIComponent(form.email)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle={step === 1 ? 'Nhập email đã đăng ký, chúng tôi sẽ gửi mã đặt lại mật khẩu.' : `Nhập mã đã gửi tới ${form.email} và mật khẩu mới.`}
      note="Quên mật khẩu không sao. Mã xác thực gửi về email là đủ."
    >
      {step === 1 ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          {error && <Alert tone="bad">{error}</Alert>}
          <Field label="Email" htmlFor="email">
            <Input id="email" type="email" required value={form.email} onChange={set('email')} />
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Gửi mã
          </Button>
          <Link to="/login" className="text-center text-violet hover:underline">
            Quay lại đăng nhập
          </Link>
        </form>
      ) : (
        <form onSubmit={reset} className="flex flex-col gap-4">
          <DevMailHint />
          {error && <Alert tone="bad">{error}</Alert>}
          <Field label="Mã OTP" htmlFor="code">
            <Input id="code" inputMode="numeric" maxLength={6} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Mật khẩu mới" hint="Tối thiểu 6 ký tự" htmlFor="np">
            <Input id="np" type="password" value={form.newPassword} onChange={set('newPassword')} autoComplete="new-password" />
          </Field>
          <Field label="Nhập lại mật khẩu mới" htmlFor="cf">
            <Input id="cf" type="password" value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
          </Field>
          <Button type="submit" size="lg" loading={loading}>
            Đặt lại mật khẩu
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
