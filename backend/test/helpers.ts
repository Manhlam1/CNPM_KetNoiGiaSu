import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AvailabilityRuleType, Role, TutorProfileStatus, UserStatus } from '../src/common/enums';
import { configureApp } from '../src/main';
import { User } from '../src/modules/m1-account/entities/user.entity';
import { ClockService } from '../src/modules/m1-account/system-config/clock.service';
import { SystemConfigService } from '../src/modules/m1-account/system-config/system-config.service';
import { Subject } from '../src/modules/m2-tutor/entities/subject.entity';
import { TutorProfile } from '../src/modules/m2-tutor/entities/tutor-profile.entity';
import { TutorsService } from '../src/modules/m2-tutor/tutors.service';
import { WalletService } from '../src/modules/m4-payment/wallet.service';

export interface Ctx {
  app: NestExpressApplication;
  ds: DataSource;
  http: () => ReturnType<typeof request>;
}

/** Khởi động toàn bộ ứng dụng trên database test sạch */
export async function createApp(): Promise<Ctx> {
  Logger.overrideLogger(['error']);
  const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = mod.createNestApplication<NestExpressApplication>({ logger: ['error'] });
  configureApp(app);
  await app.init();
  app.getHttpServer().setMaxListeners(100); // supertest mở nhiều kết nối song song
  const ds = app.get(DataSource);
  await ds.synchronize(true); // xóa sạch dữ liệu
  const configs = app.get(SystemConfigService);
  await configs.ensureDefaults();
  await app.get(ClockService).reset();
  await app.get(WalletService).ensureSystemWallets();
  await app.get(TutorsService).onModuleInit();
  return { app, ds, http: () => request(app.getHttpServer()) };
}

let seq = 0;
const HASH = bcrypt.hashSync('123456', 4);

export async function createUser(ctx: Ctx, role: Role, name = 'Người dùng test') {
  seq += 1;
  const users = ctx.ds.getRepository(User);
  return users.save(users.create({ email: `${role.toLowerCase()}${seq}-${Date.now()}@test.vn`, fullName: `${name} ${seq}`, role, passwordHash: HASH, status: UserStatus.ACTIVE }));
}

export async function login(ctx: Ctx, email: string): Promise<string> {
  const res = await ctx.http().post('/api/auth/login').send({ email, password: '123456' }).expect(200);
  return res.body.data.token;
}

/** Gia sư đã duyệt, học phí 200.000đ/giờ, có lịch trống ngày mai 19:00-21:00 */
export async function approvedTutor(ctx: Ctx, opts: { hourlyRate?: number; inDays?: number; startTime?: string; endTime?: string } = {}) {
  const user = await createUser(ctx, Role.TUTOR, 'Gia sư');
  const subject = await ctx.ds.getRepository(Subject).findOneByOrFail({ slug: 'toan' });
  const profile = await ctx.ds.getRepository(TutorProfile).save(
    ctx.ds.getRepository(TutorProfile).create({
      userId: user.id,
      headline: 'Gia sư Toán THPT test',
      bio: 'x'.repeat(60),
      hourlyRate: opts.hourlyRate ?? 200_000,
      city: 'Hà Nội',
      area: 'Cầu Giấy',
      levels: ['THPT'],
      subjects: [subject],
      status: TutorProfileStatus.APPROVED,
      approvedAt: new Date(),
    }),
  );
  const token = await login(ctx, user.email);
  const now = ctx.app.get(ClockService).now();
  const day = new Date(now.getTime() + 7 * 3600_000 + (opts.inDays ?? 2) * 86400_000).toISOString().slice(0, 10);
  await ctx
    .http()
    .post('/api/availability/rules')
    .set('Authorization', `Bearer ${token}`)
    .send({ type: AvailabilityRuleType.ONE_OFF, date: day, startTime: opts.startTime ?? '19:00', endTime: opts.endTime ?? '21:00' })
    .expect(201);
  const slots = await ctx.http().get(`/api/tutors/${profile.id}/slots`).expect(200);
  return { user, profile, token, slotId: slots.body.data[0].id as number, subjectId: subject.id };
}

export async function student(ctx: Ctx) {
  const user = await createUser(ctx, Role.STUDENT, 'Học viên');
  return { user, token: await login(ctx, user.email) };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
