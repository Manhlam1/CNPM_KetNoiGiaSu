import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Tham số phân trang chung: ?page=1&size=10 (page bắt đầu từ 1) */
export class PageQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 10;
}

export function skipTake(q: { page?: number; size?: number }) {
  const page = q.page && q.page > 0 ? q.page : 1;
  const size = q.size && q.size > 0 ? Math.min(q.size, 100) : 10;
  return { page, size, skip: (page - 1) * size, take: size };
}
