import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import { AppException, badRequest } from '../../../common/app.exception';
import { OtpPurpose } from '../../../common/enums';
import { MailService } from '../../../common/mail/mail.service';
import { EmailOtp } from '../entities/email-otp.entity';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 phút
const MAX_ATTEMPTS = 5;
const RESEND_GAP_MS = 30 * 1000; // tối thiểu 30 giây giữa 2 lần gửi

/** Sinh, gửi và kiểm tra mã OTP qua email (dùng giờ thật, không theo đồng hồ demo) */
@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(EmailOtp) private readonly repo: Repository<EmailOtp>,
    private readonly mail: MailService,
  ) {}

  async issue(email: string, purpose: OtpPurpose): Promise<void> {
    const last = await this.repo.findOne({ where: { email, purpose }, order: { id: 'DESC' } });
    if (last && !last.usedAt && Date.now() - last.createdAt.getTime() < RESEND_GAP_MS) {
      throw new AppException('Vui lòng chờ 30 giây trước khi gửi lại mã', 'OTP_TOO_FREQUENT', HttpStatus.TOO_MANY_REQUESTS);
    }
    // Vô hiệu các mã cũ chưa dùng
    await this.repo.update({ email, purpose, usedAt: IsNull() }, { usedAt: new Date() });

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.repo.save(
      this.repo.create({ email, purpose, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + OTP_TTL_MS) }),
    );
    const subject = purpose === OtpPurpose.REGISTER ? 'TutorHub - Mã xác thực đăng ký' : 'TutorHub - Mã đặt lại mật khẩu';
    await this.mail.send(
      email,
      subject,
      `Mã OTP của bạn là: ${code}\nMã có hiệu lực trong 10 phút. Không chia sẻ mã này cho người khác.`,
    );
  }

  async verify(email: string, purpose: OtpPurpose, code: string): Promise<void> {
    const otp = await this.repo.findOne({ where: { email, purpose, usedAt: IsNull() }, order: { id: 'DESC' } });
    if (!otp || otp.expiresAt.getTime() < Date.now()) {
      throw badRequest('OTP_EXPIRED', 'Mã OTP không tồn tại hoặc đã hết hạn, vui lòng gửi lại mã');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw badRequest('OTP_LOCKED', 'Nhập sai quá nhiều lần, vui lòng gửi lại mã mới');
    }
    otp.attempts += 1;
    const ok = await bcrypt.compare(code, otp.codeHash);
    if (!ok) {
      await this.repo.save(otp);
      throw badRequest('OTP_INVALID', `Mã OTP không đúng (còn ${MAX_ATTEMPTS - otp.attempts} lần thử)`);
    }
    otp.usedAt = new Date();
    await this.repo.save(otp);
  }
}
