import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { profileApi } from '../../api/accountApi';
import { Avatar, Button, Field, Input, PageHeader, Panel, Badge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE } from '../../utils/labels';
import { date } from '../../utils/format';

export function ProfilePage() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);
  const [info, setInfo] = useState({ fullName: user.fullName, phone: user.phone || '' });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveInfo = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { fullName: info.fullName };
      if (info.phone.trim()) body.phone = info.phone.trim();
      setUser(await profileApi.update(body));
      toast.success('Đã lưu thông tin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const savePw = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return toast.error('Mật khẩu nhập lại không khớp');
    setSavingPw(true);
    try {
      await profileApi.changePassword({ oldPassword: pw.oldPassword, newPassword: pw.newPassword });
      toast.success('Đã đổi mật khẩu');
      setPw({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingPw(false);
    }
  };

  const onAvatar = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setUser(await profileApi.uploadAvatar(f));
      toast.success('Đã cập nhật ảnh đại diện');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Tài khoản" description="Thông tin cá nhân và mật khẩu đăng nhập." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Panel>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar name={user.fullName} url={user.avatarUrl} size={96} />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full border border-line bg-white text-ink-soft hover:text-violet"
                aria-label="Đổi ảnh đại diện"
              >
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </div>
            <div className="mt-3 font-semibold">{user.fullName}</div>
            <div className="text-sm text-ink-soft">{user.email}</div>
            <Badge tone="violet" className="mt-2">
              {ROLE[user.role]}
            </Badge>
            <div className="mt-3 text-sm text-muted">Tham gia từ {date(user.createdAt)}</div>
          </div>
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Thông tin cá nhân">
            <form onSubmit={saveInfo} className="grid gap-4 sm:grid-cols-2">
              <Field label="Họ và tên" htmlFor="fn">
                <Input id="fn" value={info.fullName} onChange={(e) => setInfo({ ...info, fullName: e.target.value })} />
              </Field>
              <Field label="Số điện thoại" htmlFor="ph">
                <Input id="ph" value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
              </Field>
              <Field label="Email" hint="Email dùng để đăng nhập, không đổi được" className="sm:col-span-2">
                <Input value={user.email} disabled />
              </Field>
              <div className="sm:col-span-2">
                <Button type="submit" loading={saving}>
                  Lưu thông tin
                </Button>
              </div>
            </form>
          </Panel>
          <Panel title="Đổi mật khẩu">
            <form onSubmit={savePw} className="grid gap-4 sm:grid-cols-3">
              <Field label="Mật khẩu hiện tại" htmlFor="op">
                <Input id="op" type="password" value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} autoComplete="current-password" />
              </Field>
              <Field label="Mật khẩu mới" htmlFor="np">
                <Input id="np" type="password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
              </Field>
              <Field label="Nhập lại mật khẩu mới" htmlFor="cp">
                <Input id="cp" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
              </Field>
              <div className="sm:col-span-3">
                <Button type="submit" variant="secondary" loading={savingPw} disabled={!pw.oldPassword || pw.newPassword.length < 6}>
                  Đổi mật khẩu
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
