import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ApiResponse } from '../api-response';

// ============================================================
//  GlobalExceptionHandler — mọi lỗi đều trả về ApiResponse thống nhất
// ============================================================
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    if (!res || typeof res.status !== 'function') return; // không phải HTTP (vd. websocket)

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Lỗi hệ thống, vui lòng thử lại sau';
    let errorCode = 'INTERNAL_ERROR';

    const anyErr = exception as any;
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (typeof body === 'object' && body !== null) {
        if (Array.isArray(body.message)) {
          // Lỗi từ ValidationPipe (@Valid thất bại)
          message = body.message.join('; ');
          errorCode = 'VALIDATION_FAILED';
        } else {
          message = body.message || exception.message;
          errorCode = body.errorCode || this.codeFor(status);
        }
      } else {
        message = String(body);
        errorCode = this.codeFor(status);
      }
      if (anyErr?.cause?.type === 'entity.parse.failed' || anyErr?.response?.message?.includes?.('JSON')) {
        errorCode = 'MALFORMED_REQUEST';
      }
    } else if (anyErr?.type === 'entity.parse.failed') {
      status = HttpStatus.BAD_REQUEST;
      message = 'JSON không hợp lệ';
      errorCode = 'MALFORMED_REQUEST';
    } else if (exception instanceof QueryFailedError && (anyErr.code === 'ER_DUP_ENTRY' || anyErr.errno === 1062)) {
      status = HttpStatus.CONFLICT;
      message = 'Dữ liệu bị trùng';
      errorCode = 'DUPLICATE';
    } else {
      this.logger.error(anyErr?.message || exception, anyErr?.stack);
    }

    res.status(status).json(ApiResponse.fail(message, errorCode));
  }

  private codeFor(status: number): string {
    switch (status) {
      case 400: return 'BAD_REQUEST';
      case 401: return 'UNAUTHORIZED';
      case 403: return 'FORBIDDEN';
      case 404: return 'NOT_FOUND';
      case 409: return 'CONFLICT';
      case 413: return 'PAYLOAD_TOO_LARGE';
      default: return status >= 500 ? 'INTERNAL_ERROR' : 'ERROR';
    }
  }
}
