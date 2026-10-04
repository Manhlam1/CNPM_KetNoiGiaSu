import { Column, DeleteDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Role, UserStatus } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';

@Entity('users')
export class User extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 191 })
  email: string;

  @Column({ length: 100 })
  passwordHash: string;

  @Column({ length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 20 })
  role: Role;

  @Column({ type: 'varchar', length: 30, default: UserStatus.PENDING_VERIFICATION })
  status: UserStatus;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  lastLoginAt: Date | null;

  /** Xóa mềm: có giá trị = đã xóa */
  @DeleteDateColumn({ type: 'datetime', precision: 3, nullable: true })
  deletedAt: Date | null;
}
