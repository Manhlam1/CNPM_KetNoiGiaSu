import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../modules/m1-account/entities/user.entity';
import { forbidden, unauthorized } from '../app.exception';
import { IS_PUBLIC_KEY } from '../decorators';
import { UserStatus } from '../enums';

/**
 * Guard toàn cục: đọc header "Authorization: Bearer <token>", kiểm tra JWT,
 * nạp user từ DB (để tài khoản bị khóa/xóa mất quyền ngay lập tức).
 * Endpoint gắn @Public() thì không bắt buộc đăng nhập.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      if (isPublic) return true;
      throw unauthorized('Bạn cần đăng nhập');
    }
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      if (isPublic) return true;
      throw unauthorized('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại', 'TOKEN_INVALID');
    }
    const user = await this.users.findOneBy({ id: Number(payload.sub) });
    if (!user) {
      if (isPublic) return true;
      throw unauthorized('Tài khoản không tồn tại', 'TOKEN_INVALID');
    }
    if (user.status === UserStatus.LOCKED && !isPublic) {
      throw forbidden('Tài khoản đã bị khóa', 'ACCOUNT_LOCKED');
    }
    req.user = { id: user.id, email: user.email, role: user.role, fullName: user.fullName };
    return true;
  }
}
