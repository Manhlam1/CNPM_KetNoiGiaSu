import { Module } from '@nestjs/common';
import { DevMailController } from './dev-mail.controller';

/** Công cụ hỗ trợ demo: hộp thư dev, tua thời gian */
@Module({
  controllers: [DevMailController],
})
export class DemoModule {}
