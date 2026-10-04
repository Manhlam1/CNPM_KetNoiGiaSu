import { Module } from '@nestjs/common';
import { BookingModule } from '../m3-booking/booking.module';
import { DemoController } from './demo.controller';
import { DevMailController } from './dev-mail.controller';

/** Công cụ hỗ trợ demo: hộp thư dev, tua thời gian */
@Module({
  imports: [BookingModule],
  controllers: [DevMailController, DemoController],
})
export class DemoModule {}
