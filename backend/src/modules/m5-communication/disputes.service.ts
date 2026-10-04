import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, forbidden, notFound } from '../../common/app.exception';
import { AuthUser } from '../../common/decorators';
import { DisputeCategory, DisputeDecision, DisputeStatus, NotificationType, PaymentStatus, Role } from '../../common/enums';
import { skipTake } from '../../common/pagination';
import { ClockService } from '../m1-account/system-config/clock.service';
import { BookingsService } from '../m3-booking/bookings.service';
import { Booking } from '../m3-booking/entities/booking.entity';
import { Payment } from '../m4-payment/entities/payment.entity';
import { ChatService } from './chat.service';
import { Dispute } from './entities/dispute.entity';
import { NotificationsService } from './notifications.service';

/**
 * Tranh chấp:
 *  học viên mở (trong hạn khiếu nại) -> buổi học DISPUTED, tiền FROZEN
 *  gia sư phản hồi (tùy chọn)
 *  admin xem tin nhắn + bằng chứng -> giải ngân (COMPLETED) hoặc hoàn tiền (REFUNDED)
 */
@Injectable()
export class DisputesService {
  constructor(
    @InjectRepository(Dispute) private readonly repo: Repository<Dispute>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly bookings: BookingsService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly clock: ClockService,
  ) {}

  async open(student: AuthUser, dto: { bookingId: number; category: DisputeCategory; description: string }, evidenceUrls: string[]) {
    const exists = await this.repo.findOneBy({ bookingId: dto.bookingId });
    if (exists) throw badRequest('DISPUTE_EXISTS', 'Buổi học này đã có khiếu nại');
    const d = await this.ds.transaction(async (manager) => {
      await this.bookings.markDisputed(manager, dto.bookingId, student.id);
      return manager.save(
        manager.create(Dispute, {
          bookingId: dto.bookingId,
          openedById: student.id,
          category: dto.category,
          description: dto.description.trim(),
          evidenceUrls: evidenceUrls.length ? evidenceUrls : null,
          status: DisputeStatus.OPEN,
        }),
      );
    });
    const b = await this.ds.getRepository(Booking).findOneByOrFail({ id: dto.bookingId });
    await this.notifications.notify(
      b.tutorUserId,
      {
        type: NotificationType.DISPUTE,
        title: `Học viên khiếu nại buổi học ${b.code}`,
        body: 'Học phí đang được đóng băng. Bạn có thể gửi phản hồi để quản trị viên xem xét.',
        link: `/app/disputes/${d.id}`,
      },
      { email: true },
    );
    await this.notifications.notifyAdmins({ type: NotificationType.DISPUTE, title: `Khiếu nại mới cho buổi ${b.code}`, link: `/app/admin/disputes/${d.id}` });
    return this.detail(student, d.id);
  }

  async respond(tutor: AuthUser, id: number, response: string) {
    const d = await this.repo.findOne({ where: { id }, relations: { booking: true } });
    if (!d) throw notFound('Không tìm thấy khiếu nại');
    if (d.booking.tutorUserId !== tutor.id) throw forbidden('Khiếu nại không thuộc buổi dạy của bạn');
    if (d.status !== DisputeStatus.OPEN) throw badRequest('DISPUTE_CLOSED', 'Khiếu nại đã được xử lý');
    d.tutorResponse = response.trim();
    d.tutorRespondedAt = this.clock.now();
    await this.repo.save(d);
    await this.notifications.notifyAdmins({ type: NotificationType.DISPUTE, title: `Gia sư đã phản hồi khiếu nại ${d.booking.code}`, link: `/app/admin/disputes/${d.id}` });
    return this.detail(tutor, id);
  }

  async resolve(admin: AuthUser, id: number, decision: DisputeDecision, note: string) {
    let notices: any[] = [];
    const d = await this.ds.transaction(async (manager) => {
      const dispute = await manager.findOne(Dispute, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!dispute) throw notFound('Không tìm thấy khiếu nại');
      if (dispute.status !== DisputeStatus.OPEN) throw badRequest('DISPUTE_CLOSED', 'Khiếu nại đã được xử lý');
      notices = await this.bookings.resolveDispute(manager, dispute.bookingId, decision);
      dispute.status = decision === DisputeDecision.RELEASE ? DisputeStatus.RESOLVED_RELEASE : DisputeStatus.RESOLVED_REFUND;
      dispute.resolutionNote = note.trim();
      dispute.resolvedById = admin.id;
      dispute.resolvedAt = this.clock.now();
      return manager.save(dispute);
    });
    for (const n of notices) await this.notifications.notify(n.to, n.payload, { email: n.email });
    const b = await this.ds.getRepository(Booking).findOneByOrFail({ id: d.bookingId });
    const outcome = decision === DisputeDecision.RELEASE ? 'Học phí được chuyển cho gia sư.' : 'Học phí được hoàn cho học viên.';
    await this.notifications.notify(
      [b.studentId, b.tutorUserId],
      { type: NotificationType.DISPUTE, title: `Khiếu nại buổi học ${b.code} đã được xử lý`, body: `${outcome} Ghi chú: ${note}`, link: `/app/disputes/${d.id}` },
      { email: true },
    );
    return this.detail(admin, id);
  }

  async mine(viewer: AuthUser, q: { page?: number; size?: number }) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.repo.createQueryBuilder('d').innerJoinAndSelect('d.booking', 'b').leftJoinAndSelect('b.student', 'st').leftJoinAndSelect('b.tutorProfile', 'tp').leftJoinAndSelect('tp.user', 'tu');
    if (viewer.role === Role.TUTOR) qb.where('b.tutorUserId = :uid', { uid: viewer.id });
    else qb.where('d.openedById = :uid', { uid: viewer.id });
    const [items, total] = await qb.orderBy('d.id', 'DESC').skip(skip).take(take).getManyAndCount();
    return toPage(items.map((d) => this.summary(d)), total, page, size);
  }

  async adminList(q: { page?: number; size?: number; status?: DisputeStatus }) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.repo.createQueryBuilder('d').innerJoinAndSelect('d.booking', 'b').leftJoinAndSelect('b.student', 'st').leftJoinAndSelect('b.tutorProfile', 'tp').leftJoinAndSelect('tp.user', 'tu');
    if (q.status) qb.where('d.status = :s', { s: q.status });
    const [items, total] = await qb.orderBy('d.id', 'DESC').skip(skip).take(take).getManyAndCount();
    return toPage(items.map((d) => this.summary(d)), total, page, size);
  }

  async detail(viewer: AuthUser, id: number) {
    const d = await this.repo.findOne({ where: { id }, relations: { booking: { student: true, tutorProfile: { user: true }, subject: true } } });
    if (!d) throw notFound('Không tìm thấy khiếu nại');
    const b = d.booking;
    const isAdmin = viewer.role === Role.ADMIN;
    if (!isAdmin && b.studentId !== viewer.id && b.tutorUserId !== viewer.id) throw forbidden('Bạn không thuộc khiếu nại này');
    const payment = await this.ds.getRepository(Payment).findOneBy({ bookingId: b.id, status: PaymentStatus.SUCCESS });
    return {
      ...this.summary(d),
      description: d.description,
      evidenceUrls: d.evidenceUrls || [],
      tutorResponse: d.tutorResponse,
      tutorRespondedAt: d.tutorRespondedAt,
      resolutionNote: d.resolutionNote,
      resolvedAt: d.resolvedAt,
      booking: {
        id: b.id,
        code: b.code,
        status: b.status,
        startAt: b.startAt,
        endAt: b.endAt,
        price: b.price,
        subject: b.subject?.name ?? null,
        tutorMarkedTaughtAt: b.tutorMarkedTaughtAt,
      },
      payment: payment ? { amount: payment.amount, escrowStatus: payment.escrowStatus, paidAt: payment.paidAt } : null,
      // Admin xem toàn bộ tin nhắn giữa hai bên để làm bằng chứng
      conversation: isAdmin ? await this.chat.between(b.studentId, b.tutorUserId) : null,
      canRespond: viewer.id === b.tutorUserId && d.status === DisputeStatus.OPEN,
      canResolve: isAdmin && d.status === DisputeStatus.OPEN,
    };
  }

  private summary(d: Dispute) {
    const b = d.booking;
    return {
      id: d.id,
      bookingId: d.bookingId,
      bookingCode: b?.code,
      category: d.category,
      status: d.status,
      createdAt: d.createdAt,
      student: b?.student ? { id: b.student.id, fullName: b.student.fullName } : null,
      tutor: b?.tutorProfile?.user ? { id: b.tutorProfile.user.id, fullName: b.tutorProfile.user.fullName } : null,
      amount: b?.price,
      hasTutorResponse: !!d.tutorResponse,
    };
  }
}
