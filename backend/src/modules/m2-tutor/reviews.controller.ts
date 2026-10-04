import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
import { AuthUser, CurrentUser, Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { PageQueryDto } from '../../common/pagination';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  @ApiProperty() @Type(() => Number) @IsInt() bookingId: number;
  @ApiProperty({ minimum: 1, maximum: 5 }) @Type(() => Number) @IsInt() @Min(1, { message: 'Điểm từ 1 đến 5' }) @Max(5, { message: 'Điểm từ 1 đến 5' }) rating: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) comment?: string;
}
class ReplyDto {
  @ApiProperty() @IsString() @Length(2, 1000, { message: 'Phản hồi từ 2 đến 1000 ký tự' }) reply: string;
}

@ApiTags('M2 - Đánh giá')
@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get('tutors/:id/reviews')
  list(@Param('id', ParseIntPipe) id: number, @Query() q: PageQueryDto) {
    return this.reviews.listForTutor(id, q);
  }

  @ApiBearerAuth()
  @Roles(Role.STUDENT)
  @Post('reviews')
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateReviewDto) {
    return this.reviews.create(u, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.TUTOR)
  @Post('reviews/:id/reply')
  @HttpCode(200)
  reply(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReplyDto) {
    return this.reviews.reply(u, id, dto.reply);
  }
}
