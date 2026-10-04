// ============================================================
//  Tiền tệ: lưu SỐ NGUYÊN ĐỒNG (BIGINT), không dùng số thực
//  -> tránh sai số làm tròn (thay cho BigDecimal bên Java)
// ============================================================
import { ValueTransformer } from 'typeorm';

/** Chuyển BIGINT (mysql2 trả về string) <-> number. An toàn tới 9 triệu tỷ đồng. */
export const bigintTransformer: ValueTransformer = {
  to: (v: number | null | undefined) => (v === null || v === undefined ? v : Math.round(v)),
  from: (v: string | number | null) => (v === null || v === undefined ? null : Number(v)),
};

/** DECIMAL -> number (dùng cho điểm đánh giá) */
export const decimalTransformer: ValueTransformer = {
  to: (v: number | null | undefined) => v,
  from: (v: string | number | null) => (v === null || v === undefined ? null : Number(v)),
};

/** Làm tròn tới bội số `step` đồng (mặc định 1.000đ) */
export function roundTo(amount: number, step = 1000): number {
  return Math.round(amount / step) * step;
}

export function assertIntegerVnd(amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error(`Số tiền không hợp lệ: ${amount}`);
  }
}
