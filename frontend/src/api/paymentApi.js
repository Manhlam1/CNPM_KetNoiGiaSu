// M4 - Thanh toán, Escrow & Ví
import { http } from './client';

export const paymentApi = {
  providers: () => http.get('/payments/providers'),
  start: (bookingId, provider) => http.post(`/payments/bookings/${bookingId}`, provider ? { provider } : {}),
  mine: (params) => http.get('/payments/me', params),
  mockInfo: (txnRef) => http.get(`/payments/mock/${encodeURIComponent(txnRef)}`),
  mockComplete: (txnRef, success) => http.post(`/payments/mock/${encodeURIComponent(txnRef)}/complete`, { success }),
};

export const walletApi = {
  me: () => http.get('/wallets/me'),
  transactions: (params) => http.get('/wallets/me/transactions', params),
  withdraw: (body) => http.post('/withdrawals', body),
  myWithdrawals: (params) => http.get('/withdrawals/me', params),
};

export const adminFinanceApi = {
  summary: () => http.get('/admin/finance/summary'),
  payments: (params) => http.get('/admin/payments', params),
  withdrawals: (params) => http.get('/admin/withdrawals', params),
  approveWithdrawal: (id, note) => http.post(`/admin/withdrawals/${id}/approve`, note ? { note } : {}),
  rejectWithdrawal: (id, note) => http.post(`/admin/withdrawals/${id}/reject`, { note }),
};

/** Bắt đầu thanh toán: đi tới cổng thanh toán (cổng giả lập là trang nội bộ) */
export async function goToPayment(bookingId, navigate) {
  const r = await paymentApi.start(bookingId);
  if (r.paymentUrl.startsWith('/')) navigate(r.paymentUrl);
  else window.location.href = r.paymentUrl;
}
