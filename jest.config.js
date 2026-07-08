export default {
  transform: { '^.+\\.jsx?$': 'babel-jest' },
  moduleNameMapper: {
    '\\.(png|jpe?g|gif|webp|svg)$': '<rootDir>/test/fileMock.js',
  },
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/*.config.js',
    '!**/dist/**',
    '!**/build/**',
    '!**/coverage/**',
    '!**/client/index.js',
    '!**/server/index.js',
    '!**/server/server.js',
  ],
};
