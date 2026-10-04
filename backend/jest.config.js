// Unit test: chạy nhanh, không cần MySQL (logic thuần: trạng thái, hoa hồng, chính sách hủy, chữ ký VNPay, sinh slot)
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'src/.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
};
