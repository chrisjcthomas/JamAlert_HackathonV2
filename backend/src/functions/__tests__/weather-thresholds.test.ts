import { 
  getWeatherThresholds, 
  updateWeatherThresholds, 
  getCurrentWeather, 
  triggerWeatherCheck 
} from '../weather-thresholds';
import { WeatherService } from '../../services/weather.service';
import { authenticateAdmin } from '../../middleware/auth.middleware';
import { HttpRequest, InvocationContext } from '@azure/functions';
import { Parish, FloodRisk, AdminRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../services/weather.service');
jest.mock('../../middleware/auth.middleware');

const MockedWeatherService = WeatherService as jest.MockedClass<typeof WeatherService>;
const mockedAuthenticateAdmin = authenticateAdmin as jest.MockedFunction<typeof authenticateAdmin>;

describe('Weather Thresholds Functions', () => {
  let mockWeatherService: jest.Mocked<WeatherService>;
  let mockContext: jest.Mocked<InvocationContext>;
  let mockAdmin: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WeatherService
    mockWeatherService = {
      getThresholds: jest.fn(),
      updateThresholds: jest.fn(),
      getCachedWeatherData: jest.fn(),
      fetchWeatherForParish: jest.fn(),
      fetchAllWeatherData: jest.fn(),
      storeWeatherData: jest.fn(),
      checkThresholds: jest.fn(),
      createWeatherAlerts: jest.fn()
    } as any;

    MockedWeatherService.mockImplementation(() => mockWeatherService);

    // Mock context
    mockContext = {
      log: jest.fn(),
      error: jest.fn(),
      executionContext: {
        invocationId: 'test-invocation-id',
        functionName: 'weatherThresholds',
        functionDirectory: '/test'
      }
    } as any;

    // Mock admin user
    mockAdmin = {
      id: 'admin-1',
      email: 'admin@jamalert.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      isActive: true
    };
  });

  describe('getWeatherThresholds', () => {
    it('should return thresholds for specific parish', async () => {
      const mockThreshold = {
        id: '1',
        parish: Parish.KINGSTON,
        rainfallThreshold: 50,
        windSpeedThreshold: 60,
        floodRiskThreshold: FloodRisk.MEDIUM,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getThresholds.mockResolvedValueOnce(mockThreshold);

      const request = {
        url: 'https://test.com/api/admin/weather/thresholds?parish=KINGSTON'
      } as HttpRequest;

      const response = await getWeatherThresholds(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockThreshold
      });
      expect(mockWeatherService.getThresholds).toHaveBeenCalledWith(Parish.KINGSTON);
    });

    it('should return thresholds for all parishes when no parish specified', async () => {
      const mockThresholds = {
        [Parish.KINGSTON]: {
          id: '1',
          parish: Parish.KINGSTON,
          rainfallThreshold: 50,
          windSpeedThreshold: 60,
          floodRiskThreshold: FloodRisk.MEDIUM,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        [Parish.ST_ANDREW]: null // No thresholds set
      };

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getThresholds
        .mockResolvedValueOnce(mockThresholds[Parish.KINGSTON])
        .mockResolvedValueOnce(mockThresholds[Parish.ST_ANDREW]);

      const request = {
        url: 'https://test.com/api/admin/weather/thresholds'
      } as HttpRequest;

      const response = await getWeatherThresholds(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.data).toHaveProperty(Parish.KINGSTON);
      expect(response.jsonBody.data).toHaveProperty(Parish.ST_ANDREW);
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(null);

      const request = {
        url: 'https://test.com/api/admin/weather/thresholds'
      } as HttpRequest;

      const response = await getWeatherThresholds(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 for invalid parish parameter', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);

      const request = {
        url: 'https://test.com/api/admin/weather/thresholds?parish=INVALID_PARISH'
      } as HttpRequest;

      const response = await getWeatherThresholds(request, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toBe('Invalid query parameters');
    });

    it('should handle service errors', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getThresholds.mockRejectedValueOnce(new Error('Database error'));

      const request = {
        url: 'https://test.com/api/admin/weather/thresholds?parish=KINGSTON'
      } as HttpRequest;

      const response = await getWeatherThresholds(request, mockContext);

      expect(response.status).toBe(500);
      expect(mockContext.error).toHaveBeenCalled();
    });
  });

  describe('updateWeatherThresholds', () => {
    const validUpdateData = {
      parish: Parish.KINGSTON,
      rainfallThreshold: 75,
      windSpeedThreshold: 80,
      floodRiskThreshold: FloodRisk.HIGH
    };

    it('should update thresholds successfully', async () => {
      const updatedThreshold = {
        id: '1',
        ...validUpdateData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.updateThresholds.mockResolvedValueOnce(updatedThreshold);

      const request = {
        json: jest.fn().mockResolvedValueOnce(validUpdateData)
      } as any;

      const response = await updateWeatherThresholds(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: updatedThreshold,
        message: 'Weather thresholds updated for KINGSTON'
      });
      expect(mockWeatherService.updateThresholds).toHaveBeenCalledWith(
        Parish.KINGSTON,
        {
          rainfallThreshold: 75,
          windSpeedThreshold: 80,
          floodRiskThreshold: FloodRisk.HIGH
        }
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(null);

      const request = {
        json: jest.fn().mockResolvedValueOnce(validUpdateData)
      } as any;

      const response = await updateWeatherThresholds(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should return 400 for invalid request data', async () => {
      const invalidData = {
        parish: 'INVALID_PARISH',
        rainfallThreshold: -10, // Invalid negative value
        windSpeedThreshold: 80,
        floodRiskThreshold: FloodRisk.HIGH
      };

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);

      const request = {
        json: jest.fn().mockResolvedValueOnce(invalidData)
      } as any;

      const response = await updateWeatherThresholds(request, mockContext);

      expect(response.status).toBe(400);
      expect(response.jsonBody.success).toBe(false);
      expect(response.jsonBody.error).toBe('Invalid request data');
    });

    it('should log admin actions', async () => {
      const updatedThreshold = {
        id: '1',
        ...validUpdateData,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.updateThresholds.mockResolvedValueOnce(updatedThreshold);

      const request = {
        json: jest.fn().mockResolvedValueOnce(validUpdateData)
      } as any;

      await updateWeatherThresholds(request, mockContext);

      expect(mockContext.log).toHaveBeenCalledWith('Weather thresholds updated', {
        adminId: mockAdmin.id,
        parish: Parish.KINGSTON,
        thresholds: {
          rainfallThreshold: 75,
          windSpeedThreshold: 80,
          floodRiskThreshold: FloodRisk.HIGH
        }
      });
    });
  });

  describe('getCurrentWeather', () => {
    const mockWeatherData = {
      parish: Parish.KINGSTON,
      temperature: 28.5,
      humidity: 75,
      rainfall: 25.5,
      windSpeed: 30.6,
      windDirection: 'S',
      pressure: 1013,
      visibility: 5,
      conditions: 'Heavy Rain',
      floodRisk: FloodRisk.LOW,
      recordedAt: new Date()
    };

    it('should return cached weather data for specific parish', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getCachedWeatherData.mockResolvedValueOnce(mockWeatherData);

      const request = {
        url: 'https://test.com/api/admin/weather/current?parish=KINGSTON'
      } as HttpRequest;

      const response = await getCurrentWeather(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockWeatherData,
        cached: true
      });
    });

    it('should fetch fresh data when no cached data available', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getCachedWeatherData.mockResolvedValueOnce(null);
      mockWeatherService.fetchWeatherForParish.mockResolvedValueOnce(mockWeatherData);

      const request = {
        url: 'https://test.com/api/admin/weather/current?parish=KINGSTON'
      } as HttpRequest;

      const response = await getCurrentWeather(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: mockWeatherData,
        cached: false
      });
      expect(mockWeatherService.fetchWeatherForParish).toHaveBeenCalledWith(Parish.KINGSTON);
    });

    it('should return weather data for all parishes when no parish specified', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.getCachedWeatherData
        .mockResolvedValueOnce(mockWeatherData)
        .mockResolvedValueOnce(null); // No data for second parish

      const request = {
        url: 'https://test.com/api/admin/weather/current'
      } as HttpRequest;

      const response = await getCurrentWeather(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.success).toBe(true);
      expect(response.jsonBody.cached).toBe(true);
      expect(Object.keys(response.jsonBody.data)).toContain(Parish.KINGSTON);
    });
  });

  describe('triggerWeatherCheck', () => {
    const mockWeatherData = [
      {
        parish: Parish.KINGSTON,
        temperature: 28.5,
        humidity: 75,
        rainfall: 25.5,
        windSpeed: 30.6,
        windDirection: 'S',
        pressure: 1013,
        visibility: 5,
        conditions: 'Heavy Rain',
        floodRisk: FloodRisk.LOW,
        recordedAt: new Date()
      }
    ];

    const mockThresholdChecks = [
      {
        parish: Parish.KINGSTON,
        exceeded: true,
        thresholds: {
          rainfall: 50,
          windSpeed: 60,
          floodRisk: FloodRisk.MEDIUM
        },
        actual: {
          rainfall: 65.0,
          windSpeed: 45.0,
          floodRisk: FloodRisk.HIGH
        },
        alertType: 'HEAVY_RAIN' as any,
        severity: 'MEDIUM' as any
      }
    ];

    it('should trigger manual weather check successfully', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.fetchAllWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockWeatherService.storeWeatherData.mockResolvedValueOnce(undefined);
      mockWeatherService.checkThresholds.mockResolvedValueOnce(mockThresholdChecks);
      mockWeatherService.createWeatherAlerts.mockResolvedValueOnce(['alert-1']);

      const request = {} as HttpRequest;

      const response = await triggerWeatherCheck(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody).toEqual({
        success: true,
        data: {
          parishesChecked: 1,
          thresholdViolations: 1,
          alertsCreated: 1,
          weatherData: mockWeatherData,
          thresholdChecks: mockThresholdChecks
        },
        message: 'Weather check completed successfully'
      });

      expect(mockContext.log).toHaveBeenCalledWith('Manual weather check triggered by admin', {
        adminId: mockAdmin.id
      });
    });

    it('should return 401 for unauthenticated requests', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(null);

      const request = {} as HttpRequest;

      const response = await triggerWeatherCheck(request, mockContext);

      expect(response.status).toBe(401);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });

    it('should handle case when no weather data is retrieved', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.fetchAllWeatherData.mockResolvedValueOnce([]);

      const request = {} as HttpRequest;

      const response = await triggerWeatherCheck(request, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Failed to fetch weather data from all sources'
      });
    });

    it('should handle case with no threshold violations', async () => {
      const noViolationsChecks = mockThresholdChecks.map(check => ({ ...check, exceeded: false }));

      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.fetchAllWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockWeatherService.storeWeatherData.mockResolvedValueOnce(undefined);
      mockWeatherService.checkThresholds.mockResolvedValueOnce(noViolationsChecks);
      mockWeatherService.createWeatherAlerts.mockResolvedValueOnce([]);

      const request = {} as HttpRequest;

      const response = await triggerWeatherCheck(request, mockContext);

      expect(response.status).toBe(200);
      expect(response.jsonBody.data.thresholdViolations).toBe(0);
      expect(response.jsonBody.data.alertsCreated).toBe(0);
      expect(response.jsonBody.data.thresholdChecks).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockedAuthenticateAdmin.mockResolvedValueOnce(mockAdmin);
      mockWeatherService.fetchAllWeatherData.mockRejectedValueOnce(new Error('Weather API failed'));

      const request = {} as HttpRequest;

      const response = await triggerWeatherCheck(request, mockContext);

      expect(response.status).toBe(500);
      expect(response.jsonBody).toEqual({
        success: false,
        error: 'Internal server error',
        details: 'Weather API failed'
      });
      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });
});