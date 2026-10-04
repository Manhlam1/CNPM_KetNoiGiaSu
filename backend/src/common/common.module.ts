import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevMail } from './mail/dev-mail.entity';
import { MailService } from './mail/mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([DevMail])],
  providers: [MailService],
  exports: [MailService],
})
export class CommonModule {}
