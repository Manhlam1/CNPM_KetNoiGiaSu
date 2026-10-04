import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { WalletTxType } from '../../../common/enums';
import { bigintTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';

/** Sổ cái: mỗi biến động số dư là một dòng, không sửa/xóa */
@Entity('wallet_transactions')
@Index(['walletId', 'id'])
@Index(['type', 'createdAt'])
export class WalletTransaction extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  walletId: number;

  @Column({ type: 'varchar', length: 30 })
  type: WalletTxType;

  /** Dương = tiền vào ví, âm = tiền ra */
  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount: number;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  balanceAfter: number;

  @Column({ type: 'int', nullable: true })
  bookingId: number | null;

  @Column({ type: 'int', nullable: true })
  paymentId: number | null;

  @Column({ type: 'int', nullable: true })
  withdrawalId: number | null;

  @Column({ length: 255 })
  description: string;
}
