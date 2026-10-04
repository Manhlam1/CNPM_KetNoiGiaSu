import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { WithdrawalStatus } from '../../../common/enums';
import { bigintTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';
import { User } from '../../m1-account/entities/user.entity';

/** Yêu cầu rút tiền của gia sư (admin duyệt, chuyển khoản mô phỏng) */
@Entity('withdrawals')
@Index(['status', 'createdAt'])
export class Withdrawal extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount: number;

  @Column({ length: 100 })
  bankName: string;

  @Column({ length: 30 })
  bankAccount: string;

  @Column({ length: 120 })
  accountHolder: string;

  @Column({ type: 'varchar', length: 10, default: WithdrawalStatus.PENDING })
  status: WithdrawalStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @Column({ type: 'int', nullable: true })
  reviewedById: number | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  reviewedAt: Date | null;
}
