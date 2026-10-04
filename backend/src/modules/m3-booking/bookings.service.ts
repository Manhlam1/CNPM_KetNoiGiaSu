import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, EntityManager, In, LessThanOrEqual, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, conflict, forbidden, notFound } from '../../common/app.exception';
import { AuthUser } from '../../common/decorators';
import { BookingStatus as S, DisputeDecision, NotificationType, PaymentStatus, Role, SlotStatus, TutorProfileStatus, UserStatus } from '../../common/enums';
import { EVENTS, PaymentSucceededEvent, PaymentSucceededResult } from '../../common/events';
import { roundTo } from '../../common/money';
import { skipTake } from '../../common/pagination';
import { ClockService } from '../m1-account/system-config/clock.service';
import { SystemConfigService } from '../m1-account/system-config/system-config.service';
import { TutorProfile } from '../m2-tutor/entities/tutor-profile.entity';
import { Payment } from '../m4-payment/entities/payment.entity';
import { EscrowService } from '../m4-payment/escrow.service';
import { NotificationsService, NotifyPayload } from '../m5-communication/notifications.service';
import { AdminBookingQueryDto, BookingQueryDto, CreateBookingDto } from './booking.dto';
import { assertTransition, InvalidTransitionError } from './booking-state';
import { decideCancellation } from './cancellation-policy';
import { Booking } from './entities/booking.entity';
import { Slot } from './entities/slot.entity';

type Notice = { to: number | number[]; payload: NotifyPayload; email?: boolean };

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking) private readonly bookings: Repository<Booking>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly escrow: EscrowService,
    private readonly clock: ClockService,
    private readonly configs: SystemConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ================================================================ Tiện ích chung

  private async lock(manager: EntityManager, id: number): Promise<Booking> {
    const b = await manager.findOne(Booking, { where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!b) throw notFound('Không tìm thấy buổi học');
    return b;
  }

  /** Đổi trạng thái theo đúng bảng chuyển trạng thái */
  private async move(manager: EntityManager, b: Booking, to: S, patch: Partial<Booking> = {}) {
    try {
      assertTransition(b.status, to);
    } catch (e) {
      if (e instanceof InvalidTransitionError) throw badRequest('INVALID_TRANSITION', e.message);
      throw e;
    }
    Object.assign(b, patch, { status: to });
    // Hết hiệu lực thì nhả khóa slot để người khác đặt được
    if ([S.EXPIRED, S.CANCELLED, S.REFUNDED].includes(to)) b.activeSlotKey = null;
    return manager.save(b);
  }

  private async setSlot(manager: EntityManager, slotId: number, status: SlotStatus) {
    await manager.update(Slot, { id: slotId }, { status, updatedAt: new Date() });
  }

  private async send(notices: Notice[]) {
    for (const n of notices) await this.notifications.notify(n.to, n.payload, { email: n.email });
  }

  autoReleaseAt(b: Booking): Date {
    return new Date(b.endAt.getTime() + this.configs.autoReleaseHours() * 3_600_000);
  }

  // ================================================================ Đặt lịch

  /**
   * Học viên chọn slot -> giữ slot (HELD) trong holdMinutes phút, tạo buổi học PENDING_PAYMENT.
   * Chống đặt trùng 2 lớp:
   *   1) UPDATE slots SET status='HELD' WHERE id=? AND status='AVAILABLE' (chỉ 1 request thắng)
   *   2) UNIQUE(activeSlotKey) trên bảng bookings
   */
  async create(student: AuthUser, dto: CreateBookingDto) {
    const now = this.clock.now();
    const booking = await this.ds.transaction(async (manager) => {
      const slot = await manager.findOneBy(Slot, { id: dto.slotId });
      if (!slot) throw notFound('Không tìm thấy khung giờ');
      const profile = await manager.findOne(TutorProfile, { where: { id: slot.tutorProfileId }, relations: { user: true, subjects: true } });
      if (!profile || profile.status !== TutorProfileStatus.APPROVED || profile.user.status !== UserStatus.ACTIVE) {
        throw badRequest('TUTOR_UNAVAILABLE', 'Gia sư hiện không nhận học viên');
      }
      if (profile.userId === student.id) throw badRequest('SELF_BOOKING', 'Bạn không thể tự đặt lịch của mình');
      if (slot.startAt <= now) throw badRequest('SLOT_PASSED', 'Khung giờ này đã qua');
      if (dto.subjectId && !profile.subjects.some((s) => s.id === dto.subjectId)) throw badRequest('INVALID_SUBJECT', 'Gia sư không dạy môn này');

      // Lớp 1: cập nhật có điều kiện (optimistic lock theo trạng thái + version)
      const res = await manager
        .createQueryBuilder()
        .update(Slot)
        .set({ status: SlotStatus.HELD, version: () => 'version + 1', updatedAt: new Date() })
        .where('id = :id AND status = :st', { id: slot.id, st: SlotStatus.AVAILABLE })
        .execute();
      if (res.affected !== 1) throw conflict('SLOT_TAKEN', 'Khung giờ vừa có người khác đặt, vui lòng chọn khung khác');

      const hours = (slot.endAt.getTime() - slot.startAt.getTime()) / 3_600_000;
      const b = manager.create(Booking, {
        studentId: student.id,
        tutorProfileId: profile.id,
        tutorUserId: profile.userId,
        slotId: slot.id,
        activeSlotKey: slot.id, // Lớp 2: UNIQUE
        subjectId: dto.subjectId ?? (profile.subjects.length === 1 ? profile.subjects[0].id : null),
        startAt: slot.startAt,
        endAt: slot.endAt,
        price: roundTo(profile.hourlyRate * hours, 1000),
        note: dto.note?.trim() || null,
        status: S.PENDING_PAYMENT,
        holdExpiresAt: new Date(now.getTime() + this.configs.holdMinutes() * 60_000),
      });
      const saved = await manager.save(b);
      saved.code = `BK-${String(saved.id).padStart(6, '0')}`;
      return manager.save(saved);
    });
    return this.detail({ id: student.id, role: Role.STUDENT } as AuthUser, booking.id);
  }

  /** M4 báo thanh toán thành công (chạy chung transaction với M4) */
  @OnEvent(EVENTS.PAYMENT_SUCCEEDED, { suppressErrors: false })
  async onPaymentSucceeded(e: PaymentSucceededEvent): Promise<PaymentSucceededResult> {
    const b = await this.lock(e.manager, e.bookingId);
    if (b.status !== S.PENDING_PAYMENT) return { accepted: false, reason: `Buổi học đang ở trạng thái ${b.status}` };
    await this.move(e.manager, b, S.CONFIRMED, { paidAt: this.clock.now(), holdExpiresAt: null });
    await this.setSlot(e.manager, b.slotId, SlotStatus.BOOKED);
    return { accepted: true };
  }

  // ================================================================ Hủy / dạy xong / xác nhận

  async cancel(viewer: AuthUser, id: number, reason?: string) {
    const notices: Notice[] = [];
    const now = this.clock.now();
    await this.ds.transaction(async (manager) => {
      const b = await this.lock(manager, id);
      const isStudent = b.studentId === viewer.id;
      const isTutor = b.tutorUserId === viewer.id;
      if (!isStudent && !isTutor) throw forbidden('Bạn không thuộc buổi học này');

      if (b.status === S.PENDING_PAYMENT) {
        if (!isStudent) throw badRequest('CANNOT_CANCEL', 'Buổi học chưa thanh toán, chỉ học viên hủy được');
        await this.move(manager, b, S.CANCELLED, { cancelledAt: now, cancelledBy: 'STUDENT', cancelReason: reason ?? null, holdExpiresAt: null });
        await this.setSlot(manager, b.slotId, SlotStatus.AVAILABLE);
        return;
      }
      if (b.status !== S.CONFIRMED) throw badRequest('CANNOT_CANCEL', 'Chỉ hủy được buổi học chưa diễn ra');
      if (b.startAt <= now) throw badRequest('LESSON_STARTED', 'Buổi học đã bắt đầu, không thể hủy. Nếu có vấn đề hãy mở khiếu nại sau buổi học.');

      const d = decideCancellation({ actor: isTutor ? 'TUTOR' : 'STUDENT', price: b.price, startAt: b.startAt, now, fullRefundHours: this.configs.fullRefundHours() });
      if (d.releaseToTutor) await this.escrow.release(manager, b.id);
      else await this.escrow.refund(manager, b.id);
      await this.move(manager, b, S.CANCELLED, {
        cancelledAt: now,
        cancelledBy: isTutor ? 'TUTOR' : 'STUDENT',
        cancelReason: reason ?? null,
        refundAmount: d.refundAmount,
      });
      await this.setSlot(manager, b.slotId, d.reopenSlot ? SlotStatus.AVAILABLE : SlotStatus.CANCELLED);

      const other = isTutor ? b.studentId : b.tutorUserId;
      const who = isTutor ? 'Gia sư' : 'Học viên';
      notices.push({
        to: other,
        email: true,
        payload: {
          type: NotificationType.BOOKING,
          title: `${who} đã hủy buổi học ${b.code}`,
          body: d.refundAmount > 0 ? `Học viên được hoàn ${d.refundAmount.toLocaleString('vi-VN')}đ.` : 'Hủy muộn nên học phí được chuyển cho gia sư theo chính sách.',
          link: `/app/bookings/${b.id}`,
        },
      });
      notices.push({
        to: viewer.id,
        payload: {
          type: NotificationType.BOOKING,
          title: `Đã hủy buổi học ${b.code}`,
          body: d.refundAmount > 0 ? `Hoàn ${d.refundAmount.toLocaleString('vi-VN')}đ vào ví học viên.` : 'Không hoàn tiền do hủy muộn.',
          link: `/app/bookings/${b.id}`,
        },
      });
    });
    await this.send(notices);
    return this.detail(viewer, id);
  }

  async markTaught(tutor: AuthUser, id: number) {
    const now = this.clock.now();
    const notices: Notice[] = [];
    await this.ds.transaction(async (manager) => {
      const b = await this.lock(manager, id);
      if (b.tutorUserId !== tutor.id) throw forbidden('Bạn không phải gia sư của buổi học này');
      if (![S.CONFIRMED, S.AWAITING_CONFIRMATION].includes(b.status)) throw badRequest('INVALID_STATE', 'Buổi học không ở trạng thái đang diễn ra');
      if (now < b.startAt) throw badRequest('NOT_STARTED', 'Buổi học chưa bắt đầu');
      if (b.tutorMarkedTaughtAt) return;
      b.tutorMarkedTaughtAt = now;
      await manager.save(b);
      if (b.status === S.CONFIRMED && now >= b.endAt) {
        await this.move(manager, b, S.AWAITING_CONFIRMATION);
        notices.push(this.awaitingNotice(b));
      }
    });
    await this.send(notices);
    return this.detail(tutor, id);
  }

  /** Học viên xác nhận buổi học đã diễn ra -> giải ngân cho gia sư */
  async confirm(student: AuthUser, id: number) {
    const now = this.clock.now();
    const notices: Notice[] = [];
    await this.ds.transaction(async (manager) => {
      const b = await this.lock(manager, id);
      if (b.studentId !== student.id) throw forbidden('Đây không phải buổi học của bạn');
      if (b.status === S.CONFIRMED && now >= b.endAt) await this.move(manager, b, S.AWAITING_CONFIRMATION);
      if (b.status !== S.AWAITING_CONFIRMATION) throw badRequest('CANNOT_CONFIRM', 'Chỉ xác nhận được sau khi buổi học kết thúc');
      notices.push(...(await this.completeAndRelease(manager, b, 'STUDENT')));
    });
    await this.send(notices);
    return this.detail(student, id);
  }

  /** Hoàn tất buổi học + giải ngân (dùng chung cho học viên xác nhận, job tự động, admin xử lý tranh chấp) */
  private async completeAndRelease(manager: EntityManager, b: Booking, by: 'STUDENT' | 'AUTO' | 'ADMIN'): Promise<Notice[]> {
    const r = await this.escrow.release(manager, b.id);
    await this.move(manager, b, S.COMPLETED, { completedAt: this.clock.now(), completedBy: by });
    await manager.increment(TutorProfile, { id: b.tutorProfileId }, 'completedLessons', 1);
    const how = by === 'STUDENT' ? 'Học viên đã xác nhận' : by === 'AUTO' ? 'Hết thời hạn khiếu nại' : 'Quản trị viên đã xử lý khiếu nại';
    return [
      {
        to: b.tutorUserId,
        email: true,
        payload: {
          type: NotificationType.WALLET,
          title: `Đã nhận ${r.tutorNet.toLocaleString('vi-VN')}đ cho buổi học ${b.code}`,
          body: `${how}. Học phí ${r.amount.toLocaleString('vi-VN')}đ, phí nền tảng ${r.commission.toLocaleString('vi-VN')}đ.`,
          link: '/app/wallet',
        },
      },
      {
        to: b.studentId,
        payload: { type: NotificationType.BOOKING, title: `Buổi học ${b.code} đã hoàn tất`, body: 'Hãy để lại đánh giá cho gia sư.', link: `/app/bookings/${b.id}` },
      },
    ];
  }

  private awaitingNotice(b: Booking): Notice {
    return {
      to: b.studentId,
      email: true,
      payload: {
        type: NotificationType.BOOKING,
        title: `Xác nhận buổi học ${b.code}`,
        body: `Buổi học đã kết thúc. Bấm "Xác nhận hoàn tất" nếu buổi học diễn ra tốt, hoặc mở khiếu nại trong ${this.configs.autoReleaseHours()} giờ nếu có vấn đề. Sau thời hạn này tiền tự chuyển cho gia sư.`,
        link: `/app/bookings/${b.id}`,
      },
    };
  }

  // ================================================================ Tranh chấp (gọi từ M5)

  /** Học viên mở khiếu nại: AWAITING_CONFIRMATION -> DISPUTED, đóng băng tiền */
  async markDisputed(manager: EntityManager, bookingId: number, studentId: number) {
    const b = await this.lock(manager, bookingId);
    if (b.studentId !== studentId) throw forbidden('Đây không phải buổi học của bạn');
    const now = this.clock.now();
    if (b.status === S.CONFIRMED && now >= b.endAt) await this.move(manager, b, S.AWAITING_CONFIRMATION);
    if (b.status !== S.AWAITING_CONFIRMATION) throw badRequest('CANNOT_DISPUTE', 'Chỉ khiếu nại được buổi học đã kết thúc và chưa xác nhận');
    if (now >= this.autoReleaseAt(b)) throw badRequest('DISPUTE_WINDOW_CLOSED', 'Đã quá thời hạn mở khiếu nại');
    await this.escrow.freeze(manager, b.id);
    await this.move(manager, b, S.DISPUTED);
    return b;
  }

  /** Admin xử lý: giải ngân (COMPLETED) hoặc hoàn tiền (REFUNDED) */
  async resolveDispute(manager: EntityManager, bookingId: number, decision: DisputeDecision): Promise<Notice[]> {
    const b = await this.lock(manager, bookingId);
    if (b.status !== S.DISPUTED) throw badRequest('NOT_DISPUTED', 'Buổi học không ở trạng thái tranh chấp');
    if (decision === DisputeDecision.RELEASE) return this.completeAndRelease(manager, b, 'ADMIN');
    const r = await this.escrow.refund(manager, b.id);
    await this.move(manager, b, S.REFUNDED, { refundAmount: r?.refundAmount ?? 0 });
    await this.setSlot(manager, b.slotId, SlotStatus.CANCELLED);
    return [];
  }

  // ================================================================ Job tự động

  async expireHolds() {
    const due = await this.bookings.find({ where: { status: S.PENDING_PAYMENT, holdExpiresAt: LessThanOrEqual(this.clock.now()) }, select: ['id'] });
    let n = 0;
    for (const { id } of due) {
      await this.ds.transaction(async (manager) => {
        const b = await this.lock(manager, id);
        if (b.status !== S.PENDING_PAYMENT || !b.holdExpiresAt || b.holdExpiresAt > this.clock.now()) return;
        await this.move(manager, b, S.EXPIRED, { cancelledBy: 'SYSTEM', cancelReason: 'Hết thời gian giữ chỗ chưa thanh toán' });
        await this.setSlot(manager, b.slotId, SlotStatus.AVAILABLE);
        n += 1;
      });
    }
    return n;
  }

  async markAwaiting() {
    const due = await this.bookings.find({ where: { status: S.CONFIRMED, endAt: LessThanOrEqual(this.clock.now()) }, select: ['id'] });
    let n = 0;
    for (const { id } of due) {
      const notices: Notice[] = [];
      await this.ds.transaction(async (manager) => {
        const b = await this.lock(manager, id);
        if (b.status !== S.CONFIRMED || b.endAt > this.clock.now()) return;
        await this.move(manager, b, S.AWAITING_CONFIRMATION);
        notices.push(this.awaitingNotice(b));
        n += 1;
      });
      await this.send(notices);
    }
    return n;
  }

  async autoComplete() {
    const cutoff = new Date(this.clock.now().getTime() - this.configs.autoReleaseHours() * 3_600_000);
    const due = await this.bookings.find({ where: { status: S.AWAITING_CONFIRMATION, endAt: LessThanOrEqual(cutoff) }, select: ['id'] });
    let n = 0;
    for (const { id } of due) {
      const notices: Notice[] = [];
      try {
        await this.ds.transaction(async (manager) => {
          const b = await this.lock(manager, id);
          if (b.status !== S.AWAITING_CONFIRMATION || this.autoReleaseAt(b) > this.clock.now()) return;
          notices.push(...(await this.completeAndRelease(manager, b, 'AUTO')));
          n += 1;
        });
        await this.send(notices);
      } catch (e: any) {
        this.logger.error(`Tự giải ngân buổi ${id} lỗi: ${e.message}`);
      }
    }
    return n;
  }

  // ================================================================ Truy vấn

  private baseQuery() {
    return this.bookings
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.student', 'st')
      .leftJoinAndSelect('b.tutorProfile', 'tp')
      .leftJoinAndSelect('tp.user', 'tu')
      .leftJoinAndSelect('b.subject', 'sj');
  }

  async listMine(viewer: AuthUser, q: BookingQueryDto) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.baseQuery();
    if (viewer.role === Role.TUTOR) qb.where('b.tutorUserId = :uid', { uid: viewer.id });
    else qb.where('b.studentId = :uid', { uid: viewer.id });
    if (q.status) qb.andWhere('b.status = :st', { st: q.status });
    if (q.scope === 'upcoming') qb.andWhere('b.status IN (:...ss)', { ss: [S.PENDING_PAYMENT, S.CONFIRMED] }).orderBy('b.startAt', 'ASC');
    else if (q.scope === 'action') qb.andWhere('b.status IN (:...ss)', { ss: [S.AWAITING_CONFIRMATION, S.DISPUTED] }).orderBy('b.endAt', 'ASC');
    else if (q.scope === 'past') qb.andWhere('b.status IN (:...ss)', { ss: [S.COMPLETED, S.CANCELLED, S.EXPIRED, S.REFUNDED] }).orderBy('b.startAt', 'DESC');
    else qb.orderBy('b.startAt', 'DESC');
    const [items, total] = await qb.skip(skip).take(take).getManyAndCount();
    return toPage(items.map((b) => this.toDto(b, viewer)), total, page, size);
  }

  async adminList(q: AdminBookingQueryDto) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.baseQuery();
    if (q.status) qb.andWhere('b.status = :st', { st: q.status });
    if (q.q) {
      qb.andWhere(
        new Brackets((w) => w.where('b.code LIKE :q', { q: `%${q.q}%` }).orWhere('st.fullName LIKE :q', { q: `%${q.q}%` }).orWhere('tu.fullName LIKE :q', { q: `%${q.q}%` })),
      );
    }
    const [items, total] = await qb.orderBy('b.id', 'DESC').skip(skip).take(take).getManyAndCount();
    return toPage(items.map((b) => this.toDto(b, { role: Role.ADMIN } as AuthUser)), total, page, size);
  }

  async statusCounts(where: { studentId?: number; tutorUserId?: number } = {}) {
    const qb = this.bookings.createQueryBuilder('b').select('b.status', 'status').addSelect('COUNT(*)', 'n').groupBy('b.status');
    if (where.studentId) qb.where('b.studentId = :id', { id: where.studentId });
    if (where.tutorUserId) qb.where('b.tutorUserId = :id', { id: where.tutorUserId });
    const rows = await qb.getRawMany();
    return Object.fromEntries(Object.values(S).map((s) => [s, Number(rows.find((r) => r.status === s)?.n || 0)]));
  }

  /** Chi tiết buổi học + khoản thanh toán + các thao tác người xem được phép làm */
  async detail(viewer: AuthUser, id: number) {
    const b = await this.baseQuery().where('b.id = :id', { id }).getOne();
    if (!b) throw notFound('Không tìm thấy buổi học');
    if (viewer.role !== Role.ADMIN && b.studentId !== viewer.id && b.tutorUserId !== viewer.id) throw forbidden('Bạn không thuộc buổi học này');

    const payment = await this.ds.getRepository(Payment).findOne({ where: { bookingId: id, status: In([PaymentStatus.SUCCESS]) } });
    const extras = await this.extras(id);
    return { ...this.toDto(b, viewer, !!extras.review), payment: payment ? this.paymentDto(payment) : null, ...extras, serverNow: this.clock.now() };
  }

  /** Thông tin phụ thuộc M2/M5 (đánh giá, tranh chấp, hội thoại) — đọc thẳng bảng để tránh phụ thuộc vòng */
  private async extras(bookingId: number) {
    const out: { review: any; dispute: any } = { review: null, dispute: null };
    if (this.ds.hasMetadata('Review')) {
      const [r] = await this.ds.query('SELECT id, rating, comment, tutorReply, repliedAt, createdAt FROM reviews WHERE bookingId = ? LIMIT 1', [bookingId]);
      out.review = r ? { ...r, rating: Number(r.rating) } : null;
    }
    if (this.ds.hasMetadata('Dispute')) {
      const [d] = await this.ds.query('SELECT id, category, status, description, resolutionNote, createdAt, resolvedAt FROM disputes WHERE bookingId = ? LIMIT 1', [bookingId]);
      out.dispute = d ?? null;
    }
    return out;
  }

  private paymentDto(p: Payment) {
    return {
      id: p.id,
      amount: p.amount,
      provider: p.provider,
      status: p.status,
      escrowStatus: p.escrowStatus,
      txnRef: p.txnRef,
      paidAt: p.paidAt,
      releasedAt: p.releasedAt,
      refundedAt: p.refundedAt,
      commissionAmount: p.commissionAmount,
      tutorAmount: p.tutorAmount,
      refundAmount: p.refundAmount,
    };
  }

  toDto(b: Booking, viewer: AuthUser, hasReview = false) {
    const now = this.clock.now();
    const isStudent = viewer.id === b.studentId;
    const isTutor = viewer.id === b.tutorUserId;
    const releaseAt = this.autoReleaseAt(b);
    const policy =
      b.status === S.CONFIRMED && now < b.startAt
        ? decideCancellation({ actor: isTutor ? 'TUTOR' : 'STUDENT', price: b.price, startAt: b.startAt, now, fullRefundHours: this.configs.fullRefundHours() })
        : null;
    return {
      id: b.id,
      code: b.code,
      status: b.status,
      startAt: b.startAt,
      endAt: b.endAt,
      price: b.price,
      note: b.note,
      subject: b.subject ? { id: b.subject.id, name: b.subject.name } : null,
      holdExpiresAt: b.holdExpiresAt,
      paidAt: b.paidAt,
      tutorMarkedTaughtAt: b.tutorMarkedTaughtAt,
      completedAt: b.completedAt,
      completedBy: b.completedBy,
      cancelledAt: b.cancelledAt,
      cancelledBy: b.cancelledBy,
      cancelReason: b.cancelReason,
      refundAmount: b.refundAmount,
      createdAt: b.createdAt,
      autoReleaseAt: [S.CONFIRMED, S.AWAITING_CONFIRMATION].includes(b.status) ? releaseAt : null,
      student: b.student ? { id: b.student.id, fullName: b.student.fullName, avatarUrl: b.student.avatarUrl } : null,
      tutor: b.tutorProfile
        ? { profileId: b.tutorProfile.id, userId: b.tutorUserId, fullName: b.tutorProfile.user?.fullName, avatarUrl: b.tutorProfile.user?.avatarUrl ?? null, hourlyRate: b.tutorProfile.hourlyRate }
        : null,
      actions: {
        canPay: isStudent && b.status === S.PENDING_PAYMENT && !!b.holdExpiresAt && b.holdExpiresAt > now,
        canCancel: (isStudent && b.status === S.PENDING_PAYMENT) || ((isStudent || isTutor) && b.status === S.CONFIRMED && now < b.startAt),
        cancelRefundPercent: b.status === S.PENDING_PAYMENT ? null : policy?.refundPercent ?? null,
        canMarkTaught: isTutor && [S.CONFIRMED, S.AWAITING_CONFIRMATION].includes(b.status) && now >= b.startAt && !b.tutorMarkedTaughtAt,
        canConfirm: isStudent && (b.status === S.AWAITING_CONFIRMATION || (b.status === S.CONFIRMED && now >= b.endAt)),
        canDispute: isStudent && (b.status === S.AWAITING_CONFIRMATION || (b.status === S.CONFIRMED && now >= b.endAt)) && now < releaseAt,
        canReview: isStudent && b.status === S.COMPLETED && !hasReview,
        canChat: isStudent || isTutor,
      },
    };
  }
}
