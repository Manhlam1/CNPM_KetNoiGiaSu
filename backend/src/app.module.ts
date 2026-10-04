import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { cfg } from './config/configuration';
import { DemoModule } from './modules/demo/demo.module';
import { AccountModule } from './modules/m1-account/account.module';
import { SystemConfigModule } from './modules/m1-account/system-config/system-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'mysql',
        ...cfg().db,
        timezone: 'Z', // lưu DATETIME theo UTC
        charset: 'utf8mb4_unicode_ci',
        autoLoadEntities: true,
        supportBigNumbers: true,
        bigNumberStrings: true,
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    CommonModule,
    SystemConfigModule,
    AccountModule,
    DemoModule,
  ],
})
export class AppModule {}
