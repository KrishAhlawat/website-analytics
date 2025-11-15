import 'dotenv/config';

// Setup for Jest tests
// This file runs before all tests

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/analytics_test';
process.env.REDIS_HOST = process.env.TEST_REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.TEST_REDIS_PORT || '6379';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test cleanup
beforeAll(async () => {
  console.log('Test suite starting...');
});

afterAll(async () => {
  console.log('Test suite completed.');
  // Give time for connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});
