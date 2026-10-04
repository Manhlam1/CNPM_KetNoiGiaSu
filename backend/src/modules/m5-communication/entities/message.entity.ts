import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../../common/timestamped';

@Entity('messages')
@Index(['conversationId', 'id'])
export class Message extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  conversationId: number;

  @Column()
  senderId: number;

  /** Người nhận (để đếm tin chưa đọc nhanh) */
  @Index()
  @Column()
  recipientId: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  readAt: Date | null;
}
