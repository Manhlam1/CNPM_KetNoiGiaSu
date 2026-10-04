import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Kênh realtime (Socket.IO). Client gửi JWT trong handshake: io({ auth: { token } }).
 * Mỗi người dùng vào phòng "user:<id>"; server đẩy sự kiện tới đúng người:
 *   - notification:new  (thông báo mới)
 *   - message:new       (tin nhắn mới)
 *   - message:read      (đối phương đã đọc)
 */
@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger('Realtime');

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth?.token as string) || '';
      const payload: any = await this.jwt.verifyAsync(token);
      client.data.userId = Number(payload.sub);
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: number, event: string, data: unknown) {
    if (!this.server) return;
    this.server.to(`user:${userId}`).emit(event, data);
  }
}
