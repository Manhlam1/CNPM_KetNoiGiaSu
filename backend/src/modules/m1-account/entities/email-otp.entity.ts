import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { OtpPurpose } from '../../../common/enums';
import { Timestamped } from '../../../common/timestamped';

@Entity('email_otps')
@Index(['email', 'purpose'])
export class EmailOtp extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  purpose: OtpPurpose;

  /** Mã 6 chữ số, lưu dạng băm bcrypt */
  @Column({ length: 100 })
  codeHash: string;

  @Column({ type: 'datetime', precision: 3 })
  expiresAt: Date;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  usedAt: Date | null;
}
