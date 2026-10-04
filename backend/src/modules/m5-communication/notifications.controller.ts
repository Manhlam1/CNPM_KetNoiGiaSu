import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { AuthUser, CurrentUser } from '../../common/decorators';
import { PageQueryDto } from '../../common/pagination';
import { NotificationsService } from './notifications.service';

class NotificationQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() unreadOnly?: boolean;
}

@ApiTags('M5 - Thông báo')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: NotificationQueryDto) {
    return this.svc.list(u.id, q);
  }

  /** Số thông báo + tin nhắn chưa đọc (cho chuông và menu) */
  @Get('counts')
  counts(@CurrentUser() u: AuthUser) {
    return this.svc.counts(u.id);
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@CurrentUser() u: AuthUser) {
    return this.svc.markAllRead(u.id);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.svc.markRead(u.id, id);
  }
}
