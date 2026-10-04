import { createHmac } from 'crypto';

/**
 * Tiện ích VNPay (theo tài liệu tích hợp VNPay 2.1.0):
 *  - Sắp xếp tham số theo tên, mã hóa URL (khoảng trắng -> '+')
 *  - Ký HMAC-SHA512 bằng vnp_HashSecret
 */
export function vnpEncode(v: string): string {
  return encodeURIComponent(v).replace(/%20/g, '+');
}

export function buildSignData(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${vnpEncode(String(params[k]))}`)
    .join('&');
}

export function sign(params: Record<string, string>, secret: string): string {
  return createHmac('sha512', secret).update(Buffer.from(buildSignData(params), 'utf-8')).digest('hex');
}

export function buildPaymentUrl(payUrl: string, params: Record<string, string>, secret: string): string {
  const data = buildSignData(params);
  const hash = createHmac('sha512', secret).update(Buffer.from(data, 'utf-8')).digest('hex');
  return `${payUrl}?${data}&vnp_SecureHash=${hash}`;
}

/** Kiểm tra chữ ký của dữ liệu VNPay gửi về (Return URL / IPN) */
export function verifyReturn(query: Record<string, any>, secret: string): boolean {
  const received = String(query.vnp_SecureHash || '');
  const params: Record<string, string> = {};
  Object.keys(query).forEach((k) => {
    if (k.startsWith('vnp_') && k !== 'vnp_SecureHash' && k !== 'vnp_SecureHashType') params[k] = String(query[k]);
  });
  const expected = sign(params, secret);
  return received.length > 0 && expected.toLowerCase() === received.toLowerCase();
}

/** yyyyMMddHHmmss theo giờ Việt Nam (GMT+7) */
export function vnpDate(d: Date): string {
  const t = new Date(d.getTime() + 7 * 3600_000).toISOString(); // 2026-10-04T18:05:09.000Z
  return t.slice(0, 19).replace(/[-T:]/g, '');
}
