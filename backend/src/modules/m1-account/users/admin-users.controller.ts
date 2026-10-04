import { Controller, Delete, Get, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Audit, AuthUser, CurrentUser, Roles } from '../../../common/decorators';
import { Role, UserStatus } from '../../../common/enums';
import { PageQueryDto } from '../../../common/pagination';
import { UsersService } from './users.service';

class UserQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: Role }) @IsOptional() @IsEnum(Role) role?: Role;
  @ApiPropertyOptional({ enum: UserStatus }) @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() q?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean() includeDeleted?: boolean;
}

@ApiTags('M1 - Admin: người dùng')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() q: UserQueryDto) {
    return this.users.list(q);
  }

  @Patch(':id/lock')
  @Audit('USER_LOCK')
  lock(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.users.lock(me.id, id);
  }

  @Patch(':id/unlock')
  @Audit('USER_UNLOCK')
  unlock(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.users.unlock(me.id, id);
  }

  @Delete(':id')
  @Audit('USER_SOFT_DELETE')
  remove(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.users.softDelete(me.id, id);
  }
}
