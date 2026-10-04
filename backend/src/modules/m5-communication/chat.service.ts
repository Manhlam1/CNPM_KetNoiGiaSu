import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThan, Repository } from 'typeorm';
import { badRequest, forbidden, notFound } from '../../common/app.exception';
import { AuthUser } from '../../common/decorators';
import { Role, UserStatus } from '../../common/enums';
import { User } from '../m1-account/entities/user.entity';
import { Booking } from '../m3-booking/entities/booking.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Chat 1-1 học viên <-> gia sư. Tin nhắn gửi qua REST, server đẩy realtime qua Socket.IO
 * ("message:new") tới cả hai người. Lịch sử lưu DB để admin xem khi xử lý tranh chấp.
 */
@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation) private readonly convs: Repository<Conversation>,
    @InjectRepository(Message) private readonly msgs: Repository<Message>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectDataSource() private readonly ds: DataSource,
    private readonly gateway: RealtimeGateway,
  ) {}

  /** Mở (hoặc lấy lại) hội thoại với người kia */
  async start(viewer: AuthUser, otherUserId: number) {
    if (!otherUserId || otherUserId === viewer.id) throw badRequest('INVALID_RECIPIENT', 'Người nhận không hợp lệ');
    const other = await this.users.findOneBy({ id: otherUserId });
    if (!other || other.status !== UserStatus.ACTIVE) throw notFound('Không tìm thấy người nhận');

    let studentId: number;
    let tutorUserId: number;
    if (viewer.role === Role.STUDENT && other.role === Role.TUTOR) {
      studentId = viewer.id;
      tutorUserId = other.id;
    } else if (viewer.role === Role.TUTOR && other.role === Role.STUDENT) {
      // Gia sư chỉ nhắn được học viên đã từng đặt lịch với mình (tránh spam)
      const hasBooking = await this.ds.getRepository(Booking).exists({ where: { studentId: other.id, tutorUserId: viewer.id } });
      const existing = await this.convs.findOneBy({ studentId: other.id, tutorUserId: viewer.id });
      if (!hasBooking && !existing) throw forbidden('Bạn chỉ nhắn được học viên đã đặt lịch hoặc đã nhắn cho bạn');
      studentId = other.id;
      tutorUserId = viewer.id;
    } else {
      throw badRequest('INVALID_RECIPIENT', 'Chỉ học viên và gia sư nhắn tin được với nhau');
    }

    await this.convs
      .createQueryBuilder()
      .insert()
      .into(Conversation)
      .values({ studentId, tutorUserId, createdAt: new Date(), updatedAt: new Date() })
      .orIgnore()
      .updateEntity(false)
      .execute();
    const c = await this.convs.findOneOrFail({ where: { studentId, tutorUserId }, relations: { student: true, tutorUser: true } });
    return this.convDto(c, viewer.id, 0);
  }

  private async getForViewer(viewer: AuthUser, id: number) {
    const c = await this.convs.findOne({ where: { id }, relations: { student: true, tutorUser: true } });
    if (!c) throw notFound('Không tìm thấy hội thoại');
    if (viewer.role !== Role.ADMIN && c.studentId !== viewer.id && c.tutorUserId !== viewer.id) throw forbidden('Bạn không thuộc hội thoại này');
    return c;
  }

  async list(viewer: AuthUser) {
    const where = viewer.role === Role.TUTOR ? { tutorUserId: viewer.id } : { studentId: viewer.id };
    const convs = await this.convs.find({ where, relations: { student: true, tutorUser: true }, order: { updatedAt: 'DESC', id: 'DESC' } });
    const unread = await this.msgs
      .createQueryBuilder('m')
      .select('m.conversationId', 'cid')
      .addSelect('COUNT(*)', 'n')
      .where('m.recipientId = :uid AND m.readAt IS NULL', { uid: viewer.id })
      .groupBy('m.conversationId')
      .getRawMany();
    const map = new Map(unread.map((r) => [Number(r.cid), Number(r.n)]));
    return convs.map((c) => this.convDto(c, viewer.id, map.get(c.id) || 0));
  }

  async get(viewer: AuthUser, id: number) {
    const c = await this.getForViewer(viewer, id);
    return this.convDto(c, viewer.id, 0);
  }

  async messages(viewer: AuthUser, id: number, beforeId?: number, limit = 40) {
    await this.getForViewer(viewer, id);
    const where: any = { conversationId: id };
    if (beforeId) where.id = LessThan(beforeId);
    const rows = await this.msgs.find({ where, order: { id: 'DESC' }, take: Math.min(limit, 100) });
    return rows.reverse().map((m) => this.msgDto(m));
  }

  async send(viewer: AuthUser, id: number, contentRaw: string) {
    const content = (contentRaw || '').trim();
    if (!content) throw badRequest('EMPTY_MESSAGE', 'Tin nhắn trống');
    if (content.length > 2000) throw badRequest('MESSAGE_TOO_LONG', 'Tin nhắn tối đa 2000 ký tự');
    const c = await this.getForViewer(viewer, id);
    if (viewer.role === Role.ADMIN) throw forbidden('Quản trị viên chỉ xem, không gửi tin trong hội thoại');
    const recipientId = c.studentId === viewer.id ? c.tutorUserId : c.studentId;
    const m = await this.msgs.save(this.msgs.create({ conversationId: c.id, senderId: viewer.id, recipientId, content }));
    c.lastMessageAt = m.createdAt;
    c.lastMessagePreview = content.slice(0, 200);
    await this.convs.save(c);
    const dto = this.msgDto(m);
    this.gateway.emitToUser(recipientId, 'message:new', dto);
    this.gateway.emitToUser(viewer.id, 'message:new', dto);
    return dto;
  }

  async markRead(viewer: AuthUser, id: number) {
    const c = await this.getForViewer(viewer, id);
    const res = await this.msgs.update({ conversationId: c.id, recipientId: viewer.id, readAt: IsNull() }, { readAt: new Date() });
    if (res.affected) {
      const otherId = c.studentId === viewer.id ? c.tutorUserId : c.studentId;
      this.gateway.emitToUser(otherId, 'message:read', { conversationId: c.id, readerId: viewer.id });
      this.gateway.emitToUser(viewer.id, 'counts:refresh', {});
    }
    return { updated: res.affected ?? 0 };
  }

  /** Cho admin xem hội thoại giữa 2 bên khi xử lý tranh chấp */
  async between(studentId: number, tutorUserId: number) {
    const c = await this.convs.findOneBy({ studentId, tutorUserId });
    if (!c) return { conversationId: null, messages: [] };
    const rows = await this.msgs.find({ where: { conversationId: c.id }, order: { id: 'ASC' }, take: 500 });
    return { conversationId: c.id, messages: rows.map((m) => this.msgDto(m)) };
  }

  private convDto(c: Conversation, viewerId: number, unread: number) {
    const otherIsTutor = c.studentId === viewerId;
    const other = otherIsTutor ? c.tutorUser : c.student;
    return {
      id: c.id,
      studentId: c.studentId,
      tutorUserId: c.tutorUserId,
      other: other ? { id: other.id, fullName: other.fullName, avatarUrl: other.avatarUrl, role: other.role } : null,
      lastMessageAt: c.lastMessageAt,
      lastMessagePreview: c.lastMessagePreview,
      unread,
    };
  }

  private msgDto(m: Message) {
    return { id: m.id, conversationId: m.conversationId, senderId: m.senderId, content: m.content, createdAt: m.createdAt, readAt: m.readAt };
  }
}
