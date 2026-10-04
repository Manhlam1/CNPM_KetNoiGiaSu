import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TeachingMode, TutorProfileStatus } from '../../../common/enums';
import { bigintTransformer, decimalTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';
import { User } from '../../m1-account/entities/user.entity';
import { Subject } from './subject.entity';
import { TutorCertificate } from './tutor-certificate.entity';

/** Hồ sơ năng lực gia sư — chỉ hiện trong tìm kiếm khi admin đã duyệt (APPROVED) */
@Entity('tutor_profiles')
@Index(['status', 'city'])
export class TutorProfile extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 160, default: '' })
  headline: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ length: 255, default: '' })
  education: string;

  @Column({ type: 'int', default: 0 })
  experienceYears: number;

  /** Học phí mỗi giờ (đồng) */
  @Index()
  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  hourlyRate: number;

  @Column({ type: 'varchar', length: 10, default: TeachingMode.BOTH })
  teachingMode: TeachingMode;

  @Column({ length: 60, default: '' })
  city: string;

  @Column({ length: 80, default: '' })
  area: string;

  /** Cấp học nhận dạy, lưu dạng "THCS,THPT" */
  @Column({ type: 'simple-array', nullable: true })
  levels: string[];

  @ManyToMany(() => Subject)
  @JoinTable({ name: 'tutor_subjects', joinColumn: { name: 'tutorProfileId' }, inverseJoinColumn: { name: 'subjectId' } })
  subjects: Subject[];

  @OneToMany(() => TutorCertificate, (c) => c.tutorProfile)
  certificates: TutorCertificate[];

  @Column({ type: 'varchar', length: 20, default: TutorProfileStatus.DRAFT })
  status: TutorProfileStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rejectReason: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, transformer: decimalTransformer })
  ratingAvg: number;

  @Column({ type: 'int', default: 0 })
  ratingCount: number;

  @Column({ type: 'int', default: 0 })
  completedLessons: number;
}
