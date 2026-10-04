import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../m1-account/entities/user.entity';
import { BookingModule } from '../m3-booking/booking.module';
import { Booking } from '../m3-booking/entities/booking.entity';
import { Payment } from '../m4-payment/entities/payment.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Conversation } from './entities/conversation.entity';
import { Dispute } from './entities/dispute.entity';
import { Message } from './entities/message.entity';

/**
 * M5 - Nhắn tin, Thông báo & Tranh chấp (TV5).
 * Phần thông báo + realtime nằm ở NotificationModule (global) vì mọi module dùng chung.
 * Tranh chấp gọi M3 (BookingsService) để đổi trạng thái + đóng băng/giải ngân/hoàn tiền.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User, Booking, Dispute, Payment]), BookingModule],
  controllers: [ChatController, DisputesController],
  providers: [ChatService, DisputesService],
  exports: [ChatService],
})
export class CommunicationModule {}
