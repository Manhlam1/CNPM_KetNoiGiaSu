import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { EscrowStatus, PaymentProvider, PaymentStatus } from '../../../common/enums';
import { bigintTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';

/**
 * Một lần thanh toán cho buổi học. status = kết quả từ cổng thanh toán,
 * escrowStatus = tiền đang ở đâu (giữ / giải ngân / hoàn / đóng băng).
 */
@Entity('payments')
@Index(['bookingId'])
@Index(['studentId', 'createdAt'])
export class Payment extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  bookingId: number;

  @Column()
  studentId: number;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 10, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 10, default: EscrowStatus.NONE })
  escrowStatus: EscrowStatus;

  /** Mã giao dịch gửi sang cổng thanh toán (vnp_TxnRef) */
  @Index({ unique: true })
  @Column({ length: 64 })
  txnRef: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  providerTxnNo: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  bankCode: string | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  paidAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  releasedAt: Date | null;

  @Column({ type: 'datetime', precision: 3, nullable: true })
  refundedAt: Date | null;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  commissionAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  tutorAmount: number;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  refundAmount: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string | null;

  @Column({ type: 'text', nullable: true })
  rawResponse: string | null;
}
