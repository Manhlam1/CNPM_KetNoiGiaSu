import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { cfg } from '../../config/configuration';
import { AvailabilityService } from './availability.service';
import { BookingsService } from './bookings.service';

/**
 * Job chạy định kỳ (mỗi 30 giây) chuyển trạng thái tự động:
 *  1) Hết hạn giữ chỗ chưa thanh toán     PENDING_PAYMENT -> EXPIRED
 *  2) Hết giờ học                          CONFIRMED -> AWAITING_CONFIRMATION
 *  3) Quá hạn khiếu nại không ai xác nhận AWAITING_CONFIRMATION -> COMPLETED (tự giải ngân)
 *  4) Mỗi giờ: sinh thêm slot từ lịch lặp tuần
 */
@Injectable()
export class BookingJobsService {
  private readonly logger = new Logger('BookingJobs');
  private running = false;
  private lastRegen = 0;

  constructor(
    private readonly bookings: BookingsService,
    private readonly availability: AvailabilityService,
  ) {}

  @Interval(30_000)
  async tick() {
    if (!cfg().jobsEnabled) return;
    await this.runAll(false).catch((e) => this.logger.error(e.message));
  }

  async runAll(forceRegenerate = true) {
    if (this.running) return { skipped: true };
    this.running = true;
    try {
      const expired = await this.bookings.expireHolds();
      const awaiting = await this.bookings.markAwaiting();
      const completed = await this.bookings.autoComplete();
      let slotsCreated = 0;
      if (forceRegenerate || Date.now() - this.lastRegen > 3600_000) {
        slotsCreated = await this.availability.regenerateAll();
        this.lastRegen = Date.now();
      }
      if (expired || awaiting || completed) this.logger.log(`Hết hạn ${expired}, chờ xác nhận ${awaiting}, tự giải ngân ${completed}`);
      return { expired, awaiting, completed, slotsCreated };
    } finally {
      this.running = false;
    }
  }
}
