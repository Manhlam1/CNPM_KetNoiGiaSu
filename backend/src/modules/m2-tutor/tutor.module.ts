import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../m3-booking/entities/booking.entity';
import { Review } from './entities/review.entity';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Subject } from './entities/subject.entity';
import { TutorCertificate } from './entities/tutor-certificate.entity';
import { TutorProfile } from './entities/tutor-profile.entity';
import { AdminTutorsController, MetaController, TutorProfileController, TutorsController } from './tutors.controller';
import { TutorsService } from './tutors.service';

/**
 * M2 - Hồ sơ gia sư, Tìm kiếm & Đánh giá (TV2)
 */
@Module({
  imports: [TypeOrmModule.forFeature([TutorProfile, Subject, TutorCertificate, Review, Booking])],
  controllers: [MetaController, TutorsController, TutorProfileController, AdminTutorsController, ReviewsController],
  providers: [TutorsService, ReviewsService],
  exports: [TutorsService, ReviewsService, TypeOrmModule],
})
export class TutorModule {}
