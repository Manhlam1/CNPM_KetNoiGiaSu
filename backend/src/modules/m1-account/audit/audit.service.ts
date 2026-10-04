import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toPage } from '../../../common/api-response';
import { skipTake } from '../../../common/pagination';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  record(entry: Partial<AuditLog>) {
    return this.repo.save(this.repo.create(entry));
  }

  async list(q: { page?: number; size?: number; action?: string; actorEmail?: string }) {
    const { page, size, skip, take } = skipTake(q);
    const qb = this.repo.createQueryBuilder('a').orderBy('a.id', 'DESC').skip(skip).take(take);
    if (q.action) qb.andWhere('a.action = :action', { action: q.action });
    if (q.actorEmail) qb.andWhere('a.actorEmail LIKE :e', { e: `%${q.actorEmail}%` });
    const [items, total] = await qb.getManyAndCount();
    return toPage(items, total, page, size);
  }

  async actions(): Promise<string[]> {
    const rows = await this.repo.createQueryBuilder('a').select('DISTINCT a.action', 'action').orderBy('action').getRawMany();
    return rows.map((r) => r.action);
  }
}
