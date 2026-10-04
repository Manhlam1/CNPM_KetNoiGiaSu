import { randomBytes } from 'crypto';
import { mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { cfg } from '../config/configuration';
import { badRequest } from './app.exception';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/** Cấu hình multer: lưu file vào uploads/<subdir>, chỉ nhận ảnh/PDF, tối đa 5MB */
export function uploadOptions(subdir: string) {
  return {
    storage: diskStorage({
      destination: (_req: any, _file: any, cb: any) => {
        const dir = join(process.cwd(), cfg().uploadDir, subdir);
        mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req: any, file: Express.Multer.File, cb: any) => {
        cb(null, `${Date.now()}-${randomBytes(6).toString('hex')}${extname(file.originalname).toLowerCase()}`);
      },
    }),
    fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
      if (!ALLOWED.includes(file.mimetype)) return cb(badRequest('INVALID_FILE', 'Chỉ nhận ảnh (jpg, png, webp, gif) hoặc PDF'), false);
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  };
}

/** Đường dẫn công khai của file đã upload */
export function publicUrl(subdir: string, filename: string) {
  return `/uploads/${subdir}/${filename}`;
}
