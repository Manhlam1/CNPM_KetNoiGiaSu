import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { badRequest, conflict, forbidden, notFound, unauthorized } from '../../../common/app.exception';
import { OtpPurpose, UserStatus } from '../../../common/enums';
import { User } from '../entities/user.entity';
import { toUserDto } from '../users/user.mapper';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from './auth.dto';
import { OtpService } from './otp.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  private normalize(email: string) {
    return email.trim().toLowerCase();
  }

  /** Đăng ký: tạo tài khoản chờ xác thực + gửi OTP qua email */
  async register(dto: RegisterDto) {
    const email = this.normalize(dto.email);
    const existing = await this.users.findOne({ where: { email }, withDeleted: true });
    const passwordHash = await bcrypt.hash(dto.password, 10);
    if (existing) {
      if (existing.status !== UserStatus.PENDING_VERIFICATION || existing.deletedAt) {
        throw conflict('EMAIL_TAKEN', 'Email đã được sử dụng');
      }
      // Đăng ký lại khi chưa xác thực: cập nhật thông tin, gửi mã mới
      Object.assign(existing, { passwordHash, fullName: dto.fullName.trim(), phone: dto.phone ?? null, role: dto.role });
      await this.users.save(existing);
    } else {
      await this.users.save(
        this.users.create({
          email,
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: dto.phone ?? null,
          role: dto.role,
          status: UserStatus.PENDING_VERIFICATION,
        }),
      );
    }
    await this.otp.issue(email, OtpPurpose.REGISTER);
    return { email, message: 'Đã gửi mã OTP tới email của bạn' };
  }

  async resendRegisterOtp(emailRaw: string) {
    const email = this.normalize(emailRaw);
    const user = await this.users.findOne({ where: { email } });
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      throw badRequest('NOT_PENDING', 'Tài khoản không ở trạng thái chờ xác thực');
    }
    await this.otp.issue(email, OtpPurpose.REGISTER);
    return { email };
  }

  /** Xác thực OTP đăng ký -> kích hoạt tài khoản và đăng nhập luôn */
  async verifyRegister(emailRaw: string, code: string) {
    const email = this.normalize(emailRaw);
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw notFound('Không tìm thấy tài khoản');
    if (user.status !== UserStatus.PENDING_VERIFICATION) {
      throw badRequest('ALREADY_VERIFIED', 'Tài khoản đã được xác thực, hãy đăng nhập');
    }
    await this.otp.verify(email, OtpPurpose.REGISTER, code);
    user.status = UserStatus.ACTIVE;
    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const email = this.normalize(dto.email);
    const user = await this.users.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw unauthorized('Email hoặc mật khẩu không đúng', 'INVALID_CREDENTIALS');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw forbidden('Tài khoản chưa xác thực email', 'EMAIL_NOT_VERIFIED');
    }
    if (user.status === UserStatus.LOCKED) {
      throw forbidden('Tài khoản đã bị khóa, liên hệ quản trị viên', 'ACCOUNT_LOCKED');
    }
    user.lastLoginAt = new Date();
    await this.users.save(user);
    return this.issueToken(user);
  }

  /** Quên mật khẩu: luôn trả cùng một thông báo để không lộ email nào có tồn tại */
  async forgotPassword(emailRaw: string) {
    const email = this.normalize(emailRaw);
    const user = await this.users.findOne({ where: { email } });
    if (user && user.status !== UserStatus.LOCKED) {
      await this.otp.issue(email, OtpPurpose.RESET_PASSWORD);
    }
    return { email, message: 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = this.normalize(dto.email);
    const user = await this.users.findOne({ where: { email } });
    if (!user) throw badRequest('OTP_INVALID', 'Mã OTP không đúng');
    await this.otp.verify(email, OtpPurpose.RESET_PASSWORD, dto.code);
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    if (user.status === UserStatus.PENDING_VERIFICATION) user.status = UserStatus.ACTIVE; // đã chứng minh sở hữu email
    await this.users.save(user);
    return { message: 'Đặt lại mật khẩu thành công' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (!(await bcrypt.compare(dto.oldPassword, user.passwordHash))) {
      throw badRequest('WRONG_PASSWORD', 'Mật khẩu hiện tại không đúng');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.users.save(user);
    return { message: 'Đổi mật khẩu thành công' };
  }

  async me(userId: number) {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw notFound('Không tìm thấy tài khoản');
    return toUserDto(user);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (dto.fullName !== undefined) user.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone;
    await this.users.save(user);
    return toUserDto(user);
  }

  async setAvatar(userId: number, url: string) {
    await this.users.update({ id: userId }, { avatarUrl: url });
    return this.me(userId);
  }

  issueToken(user: User) {
    const token = this.jwt.sign({ sub: user.id, role: user.role, email: user.email });
    return { token, user: toUserDto(user) };
  }
}
