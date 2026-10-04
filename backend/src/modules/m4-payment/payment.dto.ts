import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { EscrowStatus, PaymentProvider, PaymentStatus, WithdrawalStatus } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';

export class CreatePaymentDto {
  @ApiPropertyOptional({ enum: PaymentProvider }) @IsOptional() @IsEnum(PaymentProvider) provider?: PaymentProvider;
}

export class MockCompleteDto {
  @ApiProperty() @IsBoolean() success: boolean;
}

export class WithdrawalRequestDto {
  @ApiProperty({ example: 500000 }) @Type(() => Number) @IsInt({ message: 'Số tiền phải là số nguyên đồng' }) @Min(1) amount: number;
  @ApiProperty({ example: 'Vietcombank' }) @IsString() @Length(2, 100) bankName: string;
  @ApiProperty({ example: '0011004567890' }) @Matches(/^\d{6,20}$/, { message: 'Số tài khoản gồm 6-20 chữ số' }) bankAccount: string;
  @ApiProperty({ example: 'TRAN THU HA' }) @IsString() @Length(2, 120) accountHolder: string;
}

export class ReviewWithdrawalDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(0, 500) note?: string;
}

export class RejectWithdrawalDto {
  @ApiProperty() @IsString() @Length(5, 500, { message: 'Lý do từ 5 đến 500 ký tự' }) note: string;
}

export class AdminPaymentQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: PaymentStatus }) @IsOptional() @IsEnum(PaymentStatus) status?: PaymentStatus;
  @ApiPropertyOptional({ enum: EscrowStatus }) @IsOptional() @IsEnum(EscrowStatus) escrowStatus?: EscrowStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
}

export class AdminWithdrawalQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: WithdrawalStatus }) @IsOptional() @IsEnum(WithdrawalStatus) status?: WithdrawalStatus;
}
