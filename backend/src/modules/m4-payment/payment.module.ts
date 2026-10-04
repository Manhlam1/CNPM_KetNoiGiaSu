import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../m3-booking/entities/booking.entity';
import { Payment } from './entities/payment.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { Withdrawal } from './entities/withdrawal.entity';
import { EscrowService } from './escrow.service';
import { AdminFinanceController, PaymentsController, WalletsController, WithdrawalsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WalletService } from './wallet.service';
import { WithdrawalsService } from './withdrawals.service';

/**
 * M4 - Thanh toán, Escrow & Ví (TV4)
 * Không import BookingModule: báo thanh toán thành công cho M3 qua sự kiện payment.succeeded.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Payment, Wallet, WalletTransaction, Withdrawal, Booking])],
  controllers: [PaymentsController, WalletsController, WithdrawalsController, AdminFinanceController],
  providers: [PaymentsService, EscrowService, WalletService, WithdrawalsService],
  exports: [EscrowService, WalletService, PaymentsService, WithdrawalsService],
})
export class PaymentModule {}
