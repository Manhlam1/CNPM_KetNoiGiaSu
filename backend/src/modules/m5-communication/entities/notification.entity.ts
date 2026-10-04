import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { NotificationType } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';

@Entity('notifications')
@Index(['userId', 'readAt'])
export class Notification extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar', length: 30 })
  type: NotificationType;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  body: string | null;

  /** Đường dẫn trong frontend, vd. /app/bookings/12 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  readAt: Date | null;
}
