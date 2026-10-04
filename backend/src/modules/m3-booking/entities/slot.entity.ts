import { Column, Entity, Index, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';
import { SlotStatus } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';

/** Một khung giờ cụ thể có thể đặt. version dùng cho optimistic lock. */
@Entity('slots')
@Index(['tutorProfileId', 'startAt'], { unique: true })
@Index(['status', 'startAt'])
export class Slot extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tutorProfileId: number;

  @Column({ type: 'int', nullable: true })
  ruleId: number | null;

  @Column({ type: 'datetime', precision: 3 })
  startAt: Date;

  @Column({ type: 'datetime', precision: 3 })
  endAt: Date;

  @Column({ type: 'varchar', length: 20, default: SlotStatus.AVAILABLE })
  status: SlotStatus;

  @VersionColumn({ default: 1 })
  version: number;
}
