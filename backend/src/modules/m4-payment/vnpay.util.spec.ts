import { buildPaymentUrl, buildSignData, sign, verifyReturn, vnpDate, vnpEncode } from './vnpay.util';

const SECRET = 'TESTSECRET123';

describe('Tiện ích VNPay', () => {
  it('mã hóa khoảng trắng thành dấu +', () => {
    expect(vnpEncode('Thanh toan buoi hoc')).toBe('Thanh+toan+buoi+hoc');
  });

  it('sắp xếp tham số theo tên trước khi ký', () => {
    expect(buildSignData({ vnp_TxnRef: 'A1', vnp_Amount: '100', vnp_Command: 'pay' })).toBe('vnp_Amount=100&vnp_Command=pay&vnp_TxnRef=A1');
  });

  it('URL thanh toán có chữ ký và kiểm tra lại được', () => {
    const url = buildPaymentUrl('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', { vnp_Amount: '30000000', vnp_TxnRef: 'TH1', vnp_OrderInfo: 'Thanh toan BK-000001' }, SECRET);
    const q = Object.fromEntries(new URL(url).searchParams.entries());
    expect(q.vnp_SecureHash).toHaveLength(128);
    expect(verifyReturn(q, SECRET)).toBe(true);
  });

  it('dữ liệu bị sửa (đổi số tiền) thì chữ ký sai', () => {
    const params = { vnp_Amount: '30000000', vnp_TxnRef: 'TH1', vnp_ResponseCode: '00' };
    const q: Record<string, string> = { ...params, vnp_SecureHash: sign(params, SECRET) };
    expect(verifyReturn(q, SECRET)).toBe(true);
    expect(verifyReturn({ ...q, vnp_Amount: '100' }, SECRET)).toBe(false);
    expect(verifyReturn(q, 'OTHER_SECRET')).toBe(false);
    expect(verifyReturn({ ...params }, SECRET)).toBe(false);
  });

  it('định dạng ngày yyyyMMddHHmmss theo GMT+7', () => {
    expect(vnpDate(new Date('2026-10-04T17:05:09Z'))).toBe('20261005000509');
  });
});
