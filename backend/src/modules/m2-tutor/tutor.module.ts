import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Subject } from './entities/subject.entity';
import { TutorCertificate } from './entities/tutor-certificate.entity';
import { TutorProfile } from './entities/tutor-profile.entity';
import { AdminTutorsController, MetaController, TutorProfileController, TutorsController } from './tutors.controller';
import { TutorsService } from './tutors.service';

/**
 * M2 - Hồ sơ gia sư, Tìm kiếm & Đánh giá (TV2)
 */
@Module({
  imports: [TypeOrmModule.forFeature([TutorProfile, Subject, TutorCertificate, Review])],
  controllers: [MetaController, TutorsController, TutorProfileController, AdminTutorsController],
  providers: [TutorsService],
  exports: [TutorsService, TypeOrmModule],
})
export class TutorModule {}
