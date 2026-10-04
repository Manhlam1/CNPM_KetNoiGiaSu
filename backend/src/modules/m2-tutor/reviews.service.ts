import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, forbidden, notFound } from '../../common/app.exception';
import { AuthUser } from '../../common/decorators';
import { BookingStatus, NotificationType } from '../../common/enums';
import { skipTake } from '../../common/pagination';
import { Booking } from '../m3-booking/entities/booking.entity';
import { NotificationsService } from '../m5-communication/notifications.service';
import { Review } from './entities/review.entity';
import { TutorProfile } from './entities/tutor-profile.entity';
import { TutorsService } from './tutors.service';

/** Đánh giá: chỉ buổi học COMPLETED, mỗi buổi 1 lần; gia sư phản hồi 1 lần */
@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly tutors: TutorsService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(student: AuthUser, dto: { bookingId: number; rating: number; comment?: string }) {
    const b = await this.ds.getRepository(Booking).findOneBy({ id: dto.bookingId });
    if (!b) throw notFound('Không tìm thấy buổi học');
    if (b.studentId !== student.id) throw forbidden('Bạn chỉ đánh giá được buổi học của mình');
    if (b.status !== BookingStatus.COMPLETED) throw badRequest('NOT_COMPLETED', 'Chỉ đánh giá được buổi học đã hoàn tất');
    if (await this.reviews.existsBy({ bookingId: b.id })) throw badRequest('ALREADY_REVIEWED', 'Bạn đã đánh giá buổi học này');
    const r = await this.reviews.save(
      this.reviews.create({ bookingId: b.id, tutorProfileId: b.tutorProfileId, studentId: student.id, rating: dto.rating, comment: dto.comment?.trim() || null }),
    );
    await this.tutors.recalcRating(b.tutorProfileId);
    await this.notifications.notify(b.tutorUserId, {
      type: NotificationType.REVIEW,
      title: `${student.fullName} chấm ${dto.rating}/5 cho buổi ${b.code}`,
      body: dto.comment?.slice(0, 200),
      link: `/app/bookings/${b.id}`,
    });
    return r;
  }

  async reply(tutor: AuthUser, id: number, reply: string) {
    const r = await this.reviews.findOneBy({ id });
    if (!r) throw notFound('Không tìm thấy đánh giá');
    const p = await this.ds.getRepository(TutorProfile).findOneBy({ id: r.tutorProfileId });
    if (!p || p.userId !== tutor.id) throw forbidden('Đây không phải đánh giá về bạn');
    if (r.tutorReply) throw badRequest('ALREADY_REPLIED', 'Bạn đã phản hồi đánh giá này');
    r.tutorReply = reply.trim();
    r.repliedAt = new Date();
    await this.reviews.save(r);
    await this.notifications.notify(r.studentId, { type: NotificationType.REVIEW, title: 'Gia sư đã phản hồi đánh giá của bạn', link: `/app/bookings/${r.bookingId}` });
    return r;
  }

  async listForTutor(tutorProfileId: number, q: { page?: number; size?: number }) {
    const { page, size, skip, take } = skipTake(q);
    const [items, total] = await this.reviews.findAndCount({ where: { tutorProfileId }, relations: { student: true }, order: { id: 'DESC' }, skip, take });
    return toPage(
      items.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        tutorReply: r.tutorReply,
        repliedAt: r.repliedAt,
        createdAt: r.createdAt,
        student: { fullName: r.student?.fullName, avatarUrl: r.student?.avatarUrl },
      })),
      total,
      page,
      size,
    );
  }

  /** Đánh giá chưa phản hồi của gia sư đang đăng nhập */
  async unrepliedCount(tutorUserId: number) {
    const p = await this.ds.getRepository(TutorProfile).findOneBy({ userId: tutorUserId });
    if (!p) return 0;
    return this.reviews.countBy({ tutorProfileId: p.id, tutorReply: IsNull() });
  }
}
