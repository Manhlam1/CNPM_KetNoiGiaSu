import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../../common/timestamped';
import { User } from '../../m1-account/entities/user.entity';

/** Đánh giá: mỗi buổi học đã hoàn tất được đánh giá 1 lần; gia sư phản hồi 1 lần */
@Entity('reviews')
@Index(['tutorProfileId', 'createdAt'])
export class Review extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  bookingId: number;

  @Column()
  tutorProfileId: number;

  @Column()
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  tutorReply: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  repliedAt: Date | null;
}
