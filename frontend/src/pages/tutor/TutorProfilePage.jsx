import { useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload, ExternalLink } from 'lucide-react';
import { tutorApi } from '../../api/tutorApi';
import { Alert, Button, Field, Input, PageHeader, PageLoader, Panel, Select, StatusBadge, Textarea, cx } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { date, money } from '../../utils/format';
import { TEACHING_MODE, TUTOR_STATUS } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';
import { useMeta } from '../../utils/useMeta';

const toForm = (p) => ({
  headline: p.headline || '',
  bio: p.bio || '',
  education: p.education || '',
  experienceYears: p.experienceYears ?? 0,
  hourlyRate: p.hourlyRate || '',
  teachingMode: p.teachingMode || 'BOTH',
  city: p.city || '',
  area: p.area || '',
  levels: p.levels || [],
  subjectIds: p.subjects.map((s) => s.id),
});

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cx(
        'rounded-full border px-3 py-1 text-sm transition-colors',
        on ? 'border-violet bg-violet-tint font-medium text-violet' : 'border-line bg-white text-ink-soft hover:border-ink-soft/40',
      )}
    >
      {children}
    </button>
  );
}

export function TutorProfilePage() {
  const toast = useToast();
  const { data: meta } = useMeta();
  const { data: profile, loading, error, setData } = useAsync(() => tutorApi.mine(), []);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cert, setCert] = useState({ title: '', file: null });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (profile && !form) setForm(toForm(profile));
  }, [profile, form]);

  if (loading || !form) return error ? <Alert tone="bad">{error.message}</Alert> : <PageLoader />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (k, v) => setForm({ ...form, [k]: form[k].includes(v) ? form[k].filter((x) => x !== v) : [...form[k], v] });
  const areas = meta?.cities.find((c) => c.name === form.city)?.areas || [];

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, experienceYears: Number(form.experienceYears) || 0, hourlyRate: Number(form.hourlyRate) || undefined };
      if (!body.hourlyRate) delete body.hourlyRate;
      if (!body.city) delete body.city;
      if (!body.subjectIds.length) delete body.subjectIds;
      if (body.headline.length < 10) delete body.headline;
      const p = await tutorApi.update(body);
      setData(p);
      setForm(toForm(p));
      toast.success('Đã lưu hồ sơ');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    if (!(await save())) return;
    setSubmitting(true);
    try {
      setData(await tutorApi.submit());
      toast.success('Đã gửi hồ sơ cho quản trị viên duyệt');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!cert.title.trim() || !cert.file) return toast.error('Nhập tên chứng chỉ và chọn file');
    setUploading(true);
    try {
      setData(await tutorApi.addCertificate(cert.title.trim(), cert.file));
      setCert({ title: '', file: null });
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Đã tải lên chứng chỉ');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeCert = async (id) => {
    try {
      setData(await tutorApi.removeCertificate(id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const p = profile;
  const canSubmit = p.status === 'DRAFT' || p.status === 'REJECTED';

  return (
    <>
      <PageHeader
        title="Hồ sơ gia sư"
        description="Học viên xem hồ sơ này trước khi đặt lịch. Hồ sơ chỉ hiện trong tìm kiếm sau khi quản trị viên duyệt."
        actions={
          <>
            {p.status === 'APPROVED' && (
              <Button variant="secondary" to={`/tutors/${p.id}`}>
                <ExternalLink className="size-4" /> Xem trang công khai
              </Button>
            )}
            <Button variant="secondary" onClick={save} loading={saving}>
              Lưu nháp
            </Button>
            {canSubmit && (
              <Button onClick={submit} loading={submitting}>
                Gửi duyệt
              </Button>
            )}
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-line bg-white px-5 py-4">
        <StatusBadge map={TUTOR_STATUS} value={p.status} />
        <span className="text-ink-soft">
          {p.status === 'DRAFT' && 'Hoàn thiện các mục bên dưới rồi bấm “Gửi duyệt”.'}
          {p.status === 'PENDING' && `Đã gửi ngày ${date(p.submittedAt)}. Quản trị viên sẽ xem chứng chỉ và phản hồi qua thông báo.`}
          {p.status === 'APPROVED' && `Đã duyệt ngày ${date(p.approvedAt)}. Mở lịch trống để học viên đặt buổi học.`}
          {p.status === 'REJECTED' && `Bị từ chối: ${p.rejectReason}. Sửa hồ sơ rồi gửi duyệt lại.`}
        </span>
      </div>
      {canSubmit && p.missing.length > 0 && (
        <Alert tone="warn" className="mb-6">
          Còn thiếu: {p.missing.join(', ')}.
        </Alert>
      )}

      <form onSubmit={save} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Panel title="Giới thiệu bản thân">
            <div className="flex flex-col gap-4">
              <Field label="Tiêu đề hồ sơ" hint="Một câu nói rõ bạn dạy gì, cho ai. 10–160 ký tự." htmlFor="headline">
                <Input id="headline" value={form.headline} onChange={set('headline')} maxLength={160} placeholder="Gia sư Toán THPT, 5 năm luyện thi đại học" />
              </Field>
              <Field label="Giới thiệu" hint={`${form.bio.length}/3000 ký tự, tối thiểu 50`} htmlFor="bio">
                <Textarea id="bio" rows={7} value={form.bio} onChange={set('bio')} maxLength={3000} placeholder="Kinh nghiệm, phương pháp dạy, kết quả học viên đạt được…" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                <Field label="Học vấn" htmlFor="education">
                  <Input id="education" value={form.education} onChange={set('education')} placeholder="Cử nhân Sư phạm Toán, ĐH Sư phạm Hà Nội" />
                </Field>
                <Field label="Số năm kinh nghiệm" htmlFor="exp">
                  <Input id="exp" type="number" min={0} max={50} value={form.experienceYears} onChange={set('experienceYears')} />
                </Field>
              </div>
            </div>
          </Panel>

          <Panel title="Môn dạy và cấp học">
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-2 text-sm font-medium text-ink-soft">Môn dạy (tối đa 6)</div>
                <div className="flex flex-wrap gap-2">
                  {meta?.subjects.map((s) => (
                    <Chip key={s.id} on={form.subjectIds.includes(s.id)} onClick={() => toggle('subjectIds', s.id)}>
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium text-ink-soft">Cấp học nhận dạy</div>
                <div className="flex flex-wrap gap-2">
                  {meta?.levels.map((l) => (
                    <Chip key={l} on={form.levels.includes(l)} onClick={() => toggle('levels', l)}>
                      {l}
                    </Chip>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Học phí và khu vực">
            <div className="flex flex-col gap-4">
              <Field label="Học phí mỗi giờ (đồng)" hint={form.hourlyRate ? `Học viên thấy: ${money(Math.round(Number(form.hourlyRate) / 1000) * 1000)}/giờ` : 'Từ 50.000đ đến 2.000.000đ'} htmlFor="rate">
                <Input id="rate" type="number" step={10000} min={50000} value={form.hourlyRate} onChange={set('hourlyRate')} />
              </Field>
              <Field label="Hình thức dạy" htmlFor="mode">
                <Select id="mode" value={form.teachingMode} onChange={set('teachingMode')}>
                  {Object.entries(TEACHING_MODE).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Thành phố" htmlFor="city">
                <Select id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value, area: '' })}>
                  <option value="">Chọn thành phố</option>
                  {meta?.cities.map((c) => (
                    <option key={c.name}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Khu vực" htmlFor="area">
                <Select id="area" value={form.area} onChange={set('area')} disabled={!areas.length}>
                  <option value="">Chọn khu vực</option>
                  {areas.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel title="Chứng chỉ, bằng cấp">
            <ul className="mb-4 flex flex-col gap-2">
              {p.certificates.length === 0 && <li className="text-sm text-muted">Chưa có chứng chỉ nào. Cần ít nhất 1 chứng chỉ để gửi duyệt.</li>}
              {p.certificates.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-3 py-2">
                  <FileText className="size-4 shrink-0 text-violet" />
                  <a href={c.fileUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                    {c.title}
                  </a>
                  {p.status !== 'PENDING' && (
                    <button type="button" onClick={() => removeCert(c.id)} aria-label={`Xóa ${c.title}`} className="text-muted hover:text-redpen">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2">
              <Input placeholder="Tên chứng chỉ, vd. IELTS 8.0" value={cert.title} onChange={(e) => setCert({ ...cert, title: e.target.value })} aria-label="Tên chứng chỉ" />
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setCert({ ...cert, file: e.target.files?.[0] || null })}
                className="text-sm file:mr-3 file:rounded file:border file:border-line file:bg-white file:px-3 file:py-1.5 file:text-sm"
                aria-label="File chứng chỉ"
              />
              <Button type="button" variant="secondary" onClick={upload} loading={uploading}>
                <Upload className="size-4" /> Tải lên
              </Button>
              <p className="text-sm text-muted">Ảnh hoặc PDF, tối đa 5MB. Học viên chỉ thấy tên chứng chỉ.</p>
            </div>
          </Panel>
        </div>
      </form>
    </>
  );
}
