import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tap } from 'rxjs';
import { AuditService } from '../../modules/m1-account/audit/audit.service';
import { AUDIT_KEY } from '../decorators';

const SENSITIVE = ['password', 'newPassword', 'oldPassword', 'code', 'token'];

/**
 * Ghi audit log sau khi thao tác admin gắn @Audit('...') chạy THÀNH CÔNG
 * (tương đương AOP @AfterReturning bên Spring).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private readonly reflector: Reflector, private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const action = this.reflector.get<string>(AUDIT_KEY, ctx.getHandler());
    if (!action || ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest();
    return next.handle().pipe(
      tap(() => {
        const body = { ...(req.body || {}) };
        for (const k of SENSITIVE) if (k in body) body[k] = '***';
        this.audit
          .record({
            actorId: req.user?.id ?? null,
            actorEmail: req.user?.email ?? null,
            action,
            method: req.method,
            path: String(req.originalUrl || req.url).slice(0, 255),
            targetId: req.params?.id ?? req.params?.key ?? null,
            detail: Object.keys(body).length ? JSON.stringify(body).slice(0, 2000) : null,
            ip: (req.ip || '').slice(0, 64),
          })
          .catch((e) => this.logger.warn(`Không ghi được audit log: ${e.message}`));
      }),
    );
  }
}
