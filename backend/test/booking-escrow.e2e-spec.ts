/**
 * Integration test chạy trên MySQL thật (database tutorhub_test):
 *  - Luồng chính: tìm -> đặt lịch -> trả tiền -> xác nhận -> giải ngân
 *  - Chống đặt trùng khi nhiều người bấm cùng lúc
 *  - IPN gọi lặp chỉ ghi nhận tiền 1 lần; IPN sai chữ ký / sai số tiền
 *  - Hết hạn giữ chỗ + thanh toán tới muộn -> tự hoàn
 *  - Chính sách hủy, tự giải ngân sau 48h, tranh chấp đóng băng tiền
 *  - Bất biến tiền luôn đúng sau mỗi kịch bản
 */
import { BookingStatus, EscrowStatus, Role, UserStatus } from '../src/common/enums';
import { User } from '../src/modules/m1-account/entities/user.entity';
import { ClockService } from '../src/modules/m1-account/system-config/clock.service';
import { BookingJobsService } from '../src/modules/m3-booking/booking-jobs.service';
import { WalletTransaction } from '../src/modules/m4-payment/entities/wallet-transaction.entity';
import { PaymentsService } from '../src/modules/m4-payment/payments.service';
import { sign } from '../src/modules/m4-payment/vnpay.util';
import { WalletService } from '../src/modules/m4-payment/wallet.service';
import { approvedTutor, auth, createApp, createUser, Ctx, login, student } from './helpers';

let ctx: Ctx;
let clock: ClockService;
let jobs: BookingJobsService;
let wallets: WalletService;

beforeAll(async () => {
  ctx = await createApp();
  clock = ctx.app.get(ClockService);
  jobs = ctx.app.get(BookingJobsService);
  wallets = ctx.app.get(WalletService);
});

afterAll(async () => {
  await ctx?.app.close();
});

afterEach(async () => {
  // Sau MỌI kịch bản: tiền vào = tiền đang giữ + tiền đã chi ra, ví khớp sổ cái
  const inv = await wallets.checkInvariants();
  expect(inv.ok).toBe(true);
});

/** Đặt lịch + thanh toán qua cổng giả lập */
async function bookAndPay(studentToken: string, slotId: number) {
  const b = await ctx.http().post('/api/bookings').set(auth(studentToken)).send({ slotId }).expect(201);
  const pay = await ctx.http().post(`/api/payments/bookings/${b.body.data.id}`).set(auth(studentToken)).send({}).expect(201);
  await ctx.http().post(`/api/payments/mock/${pay.body.data.txnRef}/complete`).set(auth(studentToken)).send({ success: true }).expect(200);
  return { bookingId: b.body.data.id as number, txnRef: pay.body.data.txnRef as string, price: b.body.data.price as number };
}

const detail = async (token: string, id: number) => (await ctx.http().get(`/api/bookings/${id}`).set(auth(token)).expect(200)).body.data;

describe('Luồng chính: tìm -> đặt lịch -> trả tiền -> xác nhận -> giải ngân', () => {
  it('tiền đi đúng: học viên trả 400k, TutorHub giữ, gia sư nhận 360k, nền tảng 40k', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);

    // Tìm thấy gia sư theo môn + khu vực + giá
    const search = await ctx.http().get('/api/tutors').query({ subjectId: tutor.subjectId, city: 'Hà Nội', maxPrice: 250000 }).expect(200);
    expect(search.body.data.items.some((t: any) => t.id === tutor.profile.id)).toBe(true);

    // Đặt lịch -> chờ thanh toán, giữ slot
    const created = await ctx.http().post('/api/bookings').set(auth(st.token)).send({ slotId: tutor.slotId, subjectId: tutor.subjectId }).expect(201);
    expect(created.body.data.status).toBe(BookingStatus.PENDING_PAYMENT);
    expect(created.body.data.price).toBe(400_000); // 2 giờ x 200k
    const bookingId = created.body.data.id;
    const slotsAfterHold = await ctx.http().get(`/api/tutors/${tutor.profile.id}/slots`).expect(200);
    expect(slotsAfterHold.body.data.find((s: any) => s.id === tutor.slotId)).toBeUndefined();

    // Thanh toán -> CONFIRMED, tiền HELD trong ví giữ hộ
    const pay = await ctx.http().post(`/api/payments/bookings/${bookingId}`).set(auth(st.token)).send({}).expect(201);
    expect(pay.body.data.paymentUrl).toContain('/payment/mock');
    await ctx.http().post(`/api/payments/mock/${pay.body.data.txnRef}/complete`).set(auth(st.token)).send({ success: true }).expect(200);
    let b = await detail(st.token, bookingId);
    expect(b.status).toBe(BookingStatus.CONFIRMED);
    expect(b.payment.escrowStatus).toBe(EscrowStatus.HELD);
    expect((await wallets.balances()).ESCROW).toBe(400_000);

    // Chưa học xong thì chưa xác nhận được
    await ctx.http().post(`/api/bookings/${bookingId}/confirm`).set(auth(st.token)).expect(400);

    // Tua qua giờ học -> job chuyển sang chờ xác nhận
    await clock.travel(3 * 24);
    await jobs.runAll();
    b = await detail(st.token, bookingId);
    expect(b.status).toBe(BookingStatus.AWAITING_CONFIRMATION);
    expect(b.actions.canConfirm).toBe(true);

    // Học viên xác nhận -> giải ngân
    b = (await ctx.http().post(`/api/bookings/${bookingId}/confirm`).set(auth(st.token)).expect(200)).body.data;
    expect(b.status).toBe(BookingStatus.COMPLETED);
    expect(b.payment).toMatchObject({ escrowStatus: EscrowStatus.RELEASED, commissionAmount: 40_000, tutorAmount: 360_000 });

    const tw = (await ctx.http().get('/api/wallets/me').set(auth(tutor.token)).expect(200)).body.data;
    expect(tw.balance).toBe(360_000);
    expect((await wallets.balances()).ESCROW).toBe(0);
    expect((await wallets.balances()).PLATFORM).toBe(40_000);

    // Đánh giá chỉ được 1 lần sau khi hoàn tất
    await ctx.http().post('/api/reviews').set(auth(st.token)).send({ bookingId, rating: 5, comment: 'Rất hay' }).expect(201);
    await ctx.http().post('/api/reviews').set(auth(st.token)).send({ bookingId, rating: 4 }).expect(400);
    const t = (await ctx.http().get(`/api/tutors/${tutor.profile.id}`).expect(200)).body.data;
    expect(t.ratingAvg).toBe(5);
    await clock.reset();
  });
});

describe('Chống đặt trùng', () => {
  it('10 học viên bấm đặt cùng một slot cùng lúc: chỉ 1 người được', async () => {
    const tutor = await approvedTutor(ctx);
    const students = await Promise.all(Array.from({ length: 10 }, () => student(ctx)));
    const results = await Promise.all(students.map((s) => ctx.http().post('/api/bookings').set(auth(s.token)).send({ slotId: tutor.slotId })));
    const ok = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409);
    expect(ok).toHaveLength(1);
    expect(conflicts).toHaveLength(9);
    conflicts.forEach((r) => expect(r.body.errorCode).toBe('SLOT_TAKEN'));
  });
});

describe('Cổng thanh toán', () => {
  it('kết quả thanh toán gọi lặp (IPN retry) chỉ ghi nhận tiền 1 lần', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);
    const { bookingId, txnRef, price } = await bookAndPay(st.token, tutor.slotId);
    const payments = ctx.app.get(PaymentsService);
    const again = await payments.handleGatewayResult({ txnRef, success: true, amount: price });
    expect(again.code).toBe('02'); // đã xác nhận trước đó
    const ins = await ctx.ds.getRepository(WalletTransaction).countBy({ bookingId, type: 'PAYMENT_IN' as any });
    expect(ins).toBe(1);
  });

  it('IPN VNPay: sai chữ ký -> 97, đúng chữ ký nhưng sai số tiền -> 04, đúng -> 00, lặp -> 02', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);
    const b = await ctx.http().post('/api/bookings').set(auth(st.token)).send({ slotId: tutor.slotId }).expect(201);
    const pay = await ctx.http().post(`/api/payments/bookings/${b.body.data.id}`).set(auth(st.token)).send({ provider: 'VNPAY' }).expect(201);
    expect(pay.body.data.paymentUrl).toContain('vnp_SecureHash=');
    const params = (amount: number) => ({
      vnp_TxnRef: pay.body.data.txnRef,
      vnp_Amount: String(amount * 100),
      vnp_ResponseCode: '00',
      vnp_TransactionStatus: '00',
      vnp_TransactionNo: '14123456',
      vnp_BankCode: 'NCB',
    });
    const signed = (p: Record<string, string>) => ({ ...p, vnp_SecureHash: sign(p, 'TESTHASHSECRET') });

    const bad = await ctx.http().get('/api/payments/vnpay/ipn').query({ ...params(400_000), vnp_SecureHash: 'abc' }).expect(200);
    expect(bad.body).toEqual({ RspCode: '97', Message: 'Invalid signature' });
    const wrongAmount = await ctx.http().get('/api/payments/vnpay/ipn').query(signed(params(1000))).expect(200);
    expect(wrongAmount.body.RspCode).toBe('04');
    const good = await ctx.http().get('/api/payments/vnpay/ipn').query(signed(params(400_000))).expect(200);
    expect(good.body.RspCode).toBe('00');
    const dup = await ctx.http().get('/api/payments/vnpay/ipn').query(signed(params(400_000))).expect(200);
    expect(dup.body.RspCode).toBe('02');
    expect((await detail(st.token, b.body.data.id)).status).toBe(BookingStatus.CONFIRMED);
  });

  it('hết 15 phút giữ chỗ -> EXPIRED; tiền tới muộn được hoàn ngay cho học viên', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);
    const b = await ctx.http().post('/api/bookings').set(auth(st.token)).send({ slotId: tutor.slotId }).expect(201);
    const pay = await ctx.http().post(`/api/payments/bookings/${b.body.data.id}`).set(auth(st.token)).send({}).expect(201);
    await clock.travel(0.5);
    await jobs.runAll();
    expect((await detail(st.token, b.body.data.id)).status).toBe(BookingStatus.EXPIRED);
    // Slot được mở lại cho người khác
    const slots = await ctx.http().get(`/api/tutors/${tutor.profile.id}/slots`).expect(200);
    expect(slots.body.data.some((s: any) => s.id === tutor.slotId)).toBe(true);
    // Thanh toán tới muộn
    const r = await ctx.http().post(`/api/payments/mock/${pay.body.data.txnRef}/complete`).set(auth(st.token)).send({ success: true }).expect(200);
    expect(r.body.data.status).toBe('REFUNDED');
    const sw = (await ctx.http().get('/api/wallets/me').set(auth(st.token)).expect(200)).body.data;
    expect(sw.totalRefunded).toBe(400_000);
    await clock.reset();
  });
});

describe('Hủy buổi học theo chính sách', () => {
  it('học viên hủy trước 24h: hoàn 100%, slot mở lại', async () => {
    const tutor = await approvedTutor(ctx, { inDays: 3 });
    const st = await student(ctx);
    const { bookingId } = await bookAndPay(st.token, tutor.slotId);
    const b = (await ctx.http().post(`/api/bookings/${bookingId}/cancel`).set(auth(st.token)).send({ reason: 'Bận' }).expect(200)).body.data;
    expect(b.status).toBe(BookingStatus.CANCELLED);
    expect(b.refundAmount).toBe(400_000);
    expect(b.payment.escrowStatus).toBe(EscrowStatus.REFUNDED);
  });

  it('học viên hủy muộn: không hoàn, gia sư nhận tiền (trừ hoa hồng)', async () => {
    const tutor = await approvedTutor(ctx, { inDays: 1 });
    const st = await student(ctx);
    const { bookingId } = await bookAndPay(st.token, tutor.slotId);
    const startAt = new Date((await detail(st.token, bookingId)).startAt).getTime();
    await clock.travel((startAt - clock.now().getTime()) / 3_600_000 - 2); // còn 2 giờ là tới giờ học
    const b = (await ctx.http().post(`/api/bookings/${bookingId}/cancel`).set(auth(st.token)).send({}).expect(200)).body.data;
    expect(b.refundAmount).toBe(0);
    expect(b.payment.escrowStatus).toBe(EscrowStatus.RELEASED);
    expect((await ctx.http().get('/api/wallets/me').set(auth(tutor.token)).expect(200)).body.data.balance).toBe(360_000);
    await clock.reset();
  });

  it('gia sư hủy: học viên luôn được hoàn 100%', async () => {
    const tutor = await approvedTutor(ctx, { inDays: 1 });
    const st = await student(ctx);
    const { bookingId } = await bookAndPay(st.token, tutor.slotId);
    const b = (await ctx.http().post(`/api/bookings/${bookingId}/cancel`).set(auth(tutor.token)).send({ reason: 'Ốm' }).expect(200)).body.data;
    expect(b.cancelledBy).toBe('TUTOR');
    expect(b.refundAmount).toBe(400_000);
  });
});

describe('Tự giải ngân và tranh chấp', () => {
  it('quá 48h không xác nhận, không khiếu nại -> tự giải ngân', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);
    const { bookingId } = await bookAndPay(st.token, tutor.slotId);
    await clock.travel(3 * 24);
    await jobs.runAll();
    expect((await detail(st.token, bookingId)).status).toBe(BookingStatus.AWAITING_CONFIRMATION);
    await clock.travel(48);
    await jobs.runAll();
    const b = await detail(st.token, bookingId);
    expect(b.status).toBe(BookingStatus.COMPLETED);
    expect(b.completedBy).toBe('AUTO');
    await clock.reset();
  });

  it('khiếu nại đóng băng tiền, job không tự giải ngân; admin quyết hoàn tiền', async () => {
    const tutor = await approvedTutor(ctx);
    const st = await student(ctx);
    const admin = await createUser(ctx, Role.ADMIN, 'Admin');
    const adminToken = await login(ctx, admin.email);
    const { bookingId } = await bookAndPay(st.token, tutor.slotId);
    await clock.travel(3 * 24);
    await jobs.runAll();

    const d = await ctx
      .http()
      .post('/api/disputes')
      .set(auth(st.token))
      .field('bookingId', String(bookingId))
      .field('category', 'TUTOR_NO_SHOW')
      .field('description', 'Gia sư không vào phòng học, em chờ 30 phút.')
      .expect(201);
    expect((await detail(st.token, bookingId)).payment.escrowStatus).toBe(EscrowStatus.FROZEN);

    await clock.travel(72);
    await jobs.runAll();
    expect((await detail(st.token, bookingId)).status).toBe(BookingStatus.DISPUTED); // không bị tự giải ngân

    // Học viên/gia sư không tự xử lý được, chỉ admin
    await ctx.http().post(`/api/admin/disputes/${d.body.data.id}/resolve`).set(auth(st.token)).send({ decision: 'REFUND', note: 'Tự xử' }).expect(403);
    await ctx.http().post(`/api/admin/disputes/${d.body.data.id}/resolve`).set(auth(adminToken)).send({ decision: 'REFUND', note: 'Gia sư vắng mặt' }).expect(200);
    const b = await detail(st.token, bookingId);
    expect(b.status).toBe(BookingStatus.REFUNDED);
    expect(b.payment.escrowStatus).toBe(EscrowStatus.REFUNDED);
    await clock.reset();
  });
});

describe('Tài khoản', () => {
  it('đăng ký -> OTP -> đăng nhập; tài khoản bị khóa không đăng nhập được', async () => {
    const email = `moi${Date.now()}@test.vn`;
    await ctx.http().post('/api/auth/register').send({ email, password: '123456', fullName: 'Học viên mới', role: 'STUDENT' }).expect(201);
    await ctx.http().post('/api/auth/login').send({ email, password: '123456' }).expect(403); // chưa xác thực
    const mail = await ctx.ds.query('SELECT body FROM dev_mails WHERE toEmail = ? ORDER BY id DESC LIMIT 1', [email]);
    const code = mail[0].body.match(/\d{6}/)[0];
    const v = await ctx.http().post('/api/auth/verify-otp').send({ email, code }).expect(200);
    expect(v.body.data.token).toBeTruthy();

    const users = ctx.ds.getRepository(User);
    await users.update({ email }, { status: UserStatus.LOCKED });
    const r = await ctx.http().post('/api/auth/login').send({ email, password: '123456' }).expect(403);
    expect(r.body.errorCode).toBe('ACCOUNT_LOCKED');
  });

  it('học viên không gọi được API của admin; body có trường lạ bị từ chối', async () => {
    const st = await student(ctx);
    await ctx.http().get('/api/admin/users').set(auth(st.token)).expect(403);
    const r = await ctx.http().put('/api/me').set(auth(st.token)).send({ fullName: 'Tên mới', role: 'ADMIN' }).expect(400);
    expect(r.body.errorCode).toBe('VALIDATION_FAILED');
  });
});
