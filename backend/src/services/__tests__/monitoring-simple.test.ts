import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InvocationContext } from '@azure/functions';

// Simple test to verify monitoring service structure
describe('MonitoringService - Simple Tests', () => {
  let mockContext: InvocationContext;

  beforeEach(() => {
    mockContext = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        metric: jest.fn()
      }
    } as any;
  });

  it('should have monitoring service available', () => {
    // Test that the monitoring service can be imported
    expect(() => {
      require('../monitoring.service');
    }).not.toThrow();
  });

  it('should have telemetry service available', () => {
    // Test that the telemetry service can be imported
    expect(() => {
      require('../../lib/telemetry');
    }).not.toThrow();
  });

  it('should have admin health function available', () => {
    // Test that the admin health function can be imported
    expect(() => {
      require('../../functions/admin-health');
    }).not.toThrow();
  });

  it('should have system monitor function available', () => {
    // Test that the system monitor function can be imported
    expect(() => {
      require('../../functions/system-monitor');
    }).not.toThrow();
  });

  it('should have daily cleanup function available', () => {
    // Test that the daily cleanup function can be imported
    expect(() => {
      require('../../functions/daily-cleanup');
    }).not.toThrow();
  });
});