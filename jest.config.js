const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases (same as in tsconfig.json)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/types/**',
    '!src/**/constants/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/lib/services/credit-manager.service.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './src/lib/services/credit-timing-reconciliation.ts': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './src/lib/session/session-lifecycle-manager.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  testTimeout: 30000, // 30 seconds for integration tests
  maxWorkers: 1, // Run tests serially to avoid race conditions
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)