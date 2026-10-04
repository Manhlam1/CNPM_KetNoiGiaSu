import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../api/accountApi';
import { DevMailHint } from '../../components/DevMailHint';
import { AuthShell } from '../../components/layout/AuthShell';
import { Alert, Button, Field, Input } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function VerifyOtpPage() {
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const sentOnce = useRef(false);

  useEffect(() => {
    // Từ trang đăng nhập chuyển sang (tài khoản chưa xác thực): gửi mã mới
    if (params.get('resend') && !sentOnce.current) {
      sentOnce.current = true;
      authApi.resendOtp(email).catch(() => {});
    }
  }, [params, email]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(email, code.trim());
      signIn(res);
      toast.success('Xác thực email thành công');
      navigate(res.user.role === 'TUTOR' ? '/app/tutor/profile' : '/app', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      const r = await authApi.resendOtp(email);
      toast.success(r.message || 'Đã gửi lại mã');
      setCooldown(30);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AuthShell title="Nhập mã xác thực" subtitle={`Mã 6 số đã được gửi tới ${email || 'email của bạn'}. Mã có hiệu lực 10 phút.`}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <DevMailHint />
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Mã OTP" htmlFor="code">
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="h-14 text-center text-2xl tracking-[0.5em] tabular"
            placeholder="______"
          />
        </Field>
        <Button type="submit" size="lg" loading={loading} disabled={code.length !== 6}>
          Xác thực
        </Button>
        <Button variant="ghost" onClick={resend} disabled={cooldown > 0}>
          {cooldown > 0 ? `Gửi lại mã sau ${cooldown} giây` : 'Gửi lại mã'}
        </Button>
      </form>
    </AuthShell>
  );
}
