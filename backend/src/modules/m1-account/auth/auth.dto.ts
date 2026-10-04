import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../common/enums';

const PHONE = /^0\d{9,10}$/;

export class RegisterDto {
  @ApiProperty({ example: 'hocvien.moi@gmail.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(191)
  email: string;

  @ApiProperty({ example: 'matkhau123' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  @MaxLength(64)
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @Length(2, 120, { message: 'Họ tên từ 2 đến 120 ký tự' })
  fullName: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @Matches(PHONE, { message: 'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)' })
  phone?: string;

  @ApiProperty({ enum: [Role.STUDENT, Role.TUTOR] })
  @IsIn([Role.STUDENT, Role.TUTOR], { message: 'Vai trò chỉ được là STUDENT hoặc TUTOR' })
  role: Role;
}

export class VerifyOtpDto {
  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty({ example: '123456' })
  @Matches(/^\d{6}$/, { message: 'Mã OTP gồm 6 chữ số' })
  code: string;
}

export class EmailDto {
  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@tutorhub.vn' }) @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty({ example: 'Admin@123' }) @IsString() @MinLength(1) password: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsEmail({}, { message: 'Email không hợp lệ' }) email: string;
  @ApiProperty() @Matches(/^\d{6}$/, { message: 'Mã OTP gồm 6 chữ số' }) code: string;
  @ApiProperty() @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) @MaxLength(64) newPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @MinLength(1) oldPassword: string;
  @ApiProperty() @IsString() @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' }) @MaxLength(64) newPassword: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(2, 120, { message: 'Họ tên từ 2 đến 120 ký tự' }) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @Matches(PHONE, { message: 'Số điện thoại không hợp lệ' }) phone?: string;
}
