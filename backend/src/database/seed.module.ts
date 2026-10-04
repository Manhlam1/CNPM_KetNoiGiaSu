import { Module } from '@nestjs/common';
import { TutorModule } from '../modules/m2-tutor/tutor.module';
import { BookingModule } from '../modules/m3-booking/booking.module';
import { PaymentModule } from '../modules/m4-payment/payment.module';
import { CommunicationModule } from '../modules/m5-communication/communication.module';
import { SeedService } from './seed.service';

@Module({
  imports: [TutorModule, BookingModule, PaymentModule, CommunicationModule],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
