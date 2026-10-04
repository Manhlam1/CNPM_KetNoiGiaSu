// ============================================================
//  Cấu hình đọc từ biến môi trường (.env). Đọc "lười" mỗi lần gọi
//  để chắc chắn ConfigModule đã nạp file .env trước.
// ============================================================
const bool = (v: string | undefined, d: boolean) => (v === undefined || v === '' ? d : ['1', 'true', 'yes'].includes(v.toLowerCase()));
const num = (v: string | undefined, d: number) => (v === undefined || v === '' ? d : Number(v));

export function cfg() {
  const e = process.env;
  const backendUrl = e.BACKEND_PUBLIC_URL || `http://localhost:${num(e.PORT, 9090)}`;
  return {
    port: num(e.PORT, 9090),
    nodeEnv: e.NODE_ENV || 'development',
    backendUrl,
    frontendUrl: e.FRONTEND_URL || 'http://localhost:5173',
    db: {
      host: e.DB_HOST || 'localhost',
      port: num(e.DB_PORT, 3306),
      username: e.DB_USER || 'tutorhub',
      password: e.DB_PASSWORD || 'tutorhub',
      database: e.DB_NAME || 'tutorhub',
      synchronize: bool(e.DB_SYNC, true),
      logging: bool(e.DB_LOGGING, false),
    },
    jwt: {
      secret: e.JWT_SECRET || 'dev-only-secret-change-me-please-0123456789',
      expiresIn: e.JWT_EXPIRES_IN || '1d',
    },
    mail: {
      transport: (e.MAIL_TRANSPORT || 'console') as 'console' | 'smtp',
      host: e.SMTP_HOST || '',
      port: num(e.SMTP_PORT, 2525),
      user: e.SMTP_USER || '',
      pass: e.SMTP_PASS || '',
      from: e.MAIL_FROM || 'TutorHub <no-reply@tutorhub.local>',
    },
    payment: {
      provider: (e.PAYMENT_PROVIDER || 'mock').toLowerCase() as 'mock' | 'vnpay',
      vnpay: {
        tmnCode: e.VNPAY_TMN_CODE || '',
        hashSecret: e.VNPAY_HASH_SECRET || '',
        payUrl: e.VNPAY_PAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        returnUrl: e.VNPAY_RETURN_URL || `${backendUrl}/api/payments/vnpay/return`,
        // Khi test local không có URL công khai cho IPN, xử lý luôn ở Return URL (idempotent)
        processOnReturn: bool(e.VNPAY_PROCESS_ON_RETURN, true),
      },
    },
    demoMode: bool(e.DEMO_MODE, true),
    seedOnStart: bool(e.SEED_ON_START, true),
    uploadDir: e.UPLOAD_DIR || 'uploads',
    jobsEnabled: bool(e.JOBS_ENABLED, true),
  };
}

export type AppConfig = ReturnType<typeof cfg>;
