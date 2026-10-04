import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';
import { ChatService } from './chat.service';

class StartConversationDto {
  @ApiProperty({ description: 'userId của người muốn nhắn (gia sư hoặc học viên)' }) @Type(() => Number) @IsInt() userId: number;
}
class SendMessageDto {
  @ApiProperty() @IsString() @MaxLength(2000, { message: 'Tin nhắn tối đa 2000 ký tự' }) content: string;
}
class MessageQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() beforeId?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}

@ApiTags('M5 - Nhắn tin')
@ApiBearerAuth()
@Controller('conversations')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Roles(Role.STUDENT, Role.TUTOR)
  @Post()
  start(@CurrentUser() u: AuthUser, @Body() dto: StartConversationDto) {
    return this.chat.start(u, dto.userId);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.chat.list(u);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.get(u, id);
  }

  @Get(':id/messages')
  messages(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Query() q: MessageQueryDto) {
    return this.chat.messages(u, id, q.beforeId, q.limit);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Post(':id/messages')
  send(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.chat.send(u, id, dto.content);
  }

  @Roles(Role.STUDENT, Role.TUTOR)
  @Post(':id/read')
  @HttpCode(200)
  read(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.chat.markRead(u, id);
  }
}
