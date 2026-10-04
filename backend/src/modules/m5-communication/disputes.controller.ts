import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Length } from 'class-validator';
import { Audit, AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { DisputeCategory, DisputeDecision, DisputeStatus, Role } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';
import { publicUrl, uploadOptions } from '../../common/upload';
import { DisputesService } from './disputes.service';

class OpenDisputeDto {
  @ApiProperty() @Type(() => Number) @IsInt() bookingId: number;
  @ApiProperty({ enum: DisputeCategory }) @IsEnum(DisputeCategory, { message: 'Loại khiếu nại không hợp lệ' }) category: DisputeCategory;
  @ApiProperty() @IsString() @Length(20, 3000, { message: 'Mô tả từ 20 đến 3000 ký tự' }) description: string;
}
class RespondDto {
  @ApiProperty() @IsString() @Length(10, 3000, { message: 'Phản hồi từ 10 đến 3000 ký tự' }) response: string;
}
class ResolveDto {
  @ApiProperty({ enum: DisputeDecision }) @IsEnum(DisputeDecision) decision: DisputeDecision;
  @ApiProperty() @IsString() @Length(5, 1000, { message: 'Ghi chú từ 5 đến 1000 ký tự' }) note: string;
}
class AdminDisputeQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: DisputeStatus }) @IsOptional() @IsEnum(DisputeStatus) status?: DisputeStatus;
}

@ApiTags('M5 - Tranh chấp')
@ApiBearerAuth()
@Controller()
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  /** Học viên mở khiếu nại, kèm tối đa 3 file bằng chứng (ảnh/PDF) */
  @Roles(Role.STUDENT)
  @Post('disputes')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 3, uploadOptions('evidence')))
  open(@CurrentUser() u: AuthUser, @Body() dto: OpenDisputeDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.disputes.open(u, dto, (files || []).map((f) => publicUrl('evidence', f.filename)));
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get('disputes/me')
  mine(@CurrentUser() u: AuthUser, @Query() q: PageQueryDto) {
    return this.disputes.mine(u, q);
  }

  @Get('disputes/:id')
  detail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.disputes.detail(u, id);
  }

  @Roles(Role.TUTOR)
  @Post('disputes/:id/respond')
  @HttpCode(200)
  respond(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: RespondDto) {
    return this.disputes.respond(u, id, dto.response);
  }

  @Roles(Role.ADMIN)
  @Get('admin/disputes')
  adminList(@Query() q: AdminDisputeQueryDto) {
    return this.disputes.adminList(q);
  }

  @Roles(Role.ADMIN)
  @Post('admin/disputes/:id/resolve')
  @HttpCode(200)
  @Audit('DISPUTE_RESOLVE')
  resolve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ResolveDto) {
    return this.disputes.resolve(u, id, dto.decision, dto.note);
  }
}
