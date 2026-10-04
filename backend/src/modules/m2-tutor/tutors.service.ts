import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, In, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { badRequest, forbidden, notFound } from '../../common/app.exception';
import { NotificationType, Role, TeachingMode, TutorProfileStatus, UserStatus } from '../../common/enums';
import { skipTake } from '../../common/pagination';
import { ClockService } from '../m1-account/system-config/clock.service';
import { NotificationsService } from '../m5-communication/notifications.service';
import { CITIES, LEVELS, SUBJECT_SEED } from './catalog';
import { Subject } from './entities/subject.entity';
import { TutorCertificate } from './entities/tutor-certificate.entity';
import { TutorProfile } from './entities/tutor-profile.entity';
import { AdminTutorQueryDto, SearchTutorsDto, UpdateTutorProfileDto } from './tutor.dto';

/** Thông tin rút gọn hiển thị trong danh sách tìm kiếm */
export function toTutorCard(p: TutorProfile) {
  return {
    id: p.id,
    userId: p.userId,
    fullName: p.user?.fullName,
    avatarUrl: p.user?.avatarUrl ?? null,
    headline: p.headline,
    subjects: (p.subjects || []).map((s) => ({ id: s.id, name: s.name })),
    levels: p.levels || [],
    city: p.city,
    area: p.area,
    teachingMode: p.teachingMode,
    hourlyRate: p.hourlyRate,
    experienceYears: p.experienceYears,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    completedLessons: p.completedLessons,
    status: p.status,
  };
}

@Injectable()
export class TutorsService implements OnModuleInit {
  constructor(
    @InjectRepository(TutorProfile) private readonly profiles: Repository<TutorProfile>,
    @InjectRepository(Subject) private readonly subjects: Repository<Subject>,
    @InjectRepository(TutorCertificate) private readonly certs: Repository<TutorCertificate>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly notifications: NotificationsService,
    private readonly clock: ClockService,
  ) {}

  /** Tạo sẵn danh mục môn học nếu chưa có */
  async onModuleInit() {
    const have = new Set((await this.subjects.find()).map((s) => s.slug));
    let order = 0;
    for (const s of SUBJECT_SEED) {
      order += 1;
      if (!have.has(s.slug)) await this.subjects.save(this.subjects.create({ ...s, sortOrder: order }));
    }
  }

  meta() {
    return this.subjects.find({ order: { sortOrder: 'ASC' } }).then((subjects) => ({
      subjects: subjects.map((s) => ({ id: s.id, name: s.name, group: s.groupName })),
      levels: LEVELS,
      cities: Object.entries(CITIES).map(([name, areas]) => ({ name, areas })),
      teachingModes: Object.values(TeachingMode),
    }));
  }

  // ---------------------------------------------------------------- Gia sư tự quản lý hồ sơ

  /** Hồ sơ của gia sư đang đăng nhập (tự tạo bản nháp nếu chưa có) */
  async getOrCreateMine(userId: number) {
    let p = await this.profiles.findOne({ where: { userId }, relations: { user: true, subjects: true, certificates: true } });
    if (!p) {
      await this.profiles.save(this.profiles.create({ userId, levels: [], status: TutorProfileStatus.DRAFT }));
      p = await this.profiles.findOneOrFail({ where: { userId }, relations: { user: true, subjects: true, certificates: true } });
    }
    return p;
  }

  async mine(userId: number) {
    return this.toOwnerView(await this.getOrCreateMine(userId));
  }

  async updateMine(userId: number, dto: UpdateTutorProfileDto) {
    const p = await this.getOrCreateMine(userId);
    if (dto.city && dto.area && !CITIES[dto.city]?.includes(dto.area)) {
      throw badRequest('INVALID_AREA', 'Khu vực không thuộc thành phố đã chọn');
    }
    const { subjectIds, ...rest } = dto;
    Object.assign(p, rest);
    if (rest.hourlyRate !== undefined) p.hourlyRate = Math.round(rest.hourlyRate / 1000) * 1000;
    if (subjectIds) {
      const found = await this.subjects.findBy({ id: In(subjectIds) });
      if (found.length !== new Set(subjectIds).size) throw badRequest('INVALID_SUBJECT', 'Có môn học không tồn tại');
      p.subjects = found;
    }
    // Hồ sơ bị từ chối được sửa lại -> về nháp để gửi duyệt lại
    if (p.status === TutorProfileStatus.REJECTED) p.status = TutorProfileStatus.DRAFT;
    await this.profiles.save(p);
    return this.mine(userId);
  }

  /** Kiểm tra hồ sơ đủ thông tin trước khi gửi duyệt */
  missingFields(p: TutorProfile): string[] {
    const miss: string[] = [];
    if (!p.headline || p.headline.length < 10) miss.push('Tiêu đề hồ sơ');
    if (!p.bio || p.bio.length < 50) miss.push('Giới thiệu (tối thiểu 50 ký tự)');
    if (!p.subjects?.length) miss.push('Môn dạy');
    if (!p.levels?.length) miss.push('Cấp học');
    if (!p.hourlyRate) miss.push('Học phí mỗi giờ');
    if (!p.city) miss.push('Thành phố');
    if (!p.certificates?.length) miss.push('Ít nhất 1 chứng chỉ/bằng cấp');
    return miss;
  }

  async submitMine(userId: number) {
    const p = await this.getOrCreateMine(userId);
    if (p.status === TutorProfileStatus.PENDING) throw badRequest('ALREADY_PENDING', 'Hồ sơ đang chờ duyệt');
    if (p.status === TutorProfileStatus.APPROVED) throw badRequest('ALREADY_APPROVED', 'Hồ sơ đã được duyệt');
    const miss = this.missingFields(p);
    if (miss.length) throw badRequest('PROFILE_INCOMPLETE', `Hồ sơ còn thiếu: ${miss.join(', ')}`);
    p.status = TutorProfileStatus.PENDING;
    p.submittedAt = this.clock.now();
    p.rejectReason = null;
    await this.profiles.save(p);
    await this.notifications.notifyAdmins({
      type: NotificationType.TUTOR_PROFILE,
      title: `Hồ sơ gia sư mới chờ duyệt: ${p.user.fullName}`,
      link: `/app/admin/tutors?open=${p.id}`,
    });
    return this.mine(userId);
  }

  async addCertificate(userId: number, title: string, fileUrl: string, mimeType: string) {
    const p = await this.getOrCreateMine(userId);
    if ((p.certificates?.length || 0) >= 10) throw badRequest('TOO_MANY_FILES', 'Tối đa 10 chứng chỉ');
    await this.certs.save(this.certs.create({ tutorProfileId: p.id, title, fileUrl, mimeType }));
    return this.mine(userId);
  }

  async removeCertificate(userId: number, certId: number) {
    const p = await this.getOrCreateMine(userId);
    const c = await this.certs.findOneBy({ id: certId, tutorProfileId: p.id });
    if (!c) throw notFound('Không tìm thấy chứng chỉ');
    if (p.status === TutorProfileStatus.PENDING) throw badRequest('PROFILE_PENDING', 'Không xóa chứng chỉ khi hồ sơ đang chờ duyệt');
    await this.certs.delete({ id: c.id });
    return this.mine(userId);
  }

  // ---------------------------------------------------------------- Admin duyệt hồ sơ

  async adminList(q: AdminTutorQueryDto) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.profiles
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('p.subjects', 's')
      .leftJoinAndSelect('p.certificates', 'c');
    if (q.status) qb.andWhere('p.status = :st', { st: q.status });
    if (q.q) qb.andWhere(new Brackets((w) => w.where('u.fullName LIKE :q', { q: `%${q.q}%` }).orWhere('u.email LIKE :q', { q: `%${q.q}%` })));
    qb.orderBy('p.submittedAt', 'DESC').addOrderBy('p.id', 'DESC').skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return toPage(items.map((p) => this.toOwnerView(p)), total, page, size);
  }

  async adminCounts() {
    const rows = await this.profiles.createQueryBuilder('p').select('p.status', 'status').addSelect('COUNT(*)', 'n').groupBy('p.status').getRawMany();
    const out: Record<string, number> = { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    rows.forEach((r) => (out[r.status] = Number(r.n)));
    return out;
  }

  async approve(id: number) {
    const p = await this.profiles.findOne({ where: { id }, relations: { user: true, subjects: true, certificates: true } });
    if (!p) throw notFound('Không tìm thấy hồ sơ');
    if (p.status !== TutorProfileStatus.PENDING) throw badRequest('NOT_PENDING', 'Chỉ duyệt được hồ sơ đang chờ duyệt');
    p.status = TutorProfileStatus.APPROVED;
    p.approvedAt = this.clock.now();
    p.rejectReason = null;
    await this.profiles.save(p);
    await this.notifications.notify(
      p.userId,
      { type: NotificationType.TUTOR_PROFILE, title: 'Hồ sơ gia sư đã được duyệt', body: 'Hồ sơ của bạn đã hiển thị trong tìm kiếm. Hãy mở lịch trống để nhận học viên.', link: '/app/tutor/schedule' },
      { email: true },
    );
    return this.toOwnerView(p);
  }

  async reject(id: number, reason: string) {
    const p = await this.profiles.findOne({ where: { id }, relations: { user: true, subjects: true, certificates: true } });
    if (!p) throw notFound('Không tìm thấy hồ sơ');
    if (p.status !== TutorProfileStatus.PENDING) throw badRequest('NOT_PENDING', 'Chỉ từ chối được hồ sơ đang chờ duyệt');
    p.status = TutorProfileStatus.REJECTED;
    p.rejectReason = reason;
    await this.profiles.save(p);
    await this.notifications.notify(
      p.userId,
      { type: NotificationType.TUTOR_PROFILE, title: 'Hồ sơ gia sư bị từ chối', body: `Lý do: ${reason}. Bạn có thể sửa hồ sơ và gửi duyệt lại.`, link: '/app/tutor/profile' },
      { email: true },
    );
    return this.toOwnerView(p);
  }

  // ---------------------------------------------------------------- Tìm kiếm công khai

  async search(q: SearchTutorsDto) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.profiles
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.user', 'u')
      .leftJoinAndSelect('p.subjects', 's')
      .where('p.status = :approved', { approved: TutorProfileStatus.APPROVED })
      .andWhere('u.status = :active', { active: UserStatus.ACTIVE })
      .andWhere('u.deletedAt IS NULL');

    if (q.subjectId) {
      qb.andWhere('EXISTS (SELECT 1 FROM tutor_subjects ts WHERE ts.tutorProfileId = p.id AND ts.subjectId = :sid)', { sid: q.subjectId });
    }
    if (q.level) qb.andWhere('FIND_IN_SET(:lv, p.levels) > 0', { lv: q.level });
    if (q.city) qb.andWhere('p.city = :city', { city: q.city });
    if (q.area) qb.andWhere('p.area = :area', { area: q.area });
    if (q.mode) qb.andWhere('p.teachingMode IN (:...modes)', { modes: [q.mode, TeachingMode.BOTH] });
    if (q.minPrice !== undefined) qb.andWhere('p.hourlyRate >= :minP', { minP: q.minPrice });
    if (q.maxPrice !== undefined) qb.andWhere('p.hourlyRate <= :maxP', { maxP: q.maxPrice });
    if (q.minRating !== undefined) qb.andWhere('p.ratingAvg >= :minR AND p.ratingCount > 0', { minR: q.minRating });
    if (q.q) {
      qb.andWhere(new Brackets((w) => w.where('u.fullName LIKE :kw', { kw: `%${q.q}%` }).orWhere('p.headline LIKE :kw', { kw: `%${q.q}%` })));
    }

    switch (q.sort) {
      case 'price_asc': qb.orderBy('p.hourlyRate', 'ASC'); break;
      case 'price_desc': qb.orderBy('p.hourlyRate', 'DESC'); break;
      case 'newest': qb.orderBy('p.approvedAt', 'DESC'); break;
      default: qb.orderBy('p.ratingAvg', 'DESC').addOrderBy('p.ratingCount', 'DESC');
    }
    qb.addOrderBy('p.id', 'ASC').skip(skip).take(take);

    const [items, total] = await qb.getManyAndCount();
    const next = await this.nextSlots(items.map((p) => p.id));
    return toPage(items.map((p) => ({ ...toTutorCard(p), nextSlotAt: next.get(p.id) ?? null })), total, page, size);
  }

  /** Buổi trống gần nhất của từng gia sư (để hiển thị "Còn trống từ ...") */
  async nextSlots(profileIds: number[]): Promise<Map<number, Date>> {
    const map = new Map<number, Date>();
    if (!profileIds.length) return map;
    const hasSlots = this.ds.hasMetadata('Slot');
    if (!hasSlots) return map;
    const rows = await this.ds.query(
      `SELECT tutorProfileId AS id, MIN(startAt) AS nextAt FROM slots
       WHERE status = 'AVAILABLE' AND startAt > ? AND tutorProfileId IN (${profileIds.map(() => '?').join(',')})
       GROUP BY tutorProfileId`,
      [this.clock.now(), ...profileIds],
    );
    rows.forEach((r: any) => map.set(Number(r.id), new Date(r.nextAt)));
    return map;
  }

  /** Trang chi tiết: công khai nếu đã duyệt; chủ hồ sơ và admin xem được mọi trạng thái */
  async detail(id: number, viewer?: { id: number; role: Role }) {
    const p = await this.profiles.findOne({ where: { id }, relations: { user: true, subjects: true, certificates: true } });
    if (!p) throw notFound('Không tìm thấy gia sư');
    const isOwner = viewer && viewer.id === p.userId;
    const isAdmin = viewer?.role === Role.ADMIN;
    if (p.status !== TutorProfileStatus.APPROVED && !isOwner && !isAdmin) throw notFound('Không tìm thấy gia sư');
    if (p.user.status !== UserStatus.ACTIVE && !isAdmin) throw notFound('Gia sư không còn hoạt động');

    const dist = await this.ds.query(`SELECT rating, COUNT(*) AS n FROM reviews WHERE tutorProfileId = ? GROUP BY rating`, [p.id]);
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach((r: any) => (ratingDistribution[Number(r.rating)] = Number(r.n)));
    const next = await this.nextSlots([p.id]);

    return {
      ...toTutorCard(p),
      bio: p.bio,
      education: p.education,
      memberSince: p.user.createdAt,
      approvedAt: p.approvedAt,
      nextSlotAt: next.get(p.id) ?? null,
      // Công khai chỉ hiện tên chứng chỉ; file gốc chỉ chủ hồ sơ và admin xem được
      certificates: (p.certificates || []).map((c) => ({ id: c.id, title: c.title, ...(isOwner || isAdmin ? { fileUrl: c.fileUrl, mimeType: c.mimeType } : {}) })),
      ratingDistribution,
    };
  }

  async findByUserId(userId: number) {
    return this.profiles.findOne({ where: { userId } });
  }

  async assertApprovedTutor(userId: number) {
    const p = await this.profiles.findOne({ where: { userId } });
    if (!p) throw forbidden('Bạn chưa có hồ sơ gia sư');
    return p;
  }

  /** Tính lại điểm trung bình sau khi có đánh giá mới */
  async recalcRating(tutorProfileId: number) {
    const [row] = await this.ds.query(`SELECT AVG(rating) AS avg, COUNT(*) AS n FROM reviews WHERE tutorProfileId = ?`, [tutorProfileId]);
    await this.profiles.update({ id: tutorProfileId }, { ratingAvg: row.avg ? Math.round(Number(row.avg) * 100) / 100 : 0, ratingCount: Number(row.n) });
  }

  toOwnerView(p: TutorProfile) {
    return {
      ...toTutorCard(p),
      email: p.user?.email,
      phone: p.user?.phone,
      bio: p.bio,
      education: p.education,
      rejectReason: p.rejectReason,
      submittedAt: p.submittedAt,
      approvedAt: p.approvedAt,
      certificates: (p.certificates || []).map((c) => ({ id: c.id, title: c.title, fileUrl: c.fileUrl, mimeType: c.mimeType, createdAt: c.createdAt })),
      missing: this.missingFields(p),
    };
  }
}
