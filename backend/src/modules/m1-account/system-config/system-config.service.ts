import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { badRequest, notFound } from '../../../common/app.exception';
import { SystemConfig } from '../entities/system-config.entity';

/** Các khóa cấu hình admin sửa được + giá trị mặc định + giới hạn hợp lệ */
export const CONFIG_DEFS: Record<string, { value: string; description: string; min: number; max: number }> = {
  'commission.percent': { value: '10', description: 'Phần trăm hoa hồng nền tảng thu trên mỗi buổi học', min: 0, max: 50 },
  'booking.holdMinutes': { value: '15', description: 'Thời gian giữ slot chờ thanh toán (phút)', min: 1, max: 120 },
  'escrow.autoReleaseHours': { value: '48', description: 'Sau giờ học bao lâu tự giải ngân nếu học viên không xác nhận/khiếu nại (giờ). Đây cũng là hạn mở tranh chấp.', min: 1, max: 720 },
  'cancel.fullRefundHours': { value: '24', description: 'Học viên hủy trước giờ học ít nhất bao nhiêu giờ thì được hoàn 100%', min: 0, max: 720 },
  'slots.generateWeeks': { value: '4', description: 'Sinh trước slot cho bao nhiêu tuần từ lịch lặp', min: 1, max: 12 },
};

export const HIDDEN_KEYS = { timeOffset: 'demo.timeOffsetMs' };

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private cache = new Map<string, string>();
  private initPromise: Promise<void> | null = null;

  constructor(@InjectRepository(SystemConfig) private readonly repo: Repository<SystemConfig>) {}

  async onModuleInit() {
    await this.init();
  }

  /** Idempotent: các service khác có thể gọi để chắc chắn cấu hình đã nạp */
  init(): Promise<void> {
    if (!this.initPromise) this.initPromise = this.ensureDefaults();
    return this.initPromise;
  }

  async ensureDefaults() {
    const existing = await this.repo.find();
    const have = new Set(existing.map((e) => e.key));
    for (const [key, def] of Object.entries(CONFIG_DEFS)) {
      if (!have.has(key)) {
        await this.repo.save(this.repo.create({ key, value: def.value, description: def.description, updatedAt: new Date() }));
      }
    }
    if (!have.has(HIDDEN_KEYS.timeOffset)) {
      await this.repo.save(this.repo.create({ key: HIDDEN_KEYS.timeOffset, value: '0', description: 'Độ lệch đồng hồ demo (ms)', updatedAt: new Date() }));
    }
    await this.reload();
  }

  async reload() {
    const all = await this.repo.find();
    this.cache = new Map(all.map((c) => [c.key, c.value]));
  }

  getNumber(key: string): number {
    const raw = this.cache.get(key) ?? CONFIG_DEFS[key]?.value;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  commissionPercent() { return this.getNumber('commission.percent'); }
  holdMinutes() { return this.getNumber('booking.holdMinutes'); }
  autoReleaseHours() { return this.getNumber('escrow.autoReleaseHours'); }
  fullRefundHours() { return this.getNumber('cancel.fullRefundHours'); }
  generateWeeks() { return this.getNumber('slots.generateWeeks'); }

  async list() {
    const all = await this.repo.find({ order: { key: 'ASC' } });
    return all
      .filter((c) => CONFIG_DEFS[c.key])
      .map((c) => ({ key: c.key, value: c.value, description: c.description, min: CONFIG_DEFS[c.key].min, max: CONFIG_DEFS[c.key].max, updatedAt: c.updatedAt }));
  }

  async update(key: string, value: string) {
    const def = CONFIG_DEFS[key];
    if (!def) throw notFound(`Không có cấu hình "${key}"`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < def.min || n > def.max) {
      throw badRequest('INVALID_CONFIG_VALUE', `Giá trị phải là số từ ${def.min} đến ${def.max}`);
    }
    await this.repo.update({ key }, { value: String(n), updatedAt: new Date() });
    await this.reload();
    return { key, value: String(n) };
  }

  /** Dùng nội bộ (đồng hồ demo) */
  async setRaw(key: string, value: string) {
    await this.repo.save(this.repo.create({ key, value, updatedAt: new Date() }));
    this.cache.set(key, value);
  }

  getRaw(key: string): string | undefined {
    return this.cache.get(key);
  }
}
