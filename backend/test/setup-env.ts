// Môi trường cho integration test: database riêng tutorhub_test, tắt job nền và seed
process.env.DB_NAME = process.env.TEST_DB_NAME || 'tutorhub_test';
process.env.DB_SYNC = 'true';
process.env.SEED_ON_START = 'false';
process.env.JOBS_ENABLED = 'false';
process.env.MAIL_TRANSPORT = 'console';
process.env.DEMO_MODE = 'true';
process.env.PAYMENT_PROVIDER = 'mock';
process.env.VNPAY_TMN_CODE = 'TESTTMN1';
process.env.VNPAY_HASH_SECRET = 'TESTHASHSECRET';
process.env.VNPAY_PROCESS_ON_RETURN = 'false';
process.env.JWT_SECRET = 'test-secret-0123456789-abcdefghij';
