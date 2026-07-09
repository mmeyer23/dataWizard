export default {
  watchman: false,
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
  coverageThreshold: {
    './shared/apiContracts.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/generation/datasetPlan.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/sqlPolicy/validateSql.js': {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './server/database/postgresExecution.js': {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
