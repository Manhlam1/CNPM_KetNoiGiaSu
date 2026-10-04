/**
 * Nạp lại dữ liệu mẫu: XÓA SẠCH database rồi tạo lại bảng + dữ liệu.
 *   npm run seed          (dev, chạy bằng ts-node)
 *   npm run seed:prod     (sau khi build)
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';

async function main() {
  process.env.SEED_RUNNER = '1';
  process.env.JOBS_ENABLED = 'false';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AppModule } = require('../app.module');
  const { SeedService } = require('./seed.service');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const ds = app.get(DataSource);
  await ds.synchronize(true); // drop + tạo lại toàn bộ bảng
  const seed = app.get(SeedService);
  const r = await seed.run();
  console.log('Seed xong:', JSON.stringify(r.invariants));
  await app.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
