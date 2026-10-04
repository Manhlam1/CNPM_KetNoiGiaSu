import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { toPage } from '../../common/api-response';
import { notFound } from '../../common/app.exception';
import { NotificationType, Role } from '../../common/enums';
import { MailService } from '../../common/mail/mail.service';
import { skipTake } from '../../common/pagination';
import { User } from '../m1-account/entities/user.entity';
import { Message } from './entities/message.entity';
import { Notification } from './entities/notification.entity';
import { RealtimeGateway } from './realtime.gateway';

export interface NotifyPayload {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * NotificationService dùng chung cho mọi module:
 *   notify(userId, { type, title, body, link }, { email: true })
 * -> lưu DB + đẩy realtime + (tùy chọn) gửi email.
 * Lỗi gửi thông báo không làm hỏng nghiệp vụ gọi nó.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    private readonly gateway: RealtimeGateway,
    private readonly mail: MailService,
  ) {}

  async notify(userIds: number | number[], p: NotifyPayload, opts: { email?: boolean } = {}) {
    const ids = [...new Set(Array.isArray(userIds) ? userIds : [userIds])];
    for (const userId of ids) {
      try {
        const n = await this.repo.save(this.repo.create({ userId, type: p.type, title: p.title, body: p.body ?? null, link: p.link ?? null }));
        this.gateway.emitToUser(userId, 'notification:new', this.toDto(n));
        if (opts.email) {
          const u = await this.users.findOneBy({ id: userId });
          if (u) await this.mail.send(u.email, `TutorHub - ${p.title}`, `${p.body ?? ''}\n\nXem chi tiết trên TutorHub.`);
        }
      } catch (e: any) {
        this.logger.warn(`Không gửi được thông báo cho user ${userId}: ${e.message}`);
      }
    }
  }

  async notifyAdmins(p: NotifyPayload) {
    const admins = await this.users.find({ where: { role: Role.ADMIN }, select: ['id'] });
    await this.notify(admins.map((a) => a.id), p);
  }

  async list(userId: number, q: { page?: number; size?: number; unreadOnly?: boolean }) {
    const { page, size, skip, take } = skipTake(q);
    const where: any = { userId };
    if (q.unreadOnly) where.readAt = IsNull();
    const [items, total] = await this.repo.findAndCount({ where, order: { id: 'DESC' }, skip, take });
    return toPage(items.map((n) => this.toDto(n)), total, page, size);
  }

  async counts(userId: number) {
    const [notifications, messages] = await Promise.all([
      this.repo.count({ where: { userId, readAt: IsNull() } }),
      this.messages.count({ where: { recipientId: userId, readAt: IsNull() } }),
    ]);
    return { notifications, messages };
  }

  async markRead(userId: number, id: number) {
    const n = await this.repo.findOneBy({ id, userId });
    if (!n) throw notFound('Không tìm thấy thông báo');
    if (!n.readAt) {
      n.readAt = new Date();
      await this.repo.save(n);
    }
    return this.toDto(n);
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, readAt: IsNull() }, { readAt: new Date() });
    return { ok: true };
  }

  async markManyRead(userId: number, ids: number[]) {
    if (ids.length) await this.repo.update({ userId, id: In(ids), readAt: IsNull() }, { readAt: new Date() });
  }

  toDto(n: Notification) {
    return { id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, readAt: n.readAt, createdAt: n.createdAt };
  }
}
