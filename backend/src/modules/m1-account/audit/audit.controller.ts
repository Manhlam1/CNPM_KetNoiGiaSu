import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { PageQueryDto } from '../../../common/pagination';
import { AuditService } from './audit.service';

class AuditQueryDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() action?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() actorEmail?: string;
}

@ApiTags('M1 - Admin: nhật ký')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() q: AuditQueryDto) {
    return this.audit.list(q);
  }

  @Get('actions')
  actions() {
    return this.audit.actions();
  }
}
