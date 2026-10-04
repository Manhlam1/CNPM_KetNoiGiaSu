import { Column, Entity, Index, PrimaryGeneratedColumn, VersionColumn } from 'typeorm';
import { WalletType } from '../../../common/enums';
import { bigintTransformer } from '../../../common/money';
import { Timestamped } from '../../../common/timestamped';

/**
 * Ví. Số dư chỉ thay đổi qua WalletService.post() kèm một dòng sổ cái (WalletTransaction).
 * Ví hệ thống: ESCROW (tiền đang giữ hộ), PLATFORM (hoa hồng).
 */
@Entity('wallets')
export class Wallet extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  /** ESCROW | PLATFORM | USER-<userId> */
  @Index({ unique: true })
  @Column({ length: 30 })
  code: string;

  @Column({ type: 'varchar', length: 10 })
  type: WalletType;

  @Index({ unique: true })
  @Column({ type: 'int', nullable: true })
  userId: number | null;

  @Column({ type: 'bigint', default: 0, transformer: bigintTransformer })
  balance: number;

  @VersionColumn({ default: 1 })
  version: number;
}
