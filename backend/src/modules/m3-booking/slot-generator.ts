import { AvailabilityRuleType } from '../../common/enums';

/** Việt Nam không có giờ mùa hè: luôn UTC+7 */
export const VN_OFFSET = '+07:00';

export interface RuleLike {
  type: AvailabilityRuleType;
  dayOfWeek: number | null; // 1..7 (Thứ Hai..Chủ Nhật)
  date: string | null; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export interface Occurrence {
  startAt: Date;
  endAt: Date;
}

/** Ngày (YYYY-MM-DD) theo giờ Việt Nam của một thời điểm */
export function vnDate(d: Date): string {
  const t = new Date(d.getTime() + 7 * 3600_000);
  return t.toISOString().slice(0, 10);
}

/** Thứ trong tuần theo ISO (1 = Thứ Hai ... 7 = Chủ Nhật) của ngày YYYY-MM-DD */
export function isoDayOfWeek(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = CN
  return d === 0 ? 7 : d;
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VN_OFFSET}`);
}

export function minutesBetween(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

/**
 * Sinh các buổi cụ thể từ một rule trong khoảng [now, now + weeks tuần),
 * bỏ qua buổi đã bắt đầu.
 */
export function generateOccurrences(rule: RuleLike, now: Date, weeks: number): Occurrence[] {
  const out: Occurrence[] = [];
  const today = vnDate(now);
  const lastDay = addDays(today, weeks * 7);
  if (rule.type === AvailabilityRuleType.ONE_OFF) {
    if (rule.date && rule.date >= today && rule.date < lastDay) {
      const o = { startAt: at(rule.date, rule.startTime), endAt: at(rule.date, rule.endTime) };
      if (o.startAt > now) out.push(o);
    }
    return out;
  }
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(today, i);
    if (isoDayOfWeek(day) !== rule.dayOfWeek) continue;
    const o = { startAt: at(day, rule.startTime), endAt: at(day, rule.endTime) };
    if (o.startAt > now) out.push(o);
  }
  return out;
}

export function overlaps(a: Occurrence, b: Occurrence): boolean {
  return a.startAt < b.endAt && b.startAt < a.endAt;
}
