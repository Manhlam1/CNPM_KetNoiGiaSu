import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { cfg } from './config/configuration';

export function configureApp(app: NestExpressApplication) {
  const c = cfg();
  app.setGlobalPrefix('api');
  app.enableCors({ origin: [c.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: true });
  // whitelist + forbidNonWhitelisted: báo lỗi nếu body có trường lạ (giống fail-on-unknown-properties)
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useStaticAssets(join(process.cwd(), c.uploadDir), { prefix: '/uploads' });
  app.set('trust proxy', 1);
  return app;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApp(app);

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TutorHub API')
      .setDescription('Nền tảng tìm gia sư có cơ chế giữ tiền (escrow). Mọi response bọc trong ApiResponse { success, data, message, errorCode }.')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, doc);

  const port = cfg().port;
  await app.listen(port);
  Logger.log(`TutorHub backend chạy tại http://localhost:${port}/api  (Swagger: /api/docs)`, 'Bootstrap');
}

if (require.main === module) {
  bootstrap();
}
