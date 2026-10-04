import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map } from 'rxjs';
import { ApiResponse } from '../api-response';
import { RAW_RESPONSE_KEY } from '../decorators';

/** Tự bọc kết quả controller vào ApiResponse.ok(...) */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const raw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (raw || ctx.getType() !== 'http') return next.handle();
    return next.handle().pipe(map((data) => (data instanceof ApiResponse ? data : ApiResponse.ok(data ?? null))));
  }
}
