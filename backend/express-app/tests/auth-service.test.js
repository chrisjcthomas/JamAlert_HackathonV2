
const path = require('path');

describe('Auth Service Security', () => {
  let originalEnv;
  let exitMock;
  let consoleErrorMock;
  let consoleWarnMock;
  let consoleLogMock;

  beforeEach(() => {
    // Save original env
    originalEnv = { ...process.env };

    // Mock process.exit
    exitMock = jest.spyOn(process, 'exit').mockImplementation(() => {});

    // Mock console methods
    consoleErrorMock = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogMock = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Mock dependencies to prevent side effects and errors
    jest.mock('bcryptjs', () => ({
      hash: jest.fn().mockResolvedValue('hashed_password'),
      compare: jest.fn().mockResolvedValue(true),
    }));

    // Mock uuid to avoid ESM issues if any
    jest.mock('uuid', () => ({
      v4: jest.fn().mockReturnValue('mock-uuid'),
    }));

    // Mock dotenv to avoid overwriting our test env vars
    jest.mock('dotenv', () => ({
      config: jest.fn(),
    }));

    // Reset modules to ensure fresh execution
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test('should exit in production if JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;

    jest.isolateModules(() => {
      require('../auth-service');
    });

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('FATAL ERROR'));
  });

  test('should exit in production if JWT_SECRET is default weak value', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'your-secret-key-change-in-production';

    jest.isolateModules(() => {
      require('../auth-service');
    });

    expect(exitMock).toHaveBeenCalledWith(1);
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('FATAL ERROR'));
  });

  test('should NOT exit in production if JWT_SECRET is strong', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'strong-secret-value';

    jest.isolateModules(() => {
      require('../auth-service');
    });

    expect(exitMock).not.toHaveBeenCalled();
  });

  test('should warn but NOT exit in development if JWT_SECRET is missing', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;

    jest.isolateModules(() => {
      require('../auth-service');
    });

    expect(exitMock).not.toHaveBeenCalled();
    expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('SECURITY WARNING'));
  });
});
