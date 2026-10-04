import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { forbidden } from '../../common/app.exception';
import { Public } from '../../common/decorators';
import { MailService } from '../../common/mail/mail.service';
import { cfg } from '../../config/configuration';

/** Hộp thư dev — chỉ bật khi DEMO_MODE=true và MAIL_TRANSPORT=console */
@ApiTags('Demo')
@Controller('dev')
export class DevMailController {
  constructor(private readonly mail: MailService) {}

  @Public()
  @Get('mails')
  async mails() {
    if (!cfg().demoMode) throw forbidden('Chỉ dùng ở chế độ demo');
    const rows = await this.mail.latest(30);
    return rows.map((m) => ({ id: m.id, to: m.toEmail, subject: m.subject, body: m.body, createdAt: m.createdAt }));
  }

  @Public()
  @Get('info')
  info() {
    const c = cfg();
    return { demoMode: c.demoMode, mailTransport: c.mail.transport, paymentProvider: c.payment.provider };
  }
}
