const path = require('path');

// Mock dependencies to avoid actual imports/native bindings
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn().mockReturnValue({ id: 'user_id' }),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock_uuid'),
}));

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Auth Service Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should throw fatal error in production if JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    expect(() => {
      require('../auth-service');
    }).toThrow('FATAL: JWT_SECRET is not defined in production environment');
  });

  test('should use default secret in development if JWT_SECRET is missing (and log warning)', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    // Spy on console.warn
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const authService = require('../auth-service');
    expect(authService.JWT_SECRET).toBe('your-secret-key-change-in-production');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SECURITY WARNING'));

    consoleSpy.mockRestore();
  });

  test('should use provided JWT_SECRET in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'secure-production-secret';

    const authService = require('../auth-service');
    expect(authService.JWT_SECRET).toBe('secure-production-secret');
  });
});
