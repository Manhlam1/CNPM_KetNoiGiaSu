// Integration/e2e test: cần MySQL thật (database tutorhub_test), xem README
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: 'test/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 60000,
  setupFiles: ['<rootDir>/test/setup-env.ts'],
};
