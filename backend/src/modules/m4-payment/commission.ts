/**
 * Tính hoa hồng bằng số nguyên (tránh sai số số thực):
 * percent đổi sang phần vạn (basis point), commission = round(amount * bps / 10000).
 * Bảo đảm commission + tutorNet = amount.
 */
export function splitCommission(amount: number, percent: number) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error(`Số tiền không hợp lệ: ${amount}`);
  const bps = Math.round(percent * 100);
  const commission = Math.round((amount * bps) / 10000);
  return { commission, tutorNet: amount - commission };
}
