import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { cfg } from '../../config/configuration';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { AuthController, ProfileController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { OtpService } from './auth/otp.service';
import { AuditLog } from './entities/audit-log.entity';
import { EmailOtp } from './entities/email-otp.entity';
import { User } from './entities/user.entity';
import { SystemConfigController } from './system-config/system-config.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { UsersService } from './users/users.service';

/**
 * M1 - Tài khoản & Quản trị (TV1)
 * Đăng ký/đăng nhập JWT, OTP email, quên/đổi mật khẩu, quản lý người dùng,
 * cấu hình hệ thống, audit log. Đăng ký guard + interceptor toàn cục.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailOtp, AuditLog]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: cfg().jwt.secret, signOptions: { expiresIn: cfg().jwt.expiresIn as any } }),
    }),
  ],
  controllers: [AuthController, ProfileController, AdminUsersController, AuditController, SystemConfigController, DashboardController],
  providers: [
    AuthService,
    OtpService,
    UsersService,
    AuditService,
    DashboardService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [UsersService, AuthService, AuditService, TypeOrmModule],
})
export class AccountModule {}
