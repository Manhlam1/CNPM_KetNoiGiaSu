import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { DisputeCategory, DisputeStatus } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';
import { Booking } from '../../m3-booking/entities/booking.entity';

/** Khiếu nại/tranh chấp của học viên về một buổi học (tiền bị đóng băng tới khi admin xử lý) */
@Entity('disputes')
@Index(['status', 'createdAt'])
export class Dispute extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  bookingId: number;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  openedById: number;

  @Column({ type: 'varchar', length: 20 })
  category: DisputeCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'simple-json', nullable: true })
  evidenceUrls: string[] | null;

  @Column({ type: 'text', nullable: true })
  tutorResponse: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  tutorRespondedAt: Date | null;

  @Column({ type: 'varchar', length: 20, default: DisputeStatus.OPEN })
  status: DisputeStatus;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'int', nullable: true })
  resolvedById: number | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  resolvedAt: Date | null;
}
