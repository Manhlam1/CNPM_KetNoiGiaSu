import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfig } from '../entities/system-config.entity';
import { ClockService } from './clock.service';
import { SystemConfigService } from './system-config.service';

/** Global: mọi module đều dùng được cấu hình hệ thống và đồng hồ nghiệp vụ */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  providers: [SystemConfigService, ClockService],
  exports: [SystemConfigService, ClockService],
})
export class SystemConfigModule {}
