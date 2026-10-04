import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../../common/timestamped';
import { User } from '../../m1-account/entities/user.entity';

/** Hội thoại 1-1 giữa một học viên và một gia sư */
@Entity('conversations')
@Index(['studentId', 'tutorUserId'], { unique: true })
export class Conversation extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  tutorUserId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'tutorUserId' })
  tutorUser: User;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastMessageAt: Date | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  lastMessagePreview: string | null;
}
