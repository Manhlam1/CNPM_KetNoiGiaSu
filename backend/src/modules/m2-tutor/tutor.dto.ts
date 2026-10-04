import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Min,
} from 'class-validator';
import { TeachingMode, TutorProfileStatus } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';
import { CITIES, LEVELS, MAX_HOURLY_RATE, MIN_HOURLY_RATE } from './catalog';

export class UpdateTutorProfileDto {
  @ApiPropertyOptional({ example: 'Gia sư Toán THPT, 5 năm luyện thi đại học' })
  @IsOptional() @IsString() @Length(10, 160, { message: 'Tiêu đề từ 10 đến 160 ký tự' })
  headline?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(3000, { message: 'Giới thiệu tối đa 3000 ký tự' })
  bio?: string;

  @ApiPropertyOptional({ example: 'Cử nhân Sư phạm Toán - ĐH Sư phạm Hà Nội' })
  @IsOptional() @IsString() @MaxLength(255)
  education?: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(50)
  experienceYears?: number;

  @ApiPropertyOptional({ example: 200000, description: 'Học phí mỗi giờ (đồng)' })
  @IsOptional() @Type(() => Number) @IsInt({ message: 'Học phí phải là số nguyên đồng' })
  @Min(MIN_HOURLY_RATE, { message: `Học phí tối thiểu ${MIN_HOURLY_RATE.toLocaleString('vi-VN')}đ/giờ` })
  @Max(MAX_HOURLY_RATE, { message: `Học phí tối đa ${MAX_HOURLY_RATE.toLocaleString('vi-VN')}đ/giờ` })
  hourlyRate?: number;

  @ApiPropertyOptional({ enum: TeachingMode }) @IsOptional() @IsEnum(TeachingMode)
  teachingMode?: TeachingMode;

  @ApiPropertyOptional({ example: 'Hà Nội' }) @IsOptional() @IsIn(Object.keys(CITIES), { message: 'Thành phố không hợp lệ' })
  city?: string;

  @ApiPropertyOptional({ example: 'Cầu Giấy' }) @IsOptional() @IsString() @MaxLength(80)
  area?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsIn(LEVELS, { each: true, message: 'Cấp học không hợp lệ' })
  levels?: string[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional() @IsArray() @ArrayMinSize(1, { message: 'Chọn ít nhất 1 môn' }) @ArrayMaxSize(6, { message: 'Tối đa 6 môn' })
  @IsInt({ each: true })
  subjectIds?: number[];
}

export class SearchTutorsDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() subjectId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() level?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() city?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() area?: string;
  @ApiPropertyOptional({ enum: ['ONLINE', 'OFFLINE'] }) @IsOptional() @IsIn(['ONLINE', 'OFFLINE']) mode?: 'ONLINE' | 'OFFLINE';
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) minPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) maxPrice?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5) minRating?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) q?: string;
  @ApiPropertyOptional({ enum: ['rating', 'price_asc', 'price_desc', 'newest'] })
  @IsOptional() @IsIn(['rating', 'price_asc', 'price_desc', 'newest']) sort?: string;
}

export class AdminTutorQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: TutorProfileStatus }) @IsOptional() @IsEnum(TutorProfileStatus) status?: TutorProfileStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}

export class RejectTutorDto {
  @ApiProperty({ example: 'Chứng chỉ mờ, vui lòng tải lại bản rõ hơn' })
  @IsString() @Length(5, 500, { message: 'Lý do từ 5 đến 500 ký tự' })
  reason: string;
}

export class CertificateDto {
  @ApiProperty({ example: 'IELTS 8.0' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString() @Length(2, 200, { message: 'Tên chứng chỉ từ 2 đến 200 ký tự' })
  title: string;
}
