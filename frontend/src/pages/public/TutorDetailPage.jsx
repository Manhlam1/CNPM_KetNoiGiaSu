import { useParams, useNavigate } from 'react-router-dom';
import { BadgeCheck, MapPin, MonitorSmartphone, GraduationCap, MessageCircle, ShieldCheck } from 'lucide-react';
import { publicApi } from '../../api/accountApi';
import { tutorApi } from '../../api/tutorApi';
import { chatApi } from '../../api/chatApi';
import { Alert, Avatar, Badge, Button, GradeMark, PageLoader, Panel } from '../../components/ui';
import { SlotPicker } from '../../components/SlotPicker';
import { ReviewList } from '../../components/ReviewList';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { date, money } from '../../utils/format';
import { TEACHING_MODE } from '../../utils/labels';
import { useAsync } from '../../utils/useAsync';

export function TutorDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: t, loading, error } = useAsync(() => tutorApi.detail(id), [id]);
  const { data: policies } = useAsync(() => publicApi.policies(), []);

  const startChat = async () => {
    if (!user) return navigate(`/login?next=/tutors/${id}`);
    try {
      const c = await chatApi.start(t.userId);
      navigate(`/app/messages/${c.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><Alert tone="bad">{error.message}</Alert></div>;

  const isOwnProfile = user?.id === t.userId;

  return (
    <div className="pb-16">
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-6 px-4 py-8">
          <Avatar name={t.fullName} url={t.avatarUrl} size={96} />
          <div className="min-w-0 flex-1">
            <h1 className="text-[30px] font-bold leading-tight">{t.fullName}</h1>
            <p className="mt-1 text-lg text-ink-soft">{t.headline}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.subjects.map((s) => (
                <Badge key={s.id} tone="violet">
                  {s.name}
                </Badge>
              ))}
              {t.levels.map((l) => (
                <Badge key={l}>{l}</Badge>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-ink-soft">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" /> {t.area ? `${t.area}, ` : ''}
                {t.city}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MonitorSmartphone className="size-4" /> {TEACHING_MODE[t.teachingMode]}
              </span>
              <span>{t.experienceYears} năm kinh nghiệm</span>
              <span>{t.completedLessons} buổi đã dạy trên TutorHub</span>
            </div>
          </div>
          <GradeMark score={t.ratingAvg} count={t.ratingCount} size="lg" animate />
        </div>
        {t.status !== 'APPROVED' && (
          <div className="mx-auto max-w-6xl px-4 pb-4">
            <Alert tone="warn">Hồ sơ chưa được duyệt nên chỉ bạn và quản trị viên xem được trang này.</Alert>
          </div>
        )}
      </section>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-8 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel title="Giới thiệu">
            <p className="whitespace-pre-line leading-relaxed text-ink-soft">{t.bio}</p>
            {t.education && (
              <p className="mt-4 flex items-start gap-2">
                <GraduationCap className="mt-0.5 size-5 shrink-0 text-violet" />
                <span>{t.education}</span>
              </p>
            )}
          </Panel>

          {t.certificates.length > 0 && (
            <Panel title="Chứng chỉ, bằng cấp đã nộp">
              <ul className="flex flex-col gap-2">
                {t.certificates.map((c) => (
                  <li key={c.id} className="flex items-center gap-2">
                    <BadgeCheck className="size-5 text-ok" />
                    {c.fileUrl ? (
                      <a href={c.fileUrl} target="_blank" rel="noreferrer" className="hover:text-violet hover:underline">
                        {c.title}
                      </a>
                    ) : (
                      <span>{c.title}</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted">Quản trị viên đã xem bản gốc trước khi duyệt hồ sơ{t.approvedAt ? ` ngày ${date(t.approvedAt)}` : ''}.</p>
            </Panel>
          )}

          <section id="lich-trong">
            <Panel title="Chọn buổi học">
              <SlotPicker tutor={t} disabled={isOwnProfile} />
            </Panel>
          </section>

          <section id="danh-gia">
            <Panel title={`Đánh giá từ học viên (${t.ratingCount})`}>
              <ReviewList tutorId={t.id} distribution={t.ratingDistribution} total={t.ratingCount} />
            </Panel>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-md)] border border-line bg-white p-5">
            <div className="tabular text-[28px] font-bold">{money(t.hourlyRate)}</div>
            <div className="text-sm text-muted">mỗi giờ học</div>
            <div className="mt-4 flex flex-col gap-2">
              <Button size="lg" onClick={() => document.getElementById('lich-trong')?.scrollIntoView({ behavior: 'smooth' })} disabled={isOwnProfile}>
                Chọn buổi học
              </Button>
              <Button size="lg" variant="secondary" onClick={startChat} disabled={isOwnProfile || user?.role === 'TUTOR' || user?.role === 'ADMIN'}>
                <MessageCircle className="size-4" /> Nhắn tin cho gia sư
              </Button>
            </div>
            <div className="mt-5 flex gap-3 border-t border-line pt-4 text-sm text-ink-soft">
              <ShieldCheck className="size-5 shrink-0 text-violet" />
              <p>
                Học phí được TutorHub giữ. Gia sư chỉ nhận tiền khi bạn xác nhận buổi học, hoặc sau {policies?.autoReleaseHours ?? 48} giờ nếu bạn không khiếu nại. Hủy trước{' '}
                {policies?.fullRefundHours ?? 24} giờ được hoàn đủ.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
