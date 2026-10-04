import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, MoreThan, Not, Repository } from 'typeorm';
import { badRequest, notFound } from '../../common/app.exception';
import { AvailabilityRuleType, BookingStatus, SlotStatus, TutorProfileStatus } from '../../common/enums';
import { ClockService } from '../m1-account/system-config/clock.service';
import { SystemConfigService } from '../m1-account/system-config/system-config.service';
import { TutorProfile } from '../m2-tutor/entities/tutor-profile.entity';
import { CreateRuleDto } from './booking.dto';
import { AvailabilityRule } from './entities/availability-rule.entity';
import { Booking } from './entities/booking.entity';
import { Slot } from './entities/slot.entity';
import { addDays, generateOccurrences, minutesBetween, overlaps, vnDate } from './slot-generator';

const MIN_MINUTES = 30;
const MAX_MINUTES = 240;

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityRule) private readonly rules: Repository<AvailabilityRule>,
    @InjectRepository(Slot) private readonly slots: Repository<Slot>,
    @InjectRepository(TutorProfile) private readonly profiles: Repository<TutorProfile>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly clock: ClockService,
    private readonly configs: SystemConfigService,
  ) {}

  private async profileOf(tutorUserId: number) {
    const p = await this.profiles.findOneBy({ userId: tutorUserId });
    if (!p) throw badRequest('NO_TUTOR_PROFILE', 'Bạn cần tạo hồ sơ gia sư trước');
    return p;
  }

  async listRules(tutorUserId: number) {
    const p = await this.profileOf(tutorUserId);
    return this.rules.find({ where: { tutorProfileId: p.id, active: true }, order: { type: 'DESC', dayOfWeek: 'ASC', date: 'ASC', startTime: 'ASC' } });
  }

  async createRule(tutorUserId: number, dto: CreateRuleDto) {
    const p = await this.profileOf(tutorUserId);
    const mins = minutesBetween(dto.startTime, dto.endTime);
    if (mins < MIN_MINUTES || mins > MAX_MINUTES) throw badRequest('INVALID_DURATION', `Mỗi buổi dài từ ${MIN_MINUTES} phút đến ${MAX_MINUTES / 60} giờ`);
    if (dto.startTime < '06:00' || dto.endTime > '23:00') throw badRequest('INVALID_TIME', 'Chỉ mở lịch trong khoảng 06:00 – 23:00');

    const now = this.clock.now();
    const weeks = this.configs.generateWeeks();
    const ruleLike = {
      type: dto.type,
      dayOfWeek: dto.type === AvailabilityRuleType.WEEKLY ? dto.dayOfWeek! : null,
      date: dto.type === AvailabilityRuleType.ONE_OFF ? dto.date! : null,
      startTime: dto.startTime,
      endTime: dto.endTime,
    };
    if (ruleLike.type === AvailabilityRuleType.ONE_OFF) {
      const today = vnDate(now);
      if (ruleLike.date! < today || ruleLike.date! > addDays(today, 60)) throw badRequest('INVALID_DATE', 'Ngày phải từ hôm nay tới 60 ngày tới');
    }
    const occ = generateOccurrences(ruleLike, now, ruleLike.type === AvailabilityRuleType.ONE_OFF ? 9 : weeks);
    if (!occ.length) throw badRequest('NO_OCCURRENCE', 'Khung giờ đã qua, hãy chọn thời gian trong tương lai');

    // Không cho trùng với lịch lặp khác cùng thứ
    if (ruleLike.type === AvailabilityRuleType.WEEKLY) {
      const sameDay = await this.rules.find({ where: { tutorProfileId: p.id, active: true, type: AvailabilityRuleType.WEEKLY, dayOfWeek: ruleLike.dayOfWeek! } });
      const clash = sameDay.find((r) => ruleLike.startTime < r.endTime && r.startTime < ruleLike.endTime);
      if (clash) throw badRequest('SLOT_OVERLAP', `Trùng với lịch ${clash.startTime}–${clash.endTime} cùng thứ`);
    }
    // Không cho trùng với slot đã có
    const existing = await this.slots.find({
      where: { tutorProfileId: p.id, status: Not(SlotStatus.CANCELLED), startAt: Between(new Date(occ[0].startAt.getTime() - 86400_000), occ[occ.length - 1].endAt) },
    });
    for (const o of occ) {
      const hit = existing.find((s) => overlaps(o, s));
      if (hit) throw badRequest('SLOT_OVERLAP', 'Khung giờ trùng với một buổi đã có trong lịch');
    }

    const rule = await this.rules.save(this.rules.create({ tutorProfileId: p.id, ...ruleLike, active: true }));
    await this.generateForRule(rule);
    return rule;
  }

  async deleteRule(tutorUserId: number, id: number) {
    const p = await this.profileOf(tutorUserId);
    const rule = await this.rules.findOneBy({ id, tutorProfileId: p.id, active: true });
    if (!rule) throw notFound('Không tìm thấy lịch');
    rule.active = false;
    await this.rules.save(rule);
    // Hủy các slot trống trong tương lai; slot đã có người đặt vẫn giữ nguyên
    const res = await this.slots.update({ ruleId: id, status: SlotStatus.AVAILABLE, startAt: MoreThan(this.clock.now()) }, { status: SlotStatus.CANCELLED, updatedAt: new Date() });
    return { id, cancelledSlots: res.affected ?? 0 };
  }

  /** Sinh slot cho N tuần tới (bỏ qua slot đã tồn tại nhờ UNIQUE(tutorProfileId, startAt)) */
  async generateForRule(rule: AvailabilityRule) {
    const occ = generateOccurrences(rule, this.clock.now(), this.configs.generateWeeks());
    if (!occ.length) return 0;
    const now = new Date();
    const res = await this.slots
      .createQueryBuilder()
      .insert()
      .into(Slot)
      .values(occ.map((o) => ({ tutorProfileId: rule.tutorProfileId, ruleId: rule.id, startAt: o.startAt, endAt: o.endAt, status: SlotStatus.AVAILABLE, createdAt: now, updatedAt: now })))
      .orIgnore()
      .updateEntity(false)
      .execute();
    return res.raw?.affectedRows ?? 0;
  }

  /** Chạy định kỳ: bảo đảm mọi lịch lặp đều có slot cho N tuần tới */
  async regenerateAll() {
    const rules = await this.rules.find({ where: { active: true, type: AvailabilityRuleType.WEEKLY } });
    let created = 0;
    for (const r of rules) created += await this.generateForRule(r);
    return created;
  }

  /** Lịch của gia sư (mọi trạng thái) kèm thông tin buổi học nếu đã có người đặt */
  async tutorSlots(tutorUserId: number, from?: string, to?: string) {
    const p = await this.profileOf(tutorUserId);
    const start = from ? new Date(from) : new Date(this.clock.now().getTime() - 86400_000);
    const end = to ? new Date(to) : new Date(start.getTime() + 35 * 86400_000);
    const slots = await this.slots.find({ where: { tutorProfileId: p.id, startAt: Between(start, end), status: Not(SlotStatus.CANCELLED) }, order: { startAt: 'ASC' } });
    const bookings = slots.length
      ? await this.ds.getRepository(Booking).find({
          where: { slotId: In(slots.map((s) => s.id)), status: Not(In([BookingStatus.EXPIRED, BookingStatus.CANCELLED])) },
          relations: { student: true },
        })
      : [];
    const bySlot = new Map(bookings.map((b) => [b.slotId, b]));
    return slots.map((s) => {
      const b = bySlot.get(s.id);
      return {
        id: s.id,
        startAt: s.startAt,
        endAt: s.endAt,
        status: s.status,
        ruleId: s.ruleId,
        booking: b ? { id: b.id, code: b.code, status: b.status, studentName: b.student?.fullName } : null,
      };
    });
  }

  /** Slot còn trống của gia sư cho học viên chọn */
  async publicSlots(profileId: number, from?: string, to?: string) {
    const p = await this.profiles.findOneBy({ id: profileId });
    if (!p || p.status !== TutorProfileStatus.APPROVED) throw notFound('Không tìm thấy gia sư');
    const now = this.clock.now();
    const start = from && new Date(from) > now ? new Date(from) : now;
    const end = to ? new Date(to) : new Date(now.getTime() + 35 * 86400_000);
    const slots = await this.slots.find({ where: { tutorProfileId: p.id, status: SlotStatus.AVAILABLE, startAt: Between(start, end) }, order: { startAt: 'ASC' } });
    return slots.map((s) => ({
      id: s.id,
      startAt: s.startAt,
      endAt: s.endAt,
      price: Math.round((p.hourlyRate * ((s.endAt.getTime() - s.startAt.getTime()) / 3_600_000)) / 1000) * 1000,
    }));
  }

  async cancelSlot(tutorUserId: number, slotId: number) {
    const p = await this.profileOf(tutorUserId);
    const res = await this.slots.update({ id: slotId, tutorProfileId: p.id, status: SlotStatus.AVAILABLE }, { status: SlotStatus.CANCELLED, updatedAt: new Date() });
    if (!res.affected) throw badRequest('SLOT_NOT_FREE', 'Chỉ hủy được khung giờ còn trống. Buổi đã có người đặt thì hủy trong trang buổi dạy.');
    return { id: slotId };
  }
}
