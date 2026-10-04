import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';
import { BookingStatus } from '../../../common/enums';
import { bigintTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';
import { User } from '../../m1-account/entities/user.entity';
import { Subject } from '../../m2-tutor/entities/subject.entity';
import { TutorProfile } from '../../m2-tutor/entities/tutor-profile.entity';

/** Buổi học. Vòng đời trạng thái: xem booking-state.ts và docs/SDD.md */
@Entity('bookings')
@Index(['studentId', 'status'])
@Index(['tutorUserId', 'status'])
@Index(['status', 'endAt'])
export class Booking extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  /** Mã hiển thị, vd. BK-000123 */
  @Column({ type: 'varchar', length: 20, nullable: true })
  code: string | null;

  @Column()
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  tutorProfileId: number;

  @ManyToOne(() => TutorProfile)
  @JoinColumn({ name: 'tutorProfileId' })
  tutorProfile: TutorProfile;

  /** Lưu thẳng userId của gia sư để truy vấn nhanh */
  @Column()
  tutorUserId: number;

  @Column()
  slotId: number;

  /**
   * = slotId khi booking còn hiệu lực, NULL khi đã hết hạn/hủy/hoàn.
   * Có UNIQUE -> DB chặn 2 booking hiệu lực trên cùng 1 slot (chống đặt trùng tầng cuối).
   */
  @Index({ unique: true })
  @Column({ type: 'int', nullable: true })
  activeSlotKey: number | null;

  @Column({ type: 'int', nullable: true })
  subjectId: number | null;

  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject | null;

  @Column({ type: 'datetime', precision: 3 })
  startAt: Date;

  @Column({ type: 'datetime', precision: 3 })
  endAt: Date;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  price: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'varchar', length: 30 })
  status: BookingStatus;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  holdExpiresAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  paidAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  tutorMarkedTaughtAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  completedAt: Date | null;

  /** STUDENT | AUTO | ADMIN */
  @Column({ type: 'varchar', length: 10, nullable: true })
  completedBy: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  cancelledAt: Date | null;

  /** STUDENT | TUTOR | SYSTEM */
  @Column({ type: 'varchar', length: 10, nullable: true })
  cancelledBy: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cancelReason: string | null;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  refundAmount: number;

  @VersionColumn({ default: 1 })
  version: number;
}
