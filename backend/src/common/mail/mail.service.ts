import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { cfg } from '../../config/configuration';
import { DevMail } from './dev-mail.entity';

/**
 * Gửi email. MAIL_TRANSPORT=console: không gửi thật, chỉ ghi log + lưu "hộp thư dev"
 * (xem ở trang /dev/mailbox) — tiện demo OTP. MAIL_TRANSPORT=smtp: gửi qua SMTP (vd. Mailtrap).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(@InjectRepository(DevMail) private readonly devMails: Repository<DevMail>) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    const c = cfg().mail;
    try {
      if (c.transport === 'smtp' && c.host) {
        if (!this.transporter) {
          this.transporter = nodemailer.createTransport({
            host: c.host,
            port: c.port,
            auth: c.user ? { user: c.user, pass: c.pass } : undefined,
          });
        }
        await this.transporter.sendMail({ from: c.from, to, subject, text: body });
      } else {
        this.logger.log(`[EMAIL -> ${to}] ${subject}\n${body}`);
        await this.devMails.save(this.devMails.create({ toEmail: to, subject, body }));
      }
    } catch (e: any) {
      // Gửi mail lỗi không được làm hỏng nghiệp vụ chính
      this.logger.warn(`Gửi email tới ${to} thất bại: ${e?.message}`);
    }
  }

  latest(limit = 30) {
    return this.devMails.find({ order: { id: 'DESC' }, take: limit });
  }
}
