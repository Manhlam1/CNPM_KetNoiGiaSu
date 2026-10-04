import { Link } from 'react-router-dom';
import { MapPin, MonitorSmartphone, CalendarClock } from 'lucide-react';
import { Avatar, Badge, GradeMark, Button } from './ui';
import { money, shortDay, time } from '../utils/format';
import { TEACHING_MODE } from '../utils/labels';

/** Một dòng gia sư trong danh sách (như một dòng trong sổ điểm) */
export function TutorRow({ t }) {
  return (
    <article className="grid gap-4 border-b border-line px-5 py-5 last:border-0 sm:grid-cols-[1fr_auto]">
      <div className="flex min-w-0 gap-4">
        <Avatar name={t.fullName} url={t.avatarUrl} size={56} />
        <div className="min-w-0">
          <Link to={`/tutors/${t.id}`} className="text-[17px] font-semibold hover:text-violet">
            {t.fullName}
          </Link>
          <p className="mt-0.5 text-ink-soft">{t.headline}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.subjects.map((s) => (
              <Badge key={s.id} tone="violet">
                {s.name}
              </Badge>
            ))}
            {t.levels.slice(0, 3).map((l) => (
              <Badge key={l}>{l}</Badge>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {t.area ? `${t.area}, ` : ''}
              {t.city}
            </span>
            <span className="inline-flex items-center gap-1">
              <MonitorSmartphone className="size-3.5" /> {TEACHING_MODE[t.teachingMode]}
            </span>
            {t.experienceYears > 0 && <span>{t.experienceYears} năm kinh nghiệm</span>}
            {t.completedLessons > 0 && <span>{t.completedLessons} buổi đã dạy</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-start">
        <div className="text-right">
          <div className="tabular text-lg font-bold">{money(t.hourlyRate)}</div>
          <div className="text-sm text-muted">mỗi giờ</div>
        </div>
        <GradeMark score={t.ratingAvg} count={t.ratingCount} size="sm" />
        <div className="flex flex-col items-end gap-2">
          {t.nextSlotAt ? (
            <span className="inline-flex items-center gap-1 text-sm text-ok">
              <CalendarClock className="size-3.5" /> Trống {shortDay(t.nextSlotAt)} {time(t.nextSlotAt)}
            </span>
          ) : (
            <span className="text-sm text-muted">Chưa mở lịch trống</span>
          )}
          <Button size="sm" variant="secondary" to={`/tutors/${t.id}`}>
            Xem hồ sơ
          </Button>
        </div>
      </div>
    </article>
  );
}
