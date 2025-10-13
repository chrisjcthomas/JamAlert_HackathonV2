// @ts-nocheck
import { jest } from '@jest/globals';

/**
 * Mock implementations for external services used in testing
 */

// Mock Nodemailer
export const mockNodemailer = {
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockImplementation((mailOptions) => {
      // Simulate email sending
      return Promise.resolve({
        messageId: `mock-message-${Date.now()}`,
        accepted: [mailOptions.to],
        rejected: [],
        response: '250 Message queued'
      });
    }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined)
  }))
};

// Mock Twilio SMS Service
export const mockTwilio = {
  messages: {
    create: jest.fn().mockImplementation((messageData) => {
      return Promise.resolve({
        sid: `mock-sms-${Date.now()}`,
        status: 'sent',
        to: messageData.to,
        from: messageData.from,
        body: messageData.body,
        dateCreated: new Date(),
        dateSent: new Date(),
        errorCode: null,
        errorMessage: null
      });
    })
  }
};

// Mock Weather API Service
export const mockWeatherApi = {
  getCurrentWeather: jest.fn().mockImplementation((parish: string) => {
    const mockWeatherData = {
      main: {
        temp: 28.5 + Math.random() * 5, // 28.5-33.5°C
        humidity: 70 + Math.random() * 20, // 70-90%
        pressure: 1010 + Math.random() * 10 // 1010-1020 hPa
      },
      weather: [
        {
          main: Math.random() > 0.7 ? 'Rain' : 'Clear',
          description: Math.random() > 0.7 ? 'light rain' : 'clear sky'
        }
      ],
      wind: {
        speed: Math.random() * 15, // 0-15 m/s
        deg: Math.random() * 360 // 0-360 degrees
      },
      visibility: 8000 + Math.random() * 2000, // 8-10km
      rain: Math.random() > 0.7 ? { '1h': Math.random() * 10 } : undefined,
      dt: Math.floor(Date.now() / 1000)
    };

    return Promise.resolve(mockWeatherData);
  }),

  getWeatherForecast: jest.fn().mockImplementation((parish: string) => {
    const forecast = Array(5).fill(null).map((_, index) => ({
      dt: Math.floor(Date.now() / 1000) + (index * 24 * 60 * 60),
      main: {
        temp: 26 + Math.random() * 8,
        humidity: 65 + Math.random() * 25,
        pressure: 1008 + Math.random() * 15
      },
      weather: [
        {
          main: Math.random() > 0.6 ? 'Rain' : 'Clouds',
          description: Math.random() > 0.6 ? 'moderate rain' : 'scattered clouds'
        }
      ],
      wind: {
        speed: Math.random() * 12,
        deg: Math.random() * 360
      },
      rain: Math.random() > 0.6 ? { '3h': Math.random() * 15 } : undefined
    }));

    return Promise.resolve({ list: forecast });
  })
};

// Mock Jamaica Met Service API
export const mockJamaicaMetApi = {
  getCurrentConditions: jest.fn().mockImplementation((parish: string) => {
    return Promise.resolve({
      parish,
      temperature: 29 + Math.random() * 4,
      humidity: 75 + Math.random() * 15,
      rainfall: Math.random() > 0.8 ? Math.random() * 25 : 0,
      windSpeed: Math.random() * 20,
      windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
      pressure: 1012 + Math.random() * 8,
      visibility: 9 + Math.random() * 1,
      conditions: Math.random() > 0.7 ? 'Rainy' : 'Partly Cloudy',
      floodRisk: Math.random() > 0.9 ? 'HIGH' : Math.random() > 0.7 ? 'MEDIUM' : 'LOW',
      timestamp: new Date().toISOString()
    });
  }),

  getAlerts: jest.fn().mockImplementation(() => {
    const hasAlert = Math.random() > 0.8;
    return Promise.resolve({
      alerts: hasAlert ? [{
        id: `mock-alert-${Date.now()}`,
        type: 'FLOOD_WARNING',
        severity: 'HIGH',
        title: 'Flash Flood Warning',
        description: 'Heavy rainfall expected. Flash flooding possible.',
        affectedParishes: ['KINGSTON', 'ST_ANDREW'],
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()
      }] : []
    });
  })
};

// Mock Azure Notification Hubs
export const mockNotificationHubs = {
  sendNotification: jest.fn().mockImplementation((notification) => {
    return Promise.resolve({
      notificationId: `mock-notification-${Date.now()}`,
      state: 'Enqueued',
      enqueuedTime: new Date().toISOString(),
      startTime: new Date().toISOString(),
      endTime: null,
      notificationBody: notification.body,
      targetPlatforms: notification.platforms || ['gcm', 'apns'],
      outcome: {
        success: Math.floor(Math.random() * 100) + 900, // 900-999 successful
        failure: Math.floor(Math.random() * 10), // 0-9 failures
        results: []
      }
    });
  }),

  createRegistration: jest.fn().mockImplementation((deviceToken, tags) => {
    return Promise.resolve({
      registrationId: `mock-registration-${Date.now()}`,
      deviceToken,
      tags: tags || [],
      expirationTime: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    });
  })
};

// Mock Sharp Image Processing
export const mockSharp = jest.fn().mockImplementation(() => ({
  webp: jest.fn().mockReturnThis(),
  resize: jest.fn().mockReturnThis(),
  toFile: jest.fn().mockResolvedValue({
    format: 'webp',
    width: 800,
    height: 600,
    channels: 3,
    premultiplied: false,
    size: 45678
  }),
  toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data'))
}));

// Mock File System Operations
export const mockFs = {
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock-file-content')),
  unlink: jest.fn().mockResolvedValue(undefined),
  stat: jest.fn().mockResolvedValue({
    isFile: () => true,
    isDirectory: () => false,
    size: 12345,
    mtime: new Date(),
    ctime: new Date()
  })
};

// Mock Axios HTTP Client
export const mockAxios = {
  get: jest.fn().mockImplementation((url) => {
    if (url.includes('weather')) {
      return Promise.resolve({ data: mockWeatherApi.getCurrentWeather('KINGSTON') });
    }
    if (url.includes('met.gov.jm')) {
      return Promise.resolve({ data: mockJamaicaMetApi.getCurrentConditions('KINGSTON') });
    }
    return Promise.resolve({ data: { message: 'Mock response' } });
  }),

  post: jest.fn().mockImplementation((url, data) => {
    return Promise.resolve({
      data: { success: true, id: `mock-${Date.now()}`, ...data },
      status: 200,
      statusText: 'OK'
    });
  }),

  put: jest.fn().mockImplementation((url, data) => {
    return Promise.resolve({
      data: { success: true, updated: true, ...data },
      status: 200,
      statusText: 'OK'
    });
  }),

  delete: jest.fn().mockImplementation((url) => {
    return Promise.resolve({
      data: { success: true, deleted: true },
      status: 200,
      statusText: 'OK'
    });
  })
};

/**
 * Setup all mocks for testing
 */
export function setupExternalServiceMocks() {
  // Mock nodemailer
  jest.mock('nodemailer', () => mockNodemailer);

  // Mock Twilio
  jest.mock('twilio', () => jest.fn(() => mockTwilio));

  // Mock Sharp
  jest.mock('sharp', () => mockSharp);

  // Mock fs/promises
  jest.mock('fs/promises', () => mockFs);

  // Mock axios
  jest.mock('axios', () => mockAxios);

  console.log('External service mocks initialized');
}

/**
 * Reset all mocks between tests
 */
export function resetExternalServiceMocks() {
  Object.values(mockNodemailer).forEach(mock => {
    if (typeof mock === 'object' && mock.sendMail) {
      mock.sendMail.mockClear();
      mock.verify.mockClear();
    }
  });

  mockTwilio.messages.create.mockClear();
  mockWeatherApi.getCurrentWeather.mockClear();
  mockWeatherApi.getWeatherForecast.mockClear();
  mockJamaicaMetApi.getCurrentConditions.mockClear();
  mockJamaicaMetApi.getAlerts.mockClear();
  mockNotificationHubs.sendNotification.mockClear();
  mockNotificationHubs.createRegistration.mockClear();
  mockSharp.mockClear();
  
  Object.values(mockFs).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear();
    }
  });

  Object.values(mockAxios).forEach(mock => {
    if (typeof mock === 'function') {
      mock.mockClear();
    }
  });

  console.log('External service mocks reset');
}

/**
 * Simulate service failures for error testing
 */
export function simulateServiceFailures() {
  // Make email service fail
  mockNodemailer.createTransport().sendMail.mockRejectedValue(
    new Error('SMTP connection failed')
  );

  // Make SMS service fail
  mockTwilio.messages.create.mockRejectedValue(
    new Error('SMS delivery failed')
  );

  // Make weather API fail
  mockWeatherApi.getCurrentWeather.mockRejectedValue(
    new Error('Weather API timeout')
  );

  // Make notification service fail
  mockNotificationHubs.sendNotification.mockRejectedValue(
    new Error('Push notification failed')
  );

  console.log('Service failures simulated');
}

/**
 * Restore normal service behavior
 */
export function restoreServiceBehavior() {
  resetExternalServiceMocks();
  setupExternalServiceMocks();
  console.log('Normal service behavior restored');
}
