import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from './enums';

export const IS_PUBLIC_KEY = 'isPublic';
/** Endpoint không cần đăng nhập */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Giới hạn vai trò (tương đương @PreAuthorize bên Spring) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const AUDIT_KEY = 'auditAction';
/** Ghi audit log cho thao tác admin (tương đương @LogAdminAction + AOP) */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

export const RAW_RESPONSE_KEY = 'rawResponse';
/** Không bọc ApiResponse (dùng cho VNPay IPN/redirect) */
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);

/** Người dùng đang đăng nhập (gắn bởi JwtAuthGuard) */
export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  fullName: string;
}

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const req = ctx.switchToHttp().getRequest();
  return req.user;
});
