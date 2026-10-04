import { User } from '../entities/user.entity';

/** Không bao giờ trả passwordHash ra ngoài */
export function toUserDto(u: User) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    avatarUrl: u.avatarUrl,
    role: u.role,
    status: u.status,
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
    deletedAt: u.deletedAt ?? null,
  };
}
export type UserDto = ReturnType<typeof toUserDto>;
