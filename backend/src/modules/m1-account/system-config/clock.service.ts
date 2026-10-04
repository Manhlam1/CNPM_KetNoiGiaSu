import { Injectable, OnModuleInit } from '@nestjs/common';
import { HIDDEN_KEYS, SystemConfigService } from './system-config.service';

/**
 * Đồng hồ nghiệp vụ. Mọi mốc thời gian nghiệp vụ (giữ slot, hết giờ học, tự giải ngân)
 * đều lấy từ đây thay vì new Date(), để lúc demo admin có thể "tua thời gian"
 * (vd. +48 giờ) mà không phải chờ thật. Độ lệch lưu trong system_configs.
 */
@Injectable()
export class ClockService implements OnModuleInit {
  private offsetMs = 0;

  constructor(private readonly configs: SystemConfigService) {}

  async onModuleInit() {
    await this.configs.init();
    this.offsetMs = Number(this.configs.getRaw(HIDDEN_KEYS.timeOffset) ?? 0) || 0;
  }

  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }

  getOffsetMs() {
    return this.offsetMs;
  }

  async travel(hours: number) {
    this.offsetMs += Math.round(hours * 3600_000);
    await this.configs.setRaw(HIDDEN_KEYS.timeOffset, String(this.offsetMs));
    return this.status();
  }

  async reset() {
    this.offsetMs = 0;
    await this.configs.setRaw(HIDDEN_KEYS.timeOffset, '0');
    return this.status();
  }

  status() {
    return { now: this.now().toISOString(), realNow: new Date().toISOString(), offsetHours: +(this.offsetMs / 3600_000).toFixed(2) };
  }
}
