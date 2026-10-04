import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { toPage } from '../../../common/api-response';
import { badRequest, notFound } from '../../../common/app.exception';
import { Role, UserStatus } from '../../../common/enums';
import { skipTake } from '../../../common/pagination';
import { User } from '../entities/user.entity';
import { toUserDto } from './user.mapper';

export interface UserQuery {
  role?: Role;
  status?: UserStatus;
  q?: string;
  includeDeleted?: boolean;
  page?: number;
  size?: number;
}

/** Quản lý người dùng phía admin */
@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  async list(query: UserQuery) {
    const { page, size, skip, take } = skipTake(query);
    const qb = this.users.createQueryBuilder('u');
    if (query.includeDeleted) qb.withDeleted();
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    if (query.status) qb.andWhere('u.status = :status', { status: query.status });
    if (query.q) {
      qb.andWhere(new Brackets((w) => w.where('u.email LIKE :q', { q: `%${query.q}%` }).orWhere('u.fullName LIKE :q', { q: `%${query.q}%` })));
    }
    qb.orderBy('u.id', 'DESC').skip(skip).take(take);
    const [items, total] = await qb.getManyAndCount();
    return toPage(items.map(toUserDto), total, page, size);
  }

  private async getManageable(actorId: number, id: number) {
    if (actorId === id) throw badRequest('SELF_ACTION', 'Không thể thao tác trên chính tài khoản của bạn');
    const user = await this.users.findOneBy({ id });
    if (!user) throw notFound('Không tìm thấy người dùng');
    if (user.role === Role.ADMIN) throw badRequest('ADMIN_PROTECTED', 'Không thể khóa/xóa tài khoản quản trị viên');
    return user;
  }

  async lock(actorId: number, id: number) {
    const user = await this.getManageable(actorId, id);
    user.status = UserStatus.LOCKED;
    await this.users.save(user);
    return toUserDto(user);
  }

  async unlock(actorId: number, id: number) {
    const user = await this.getManageable(actorId, id);
    user.status = UserStatus.ACTIVE;
    await this.users.save(user);
    return toUserDto(user);
  }

  async softDelete(actorId: number, id: number) {
    await this.getManageable(actorId, id);
    await this.users.softDelete({ id });
    return { id };
  }

  async countByRole() {
    const rows = await this.users.createQueryBuilder('u').select('u.role', 'role').addSelect('COUNT(*)', 'count').groupBy('u.role').getRawMany();
    const out: Record<string, number> = { STUDENT: 0, TUTOR: 0, ADMIN: 0 };
    rows.forEach((r) => (out[r.role] = Number(r.count)));
    return out;
  }
}
