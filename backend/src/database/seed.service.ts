import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { DataSource, EntityManager } from 'typeorm';
import { AuthUser } from '../common/decorators';
import {
  AvailabilityRuleType, BookingStatus as S, DisputeCategory, DisputeStatus, EscrowStatus, NotificationType, PaymentProvider,
  PaymentStatus, Role, SlotStatus, TeachingMode, TutorProfileStatus, UserStatus,
} from '../common/enums';
import { roundTo } from '../common/money';
import { cfg } from '../config/configuration';
import { User } from '../modules/m1-account/entities/user.entity';
import { ClockService } from '../modules/m1-account/system-config/clock.service';
import { SystemConfigService } from '../modules/m1-account/system-config/system-config.service';
import { CITIES } from '../modules/m2-tutor/catalog';
import { Review } from '../modules/m2-tutor/entities/review.entity';
import { Subject } from '../modules/m2-tutor/entities/subject.entity';
import { TutorCertificate } from '../modules/m2-tutor/entities/tutor-certificate.entity';
import { TutorProfile } from '../modules/m2-tutor/entities/tutor-profile.entity';
import { TutorsService } from '../modules/m2-tutor/tutors.service';
import { AvailabilityService } from '../modules/m3-booking/availability.service';
import { BookingsService } from '../modules/m3-booking/bookings.service';
import { Booking } from '../modules/m3-booking/entities/booking.entity';
import { Slot } from '../modules/m3-booking/entities/slot.entity';
import { Payment } from '../modules/m4-payment/entities/payment.entity';
import { EscrowService } from '../modules/m4-payment/escrow.service';
import { PaymentsService } from '../modules/m4-payment/payments.service';
import { WalletService } from '../modules/m4-payment/wallet.service';
import { WithdrawalsService } from '../modules/m4-payment/withdrawals.service';
import { ChatService } from '../modules/m5-communication/chat.service';
import { Dispute } from '../modules/m5-communication/entities/dispute.entity';
import { NotificationsService } from '../modules/m5-communication/notifications.service';
import { CHAT_SCRIPT, DEM, EDUCATION, HO, METHODS, RESULTS, REVIEW_COMMENTS, rng, TEN } from './seed-data';

const PASSWORD = '123456';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export const DEMO_ACCOUNTS = {
  admin: 'admin@tutorhub.vn',
  tutor: 'giasu@tutorhub.vn',
  student: 'hocvien@tutorhub.vn',
};

/**
 * Dữ liệu mẫu: 1 admin, 50 gia sư, 30 học viên, buổi học ở mọi trạng thái, đánh giá,
 * hội thoại, giao dịch ví. Tiền đi qua EscrowService/WalletService thật nên sổ cái luôn khớp.
 * Tự chạy khi khởi động nếu bảng users trống (SEED_ON_START=true), hoặc chạy tay: npm run seed
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Seed');
  private r = rng();

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly clock: ClockService,
    private readonly configs: SystemConfigService,
    private readonly tutors: TutorsService,
    private readonly availability: AvailabilityService,
    private readonly bookings: BookingsService,
    private readonly payments: PaymentsService,
    private readonly escrow: EscrowService,
    private readonly wallets: WalletService,
    private readonly withdrawals: WithdrawalsService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
  ) {}

  async onApplicationBootstrap() {
    if (!cfg().seedOnStart || process.env.SEED_RUNNER === '1') return;
    const n = await this.ds.getRepository(User).count({ withDeleted: true });
    if (n === 0) {
      this.logger.log('Database trống -> nạp dữ liệu mẫu...');
      await this.run();
    }
  }

  async run() {
    const t0 = Date.now();
    this.r = rng();
    await this.clock.reset();
    await this.configs.init();
    await this.tutors.onModuleInit(); // môn học
    await this.wallets.ensureSystemWallets();

    const hash = await bcrypt.hash(PASSWORD, 10);
    const users = this.ds.getRepository(User);
    const mkUser = (email: string, fullName: string, role: Role, phone?: string) =>
      users.save(users.create({ email, fullName, role, passwordHash: hash, status: UserStatus.ACTIVE, phone: phone ?? `09${this.r.int(10000000, 99999999)}` }));

    // ---------------------------------------------------------------- Tài khoản
    const admin = await mkUser(DEMO_ACCOUNTS.admin, 'Quản trị TutorHub', Role.ADMIN, '0900000000');
    const demoTutor = await mkUser(DEMO_ACCOUNTS.tutor, 'Nguyễn Thu Trang', Role.TUTOR, '0912000111');
    const demoStudent = await mkUser(DEMO_ACCOUNTS.student, 'Phạm Minh Khôi', Role.STUDENT, '0987000222');
    const tutorsU: User[] = [demoTutor];
    const studentsU: User[] = [demoStudent];
    for (let i = 1; i <= 49; i++) tutorsU.push(await mkUser(`giasu${String(i).padStart(2, '0')}@tutorhub.vn`, this.name(), Role.TUTOR));
    for (let i = 1; i <= 29; i++) studentsU.push(await mkUser(`hocvien${String(i).padStart(2, '0')}@tutorhub.vn`, this.name(), Role.STUDENT));
    // Một vài tài khoản để demo màn hình quản lý người dùng
    const locked = studentsU[29 - 1];
    await users.update({ id: locked.id }, { status: UserStatus.LOCKED });

    // ---------------------------------------------------------------- Hồ sơ gia sư
    const subjects = await this.ds.getRepository(Subject).find();
    const byGroup = (g: string) => subjects.filter((s) => s.groupName === g);
    const certFile = this.ensureCertificateFile();
    const profiles: TutorProfile[] = [];
    for (let i = 0; i < tutorsU.length; i++) {
      const u = tutorsU[i];
      const isDemo = i === 0;
      const group = isDemo ? 'Phổ thông' : this.r.pick(['Phổ thông', 'Phổ thông', 'Phổ thông', 'Ngoại ngữ', 'Ngoại ngữ', 'Tin học', 'Năng khiếu']);
      const subs = isDemo ? subjects.filter((s) => ['toan', 'vat-ly'].includes(s.slug)) : this.r.sample(byGroup(group), this.r.int(1, Math.min(3, byGroup(group).length)));
      const city = isDemo ? 'Hà Nội' : this.r.pick(['Hà Nội', 'Hà Nội', 'Hà Nội', 'TP. Hồ Chí Minh', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng']);
      const exp = isDemo ? 6 : this.r.int(1, 12);
      const rate = isDemo ? 250_000 : roundTo(this.r.int(10, 50) * 10_000, 10_000);
      const levels =
        group === 'Phổ thông'
          ? this.r.sample(['THCS', 'THPT', 'Luyện thi đại học', 'Tiểu học'], this.r.int(1, 3))
          : group === 'Ngoại ngữ'
            ? this.r.sample(['THPT', 'Đại học', 'Người đi làm'], this.r.int(1, 3))
            : this.r.sample(['THCS', 'THPT', 'Đại học', 'Người đi làm'], this.r.int(1, 2));
      const status =
        isDemo || i < 46 ? TutorProfileStatus.APPROVED : i < 48 ? TutorProfileStatus.PENDING : i === 48 ? TutorProfileStatus.REJECTED : TutorProfileStatus.DRAFT;
      const subjName = subs.map((s) => s.name).join(', ');
      const headline = isDemo
        ? 'Gia sư Toán, Vật lý THPT - 6 năm luyện thi đại học'
        : group === 'Ngoại ngữ'
          ? `${subjName} giao tiếp và luyện thi, ${exp} năm kinh nghiệm`
          : group === 'Năng khiếu'
            ? `Dạy ${subjName} từ cơ bản cho người mới bắt đầu`
            : `Gia sư ${subjName} ${levels[0]}, ${exp} năm kinh nghiệm`;
      const bio = isDemo
        ? 'Mình là giáo viên Toán THPT, đã dạy kèm 6 năm và đồng hành cùng hơn 60 học viên ôn thi đại học. Mỗi buổi học đều bắt đầu bằng 10 phút kiểm tra bài cũ, sau đó học chuyên đề và kết thúc bằng phiếu bài tập về nhà. Mình gửi nhận xét sau mỗi buổi để học viên và phụ huynh nắm được tiến độ.\n\nThế mạnh: hàm số, hình học không gian, dao động và sóng (Vật lý 12).'
        : `${this.r.pick(['Mình', 'Tôi'])} có ${exp} năm kinh nghiệm dạy ${subjName.toLowerCase()} cho học viên ${levels.join(', ')}. ${this.r.pick(METHODS)} ${this.r.pick(METHODS)} ${this.r.pick(RESULTS)}`;
      const p = await this.ds.getRepository(TutorProfile).save(
        this.ds.getRepository(TutorProfile).create({
          userId: u.id,
          headline,
          bio,
          education: isDemo ? 'Cử nhân Sư phạm Toán - ĐH Sư phạm Hà Nội' : this.r.pick(EDUCATION[group]),
          experienceYears: exp,
          hourlyRate: rate,
          teachingMode: isDemo ? TeachingMode.BOTH : this.r.pick([TeachingMode.ONLINE, TeachingMode.OFFLINE, TeachingMode.BOTH, TeachingMode.BOTH]),
          city,
          area: isDemo ? 'Cầu Giấy' : this.r.pick(CITIES[city]),
          levels,
          subjects: subs,
          status,
          submittedAt: status === TutorProfileStatus.DRAFT ? null : new Date(Date.now() - this.r.int(60, 200) * DAY),
          approvedAt: status === TutorProfileStatus.APPROVED ? new Date(Date.now() - this.r.int(40, 180) * DAY) : null,
          rejectReason: status === TutorProfileStatus.REJECTED ? 'Ảnh chứng chỉ bị mờ, vui lòng tải lại bản rõ hơn.' : null,
        }),
      );
      if (status !== TutorProfileStatus.DRAFT) {
        await this.ds.getRepository(TutorCertificate).save(
          this.ds.getRepository(TutorCertificate).create({ tutorProfileId: p.id, title: isDemo ? 'Bằng cử nhân Sư phạm Toán' : `Chứng chỉ ${subs[0].name}`, fileUrl: certFile, mimeType: 'application/pdf' }),
        );
      }
      profiles.push(p);
    }
    const approved = profiles.filter((p) => p.status === TutorProfileStatus.APPROVED);
    const demoProfile = profiles[0];

    // ---------------------------------------------------------------- Lịch trống
    const demoRules = [
      { type: AvailabilityRuleType.WEEKLY, dayOfWeek: 2, startTime: '19:00', endTime: '21:00' },
      { type: AvailabilityRuleType.WEEKLY, dayOfWeek: 4, startTime: '19:00', endTime: '21:00' },
      { type: AvailabilityRuleType.WEEKLY, dayOfWeek: 6, startTime: '08:00', endTime: '10:00' },
      { type: AvailabilityRuleType.WEEKLY, dayOfWeek: 6, startTime: '14:00', endTime: '16:00' },
      { type: AvailabilityRuleType.WEEKLY, dayOfWeek: 7, startTime: '09:00', endTime: '10:30' },
    ];
    for (const rule of demoRules) await this.availability.createRule(demoTutor.id, rule);
    const times = [['08:00', '10:00'], ['14:00', '15:30'], ['17:30', '19:00'], ['19:00', '21:00'], ['20:00', '21:30']];
    for (const p of approved.slice(1)) {
      const used = new Set<string>();
      for (let k = 0; k < this.r.int(2, 4); k++) {
        const dow = this.r.int(1, 7);
        const [st, et] = this.r.pick(times);
        const key = `${dow}-${st}`;
        if (used.has(key)) continue;
        used.add(key);
        try {
          await this.availability.createRule(p.userId, { type: AvailabilityRuleType.WEEKLY, dayOfWeek: dow, startTime: st, endTime: et });
        } catch {
          /* trùng giờ thì bỏ qua */
        }
      }
    }

    // ---------------------------------------------------------------- Lịch sử buổi học (đã qua)
    const now = Date.now();
    const studentPool = studentsU.slice(0, 28);
    let completed = 0;
    // Buổi đã hoàn tất trải đều 5 tháng gần nhất -> biểu đồ doanh thu có dữ liệu
    for (const p of approved) {
      const isDemo = p.id === demoProfile.id;
      const n = isDemo ? 14 : this.r.int(0, 5);
      for (let k = 0; k < n; k++) {
        const daysAgo = this.r.int(3, 150);
        const student = isDemo && k < 4 ? demoStudent : this.r.pick(studentPool);
        const start = this.lessonStart(now - daysAgo * DAY);
        const hours = this.r.pick([1.5, 2, 2]);
        await this.historical(p, student, start, hours, 'COMPLETED', this.r.chance(0.8));
        completed++;
      }
    }

    // Các trạng thái đặc biệt để demo
    const other = approved[3];
    // Chờ xác nhận: học viên demo vừa học xong 3 giờ trước
    await this.historical(demoProfile, demoStudent, this.lessonStart(now - DAY, 14), 2, 'AWAITING');
    await this.historical(other, studentsU[5], this.lessonStart(now - DAY, 19), 2, 'AWAITING');
    // Đang tranh chấp (tiền đóng băng) — gia sư demo có thể phản hồi, admin xử lý
    await this.historical(demoProfile, studentsU[7], this.lessonStart(now - 2 * DAY, 19), 2, 'DISPUTED');
    // Tranh chấp đã xử lý: hoàn tiền
    await this.historical(approved[5], studentsU[3], this.lessonStart(now - 12 * DAY, 18), 1.5, 'REFUNDED');
    // Hủy sớm được hoàn 100%
    await this.historical(approved[6], demoStudent, this.lessonStart(now - 20 * DAY, 19), 2, 'CANCELLED');
    // Hết hạn giữ chỗ (không thanh toán)
    await this.historical(approved[7], demoStudent, this.lessonStart(now - 9 * DAY, 9), 2, 'EXPIRED');
    await this.historical(demoProfile, studentsU[9], this.lessonStart(now - 4 * DAY, 8), 2, 'EXPIRED');

    // ---------------------------------------------------------------- Buổi sắp tới: đi qua luồng thật (đặt -> thanh toán mock)
    const asUser = (u: User): AuthUser => ({ id: u.id, email: u.email, role: u.role, fullName: u.fullName });
    const book = async (student: User, profile: TutorProfile, nth: number, pay: boolean) => {
      const slots = await this.availability.publicSlots(profile.id);
      const slot = slots[nth];
      if (!slot) return;
      const subjectId = (await this.ds.getRepository(TutorProfile).findOne({ where: { id: profile.id }, relations: { subjects: true } }))!.subjects[0]?.id;
      const b = await this.bookings.create(asUser(student), { slotId: slot.id, subjectId, note: nth === 0 ? 'Em muốn ôn chuyên đề hàm số trước kỳ thi giữa kỳ.' : undefined });
      if (!pay) return;
      const pm = await this.payments.createForBooking(student.id, b.id, PaymentProvider.MOCK, '127.0.0.1');
      await this.payments.mockComplete(student.id, pm.txnRef, true);
    };
    await book(demoStudent, demoProfile, 0, true);
    await book(demoStudent, demoProfile, 3, true);
    await book(studentsU[2], demoProfile, 1, true);
    for (const p of approved.slice(1, 13)) await book(this.r.pick(studentPool.slice(1)), p, 0, true);

    // ---------------------------------------------------------------- Đánh giá -> điểm trung bình, số buổi đã dạy
    for (const p of approved) await this.tutors.recalcRating(p.id);
    await this.ds.query(
      `UPDATE tutor_profiles tp SET completedLessons = (SELECT COUNT(*) FROM bookings b WHERE b.tutorProfileId = tp.id AND b.status = 'COMPLETED')`,
    );

    // ---------------------------------------------------------------- Rút tiền của gia sư demo
    const w1 = await this.withdrawals.request(demoTutor.id, { amount: 1_000_000, bankName: 'Vietcombank', bankAccount: '0011004567890', accountHolder: 'NGUYEN THU TRANG' });
    await this.withdrawals.approve(admin.id, w1.id, 'Đã chuyển khoản (mô phỏng)');
    await this.withdrawals.request(demoTutor.id, { amount: 500_000, bankName: 'Vietcombank', bankAccount: '0011004567890', accountHolder: 'NGUYEN THU TRANG' });
    await this.ds.query(`UPDATE withdrawals SET createdAt = ?, reviewedAt = ? WHERE id = ?`, [new Date(now - 10 * DAY), new Date(now - 9 * DAY), w1.id]);

    // ---------------------------------------------------------------- Hội thoại
    const conv = await this.chat.start(asUser(demoStudent), demoTutor.id);
    for (const [fromStudent, text] of CHAT_SCRIPT) {
      await this.chat.send(asUser(fromStudent ? demoStudent : demoTutor), conv.id, text);
    }
    await this.chat.markRead(asUser(demoTutor), conv.id);
    for (const p of approved.slice(1, 6)) {
      const s = this.r.pick(studentPool.slice(1));
      const tu = tutorsU.find((t) => t.id === p.userId)!;
      const c = await this.chat.start(asUser(s), tu.id);
      await this.chat.send(asUser(s), c.id, 'Chào thầy/cô, em muốn hỏi lịch học cuối tuần ạ.');
      await this.chat.send(asUser(tu), c.id, 'Chào em, cuối tuần mình còn trống, em xem lịch trên hồ sơ và đặt nhé.');
    }
    // Chat giữa 2 bên đang tranh chấp (admin xem làm bằng chứng)
    const disputant = studentsU[7];
    const dc = await this.chat.start(asUser(disputant), demoTutor.id);
    await this.chat.send(asUser(disputant), dc.id, 'Cô ơi em vào phòng học rồi mà chưa thấy cô ạ?');
    await this.chat.send(asUser(disputant), dc.id, 'Em chờ 30 phút rồi cô ạ.');
    await this.chat.send(asUser(demoTutor), dc.id, 'Cô xin lỗi em, hôm đó nhà cô mất mạng đột ngột. Cô dạy bù cho em được không?');

    // ---------------------------------------------------------------- Dọn dẹp
    await this.notifications.notify(demoStudent.id, { type: NotificationType.SYSTEM, title: 'Chào mừng bạn đến với TutorHub', body: 'Tìm gia sư, đặt lịch và thanh toán an toàn: học phí chỉ chuyển cho gia sư khi bạn xác nhận buổi học.', link: '/tutors' });
    await this.ds.query('DELETE FROM dev_mails');
    const inv = await this.wallets.checkInvariants();
    this.logger.log(
      `Xong sau ${((Date.now() - t0) / 1000).toFixed(1)}s: ${tutorsU.length} gia sư, ${studentsU.length} học viên, ${completed} buổi đã hoàn tất. Sổ sách khớp: ${inv.ok}`,
    );
    return { tutors: tutorsU.length, students: studentsU.length, completed, invariants: inv };
  }

  // ================================================================ Hỗ trợ

  private name() {
    return `${this.r.pick(HO)} ${this.r.pick(DEM)} ${this.r.pick(TEN)}`;
  }

  /** Giờ bắt đầu buổi học tròn giờ (giờ VN) của một ngày trong quá khứ */
  private lessonStart(dayMs: number, vnHour?: number) {
    const h = vnHour ?? this.r.pick([8, 9, 14, 17, 18, 19, 19, 20]);
    const vnDay = new Date(dayMs + 7 * HOUR).toISOString().slice(0, 10);
    return new Date(`${vnDay}T${String(h).padStart(2, '0')}:00:00+07:00`);
  }

  private ensureCertificateFile() {
    const dir = join(process.cwd(), cfg().uploadDir, 'certificates');
    mkdirSync(dir, { recursive: true });
    const pdf =
      '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 420 300]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj 4 0 obj<</Length 60>>stream\nBT /F1 20 Tf 60 150 Td (Chung chi mau - TutorHub demo) Tj ET\nendstream endobj 5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF';
    writeFileSync(join(dir, 'seed-certificate.pdf'), pdf);
    return '/uploads/certificates/seed-certificate.pdf';
  }

  /**
   * Tạo một buổi học trong quá khứ với dòng tiền đi qua EscrowService thật.
   * Sau đó chỉnh lại các mốc thời gian (paidAt, createdAt của sổ cái) cho khớp lịch sử.
   */
  private async historical(profile: TutorProfile, student: User, startAt: Date, hours: number, target: 'COMPLETED' | 'AWAITING' | 'DISPUTED' | 'REFUNDED' | 'CANCELLED' | 'EXPIRED', review = false) {
    // Tránh trùng giờ với buổi đã có của gia sư: lùi 1 ngày nếu trùng
    while (await this.ds.getRepository(Slot).existsBy({ tutorProfileId: profile.id, startAt })) {
      startAt = new Date(startAt.getTime() - DAY);
    }
    const price = roundTo(profile.hourlyRate * hours, 1000);
    const paidAt = new Date(startAt.getTime() - this.r.int(1, 6) * DAY);
    const subjectId = (await this.ds.getRepository(TutorProfile).findOne({ where: { id: profile.id }, relations: { subjects: true } }))!.subjects[0]?.id ?? null;

    const endAtFixed = new Date(startAt.getTime() + hours * HOUR);
    await this.ds.transaction(async (m: EntityManager) => {
      const endAt = endAtFixed;
      const slot = await m.save(m.create(Slot, { tutorProfileId: profile.id, ruleId: null, startAt, endAt, status: target === 'EXPIRED' ? SlotStatus.AVAILABLE : SlotStatus.BOOKED }));
      const b = await m.save(
        m.create(Booking, {
          studentId: student.id,
          tutorProfileId: profile.id,
          tutorUserId: profile.userId,
          slotId: slot.id,
          activeSlotKey: ['EXPIRED', 'CANCELLED', 'REFUNDED'].includes(target) ? null : slot.id,
          subjectId,
          startAt,
          endAt,
          price,
          status: target === 'EXPIRED' ? S.EXPIRED : S.CONFIRMED,
          holdExpiresAt: null,
          paidAt: target === 'EXPIRED' ? null : paidAt,
          createdAt: new Date(paidAt.getTime() - 10 * 60_000),
          cancelledBy: target === 'EXPIRED' ? 'SYSTEM' : null,
          cancelReason: target === 'EXPIRED' ? 'Hết thời gian giữ chỗ chưa thanh toán' : null,
        }),
      );
      b.code = `BK-${String(b.id).padStart(6, '0')}`;
      await m.save(b);
      if (target === 'EXPIRED') return;

      const p = await m.save(
        m.create(Payment, {
          bookingId: b.id,
          studentId: student.id,
          amount: price,
          provider: PaymentProvider.MOCK,
          status: PaymentStatus.SUCCESS,
          escrowStatus: EscrowStatus.NONE,
          txnRef: `SEED${b.id}${this.r.int(1000, 9999)}`,
          providerTxnNo: `MOCK${b.id}`,
          bankCode: 'MOCKBANK',
          paidAt,
          createdAt: paidAt,
        }),
      );
      await this.escrow.hold(m, p);
      let doneAt = paidAt;

      if (target === 'COMPLETED') {
        await this.escrow.release(m, b.id);
        const auto = this.r.chance(0.15);
        doneAt = new Date(endAt.getTime() + (auto ? 48 * HOUR : this.r.int(1, 20) * HOUR));
        Object.assign(b, { status: S.COMPLETED, completedAt: doneAt, completedBy: auto ? 'AUTO' : 'STUDENT', tutorMarkedTaughtAt: new Date(endAt.getTime() + 5 * 60_000) });
        await m.save(b);
        if (review) {
          const rating = this.r.pick([5, 5, 5, 5, 4, 4, 4, 3, 5, 2].slice(0, profile.id % 3 === 0 ? 10 : 8));
          await m.save(
            m.create(Review, {
              bookingId: b.id,
              tutorProfileId: profile.id,
              studentId: student.id,
              rating,
              comment: this.r.chance(0.85) ? this.r.pick(REVIEW_COMMENTS[rating] || REVIEW_COMMENTS[4]) : null,
              tutorReply: this.r.chance(0.3) ? 'Cảm ơn em đã tin tưởng, hẹn gặp lại buổi sau!' : null,
              repliedAt: null,
              createdAt: new Date(doneAt.getTime() + 2 * HOUR),
            }),
          );
        }
      } else if (target === 'AWAITING') {
        b.status = S.AWAITING_CONFIRMATION;
        b.tutorMarkedTaughtAt = new Date(endAt.getTime() + 2 * 60_000);
        await m.save(b);
      } else if (target === 'DISPUTED' || target === 'REFUNDED') {
        await this.escrow.freeze(m, b.id);
        b.status = S.DISPUTED;
        await m.save(b);
        const d = m.create(Dispute, {
          bookingId: b.id,
          openedById: student.id,
          category: DisputeCategory.TUTOR_NO_SHOW,
          description: 'Gia sư không vào phòng học online đúng giờ, em đã chờ 30 phút và nhắn tin nhưng không thấy trả lời.',
          evidenceUrls: null,
          status: DisputeStatus.OPEN,
          createdAt: new Date(endAt.getTime() + 3 * HOUR),
        });
        if (target === 'REFUNDED') {
          await this.escrow.refund(m, b.id);
          Object.assign(b, { status: S.REFUNDED, refundAmount: price, activeSlotKey: null });
          await m.save(b);
          await m.update(Slot, { id: slot.id }, { status: SlotStatus.CANCELLED });
          Object.assign(d, {
            status: DisputeStatus.RESOLVED_REFUND,
            tutorResponse: 'Em xin lỗi, hôm đó em bị ốm đột xuất và quên báo trước.',
            tutorRespondedAt: new Date(endAt.getTime() + 20 * HOUR),
            resolutionNote: 'Gia sư thừa nhận vắng mặt, hoàn 100% học phí cho học viên.',
            resolvedAt: new Date(endAt.getTime() + 30 * HOUR),
          });
          doneAt = d.resolvedAt!;
        }
        await m.save(d);
      } else if (target === 'CANCELLED') {
        await this.escrow.refund(m, b.id);
        const cancelledAt = new Date(startAt.getTime() - 3 * DAY);
        Object.assign(b, { status: S.CANCELLED, cancelledAt, cancelledBy: 'STUDENT', cancelReason: 'Trùng lịch thi ở trường', refundAmount: price, activeSlotKey: null });
        await m.save(b);
        await m.update(Slot, { id: slot.id }, { status: SlotStatus.AVAILABLE });
        doneAt = cancelledAt;
      }

      // Đưa mốc thời gian sổ cái về đúng lịch sử
      await m.query(`UPDATE wallet_transactions SET createdAt = ? WHERE bookingId = ? AND type = 'PAYMENT_IN'`, [paidAt, b.id]);
      await m.query(`UPDATE wallet_transactions SET createdAt = ? WHERE bookingId = ? AND type <> 'PAYMENT_IN'`, [doneAt, b.id]);
      await m.query(`UPDATE payments SET releasedAt = IF(releasedAt IS NULL, NULL, ?), refundedAt = IF(refundedAt IS NULL, NULL, ?) WHERE id = ?`, [doneAt, doneAt, p.id]);
    });
  }
}
