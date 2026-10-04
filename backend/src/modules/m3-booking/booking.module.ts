import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorProfile } from '../m2-tutor/entities/tutor-profile.entity';
import { Payment } from '../m4-payment/entities/payment.entity';
import { PaymentModule } from '../m4-payment/payment.module';
import { AvailabilityService } from './availability.service';
import { BookingJobsService } from './booking-jobs.service';
import { AdminBookingsController, AvailabilityController, BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { AvailabilityRule } from './entities/availability-rule.entity';
import { Booking } from './entities/booking.entity';
import { Slot } from './entities/slot.entity';

/**
 * M3 - Lịch trống & Đặt lịch (TV3). Gọi M4 (EscrowService) để giải ngân/hoàn tiền,
 * nhận báo thanh toán thành công từ M4 qua sự kiện.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AvailabilityRule, Slot, Booking, TutorProfile, Payment]), PaymentModule],
  controllers: [AvailabilityController, BookingsController, AdminBookingsController],
  providers: [AvailabilityService, BookingsService, BookingJobsService],
  exports: [BookingsService, AvailabilityService, BookingJobsService],
})
export class BookingModule {}
