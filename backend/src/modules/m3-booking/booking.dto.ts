import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { AvailabilityRuleType, BookingStatus } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateRuleDto {
  @ApiProperty({ enum: AvailabilityRuleType }) @IsEnum(AvailabilityRuleType) type: AvailabilityRuleType;

  @ApiPropertyOptional({ description: '1 = Thứ Hai ... 7 = Chủ Nhật (bắt buộc với WEEKLY)' })
  @ValidateIf((o) => o.type === AvailabilityRuleType.WEEKLY)
  @Type(() => Number) @IsInt() @Min(1) @Max(7)
  dayOfWeek?: number;

  @ApiPropertyOptional({ example: '2026-10-10', description: 'Bắt buộc với ONE_OFF' })
  @ValidateIf((o) => o.type === AvailabilityRuleType.ONE_OFF)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có dạng YYYY-MM-DD' })
  date?: string;

  @ApiProperty({ example: '19:00' }) @Matches(HHMM, { message: 'Giờ bắt đầu dạng HH:mm' }) startTime: string;
  @ApiProperty({ example: '21:00' }) @Matches(HHMM, { message: 'Giờ kết thúc dạng HH:mm' }) endTime: string;
}

export class SlotRangeDto {
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class CreateBookingDto {
  @ApiProperty() @Type(() => Number) @IsInt() slotId: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() subjectId?: number;
  @ApiPropertyOptional({ example: 'Em cần ôn chương Đạo hàm' }) @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class BookingQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['upcoming', 'action', 'past'] }) @IsOptional() @IsIn(['upcoming', 'action', 'past']) scope?: 'upcoming' | 'action' | 'past';
  @ApiPropertyOptional({ enum: BookingStatus }) @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
}

export class AdminBookingQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: BookingStatus }) @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}
