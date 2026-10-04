import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../m1-account/entities/user.entity';
import { Message } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeGateway } from './realtime.gateway';

/** M5 (lõi) - Thông báo + kênh realtime, dùng chung cho mọi module nên để Global */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Message])],
  controllers: [NotificationsController],
  providers: [NotificationsService, RealtimeGateway],
  exports: [NotificationsService, RealtimeGateway],
})
export class NotificationModule {}
