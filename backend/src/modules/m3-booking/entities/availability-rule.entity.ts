import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AvailabilityRuleType } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';

/**
 * Lịch trống gia sư khai báo:
 *  - WEEKLY: lặp mỗi tuần vào dayOfWeek (1 = Thứ Hai ... 7 = Chủ Nhật)
 *  - ONE_OFF: một ngày cụ thể (date = 'YYYY-MM-DD')
 * Giờ theo múi giờ Việt Nam. Hệ thống sinh slot cụ thể cho N tuần tới.
 */
@Entity('availability_rules')
@Index(['tutorProfileId', 'active'])
export class AvailabilityRule extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tutorProfileId: number;

  @Column({ type: 'varchar', length: 10 })
  type: AvailabilityRuleType;

  @Column({ type: 'tinyint', nullable: true })
  dayOfWeek: number | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  date: string | null;

  /** 'HH:mm' */
  @Column({ length: 5 })
  startTime: string;

  @Column({ length: 5 })
  endTime: string;

  @Column({ default: true })
  active: boolean;
}
