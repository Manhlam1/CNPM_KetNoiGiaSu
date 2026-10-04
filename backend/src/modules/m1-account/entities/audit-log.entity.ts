import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../../../common/timestamped';

/** Nhật ký thao tác của admin (ghi tự động bởi AuditInterceptor) */
@Entity('audit_logs')
@Index(['createdAt'])
export class AuditLog extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true })
  actorId: number | null;

  @Column({ type: 'varchar', length: 191, nullable: true })
  actorEmail: string | null;

  @Column({ length: 100 })
  action: string;

  @Column({ length: 10 })
  method: string;

  @Column({ length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  targetId: string | null;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;
}
