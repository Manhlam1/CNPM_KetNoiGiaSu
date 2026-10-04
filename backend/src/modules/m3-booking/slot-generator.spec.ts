import { AvailabilityRuleType } from '../../common/enums';
import { addDays, at, generateOccurrences, isoDayOfWeek, minutesBetween, overlaps, vnDate } from './slot-generator';

describe('Sinh slot từ lịch trống (giờ Việt Nam)', () => {
  // Thứ Bảy 03/10/2026, 10:00 giờ VN
  const now = new Date('2026-10-03T03:00:00Z');

  it('quy đổi giờ VN sang UTC đúng (19:00 VN = 12:00 UTC)', () => {
    expect(at('2026-10-06', '19:00').toISOString()).toBe('2026-10-06T12:00:00.000Z');
  });

  it('ngày theo giờ VN khác ngày UTC sau 17:00 UTC', () => {
    expect(vnDate(new Date('2026-10-03T17:30:00Z'))).toBe('2026-10-04');
  });

  it('thứ ISO: 2026-10-05 là Thứ Hai, 2026-10-04 là Chủ Nhật', () => {
    expect(isoDayOfWeek('2026-10-05')).toBe(1);
    expect(isoDayOfWeek('2026-10-04')).toBe(7);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });

  it('lịch lặp Thứ Ba 19:00-21:00 sinh đúng 4 buổi trong 4 tuần', () => {
    const occ = generateOccurrences({ type: AvailabilityRuleType.WEEKLY, dayOfWeek: 2, date: null, startTime: '19:00', endTime: '21:00' }, now, 4);
    expect(occ).toHaveLength(4);
    expect(occ[0].startAt.toISOString()).toBe('2026-10-06T12:00:00.000Z');
    expect(occ[3].startAt.toISOString()).toBe('2026-10-27T12:00:00.000Z');
    occ.forEach((o) => expect(o.endAt.getTime() - o.startAt.getTime()).toBe(2 * 3_600_000));
  });

  it('bỏ qua buổi đã bắt đầu trong ngày hôm nay', () => {
    // Hôm nay Thứ Bảy, lịch 08:00 đã qua -> buổi đầu là Thứ Bảy tuần sau
    const occ = generateOccurrences({ type: AvailabilityRuleType.WEEKLY, dayOfWeek: 6, date: null, startTime: '08:00', endTime: '10:00' }, now, 2);
    expect(occ[0].startAt.toISOString()).toBe('2026-10-10T01:00:00.000Z');
  });

  it('khung lẻ chỉ sinh 1 buổi, và không sinh nếu đã qua', () => {
    const one = { type: AvailabilityRuleType.ONE_OFF, dayOfWeek: null, startTime: '14:00', endTime: '15:30' };
    expect(generateOccurrences({ ...one, date: '2026-10-08' }, now, 4)).toHaveLength(1);
    expect(generateOccurrences({ ...one, date: '2026-10-01' }, now, 4)).toHaveLength(0);
  });

  it('phát hiện trùng giờ', () => {
    const a = { startAt: at('2026-10-06', '19:00'), endAt: at('2026-10-06', '21:00') };
    expect(overlaps(a, { startAt: at('2026-10-06', '20:00'), endAt: at('2026-10-06', '22:00') })).toBe(true);
    expect(overlaps(a, { startAt: at('2026-10-06', '21:00'), endAt: at('2026-10-06', '22:00') })).toBe(false);
    expect(minutesBetween('19:00', '21:30')).toBe(150);
  });
});
