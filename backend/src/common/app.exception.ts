import { HttpException, HttpStatus } from '@nestjs/common';

// ============================================================
//  AppException — lỗi nghiệp vụ có errorCode để frontend xử lý
// ============================================================
export class AppException extends HttpException {
  constructor(
    message: string,
    public readonly errorCode: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ message, errorCode }, status);
  }
}

export const badRequest = (code: string, message: string) =>
  new AppException(message, code, HttpStatus.BAD_REQUEST);
export const notFound = (message: string, code = 'NOT_FOUND') =>
  new AppException(message, code, HttpStatus.NOT_FOUND);
export const forbidden = (message: string, code = 'FORBIDDEN') =>
  new AppException(message, code, HttpStatus.FORBIDDEN);
export const conflict = (code: string, message: string) =>
  new AppException(message, code, HttpStatus.CONFLICT);
export const unauthorized = (message: string, code = 'UNAUTHORIZED') =>
  new AppException(message, code, HttpStatus.UNAUTHORIZED);
