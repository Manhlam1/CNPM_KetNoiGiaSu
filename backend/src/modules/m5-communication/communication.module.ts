import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../m1-account/entities/user.entity';
import { Booking } from '../m3-booking/entities/booking.entity';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

/**
 * M5 - Nhắn tin, Thông báo & Tranh chấp (TV5).
 * Phần thông báo + realtime nằm ở NotificationModule (global) vì mọi module dùng chung.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User, Booking])],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class CommunicationModule {}
