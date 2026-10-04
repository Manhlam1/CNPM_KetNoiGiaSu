import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';
import { Audit, Public, Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';
import { SystemConfigService } from './system-config.service';

class UpdateConfigDto {
  @ApiProperty({ example: '10' })
  @IsNumberString({}, { message: 'Giá trị phải là số' })
  value: string;
}

@ApiTags('M1 - Admin: cấu hình hệ thống')
@ApiBearerAuth()
@Controller()
export class SystemConfigController {
  constructor(private readonly configs: SystemConfigService) {}

  @Roles(Role.ADMIN)
  @Get('admin/system-configs')
  list() {
    return this.configs.list();
  }

  @Roles(Role.ADMIN)
  @Put('admin/system-configs/:key')
  @Audit('CONFIG_UPDATE')
  update(@Param('key') key: string, @Body() dto: UpdateConfigDto) {
    return this.configs.update(key, dto.value);
  }

  /** Thông số công khai để frontend hiển thị chính sách (hoa hồng, hủy, giữ slot...) */
  @Public()
  @Get('policies')
  policies() {
    return {
      commissionPercent: this.configs.commissionPercent(),
      holdMinutes: this.configs.holdMinutes(),
      autoReleaseHours: this.configs.autoReleaseHours(),
      fullRefundHours: this.configs.fullRefundHours(),
    };
  }
}
