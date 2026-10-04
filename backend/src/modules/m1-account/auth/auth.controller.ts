import { Body, Controller, Get, HttpCode, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { badRequest } from '../../../common/app.exception';
import { AuthUser, CurrentUser, Public } from '../../../common/decorators';
import { publicUrl, uploadOptions } from '../../../common/upload';
import { ChangePasswordDto, EmailDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto, VerifyOtpDto } from './auth.dto';
import { AuthService } from './auth.service';

@ApiTags('M1 - Xác thực')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const r = await this.auth.register(dto);
    return ApiResponse.ok(r, r.message);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(200)
  async verify(@Body() dto: VerifyOtpDto) {
    return ApiResponse.ok(await this.auth.verifyRegister(dto.email, dto.code), 'Xác thực thành công');
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(200)
  async resend(@Body() dto: EmailDto) {
    return ApiResponse.ok(await this.auth.resendRegisterOtp(dto.email), 'Đã gửi lại mã OTP');
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return ApiResponse.ok(await this.auth.login(dto), 'Đăng nhập thành công');
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  async forgot(@Body() dto: EmailDto) {
    const r = await this.auth.forgotPassword(dto.email);
    return ApiResponse.ok(r, r.message);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() dto: ResetPasswordDto) {
    const r = await this.auth.resetPassword(dto);
    return ApiResponse.ok(r, r.message);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.auth.me(u.id);
  }
}

@ApiTags('M1 - Hồ sơ cá nhân')
@ApiBearerAuth()
@Controller('me')
export class ProfileController {
  constructor(private readonly auth: AuthService) {}

  @Get()
  me(@CurrentUser() u: AuthUser) {
    return this.auth.me(u.id);
  }

  @Put()
  update(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(u.id, dto);
  }

  @Put('password')
  async changePassword(@CurrentUser() u: AuthUser, @Body() dto: ChangePasswordDto) {
    const r = await this.auth.changePassword(u.id, dto);
    return ApiResponse.ok(r, r.message);
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', uploadOptions('avatars')))
  async avatar(@CurrentUser() u: AuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw badRequest('NO_FILE', 'Chưa chọn file');
    if (!file.mimetype.startsWith('image/')) throw badRequest('INVALID_FILE', 'Ảnh đại diện phải là file ảnh');
    return this.auth.setAvatar(u.id, publicUrl('avatars', file.filename));
  }
}
