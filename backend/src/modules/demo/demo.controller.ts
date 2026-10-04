import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';
import { forbidden } from '../../common/app.exception';
import { Audit, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { cfg } from '../../config/configuration';
import { ClockService } from '../m1-account/system-config/clock.service';
import { BookingJobsService } from '../m3-booking/booking-jobs.service';

class TravelDto {
  @ApiProperty({ example: 48 }) @Type(() => Number) @IsNumber() @Min(-24 * 30) @Max(24 * 30) hours: number;
}

/**
 * Công cụ demo: "tua thời gian" để trình diễn các mốc tự động
 * (hết giờ giữ chỗ, hết giờ học, tự giải ngân sau 48h) mà không phải chờ thật.
 * Chỉ bật khi DEMO_MODE=true.
 */
@ApiTags('Demo')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/demo')
export class DemoController {
  constructor(private readonly clock: ClockService, private readonly jobs: BookingJobsService) {}

  private guard() {
    if (!cfg().demoMode) throw forbidden('Chỉ dùng ở chế độ demo (DEMO_MODE=true)');
  }

  @Get('clock')
  status() {
    return { ...this.clock.status(), demoMode: cfg().demoMode };
  }

  @Post('time-travel')
  @HttpCode(200)
  @Audit('DEMO_TIME_TRAVEL')
  async travel(@Body() dto: TravelDto) {
    this.guard();
    await this.clock.travel(dto.hours);
    const jobs = await this.jobs.runAll(true);
    return { ...this.clock.status(), jobs };
  }

  @Post('reset-clock')
  @HttpCode(200)
  @Audit('DEMO_RESET_CLOCK')
  async reset() {
    this.guard();
    await this.clock.reset();
    return this.clock.status();
  }

  @Post('run-jobs')
  @HttpCode(200)
  async run() {
    this.guard();
    return this.jobs.runAll(true);
  }
}
