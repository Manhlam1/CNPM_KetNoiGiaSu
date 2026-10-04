import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamped } from '../timestamped';

/** Hộp thư dev: lưu email khi MAIL_TRANSPORT=console để demo OTP mà không cần SMTP */
@Entity('dev_mails')
export class DevMail extends Timestamped {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 191 })
  toEmail: string;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;
}
