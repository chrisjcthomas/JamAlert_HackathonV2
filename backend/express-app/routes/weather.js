const express = require('express');
const axios = require('axios');
const router = express.Router();

// Cache for weather data with TTL
const weatherCache = new Map();
const CACHE_TTL_MS = (process.env.WEATHER_CACHE_TTL_MINUTES || 5) * 60 * 1000;

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || 'demo';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || OPENWEATHER_API_KEY === 'demo';

/**
 * Generate mock weather data for testing
 */
function generateMockWeather(city) {
  const mockData = {
    'Kingston,JM': {
      name: 'Kingston',
      sys: { country: 'JM', sunrise: 1634567890, sunset: 1634610890 },
      main: { temp: 28.5, feels_like: 30.2, humidity: 75, pressure: 1013 },
      wind: { speed: 12.5, deg: 180 },
      clouds: { all: 45 },
      weather: [{ main: 'Partly Cloudy', description: 'partly cloudy', icon: '02d' }],
      visibility: 10000,
      dt: Math.floor(Date.now() / 1000)
    },
    'Montego Bay,JM': {
      name: 'Montego Bay',
      sys: { country: 'JM', sunrise: 1634567890, sunset: 1634610890 },
      main: { temp: 29.1, feels_like: 31.0, humidity: 72, pressure: 1012 },
      wind: { speed: 14.2, deg: 200 },
      clouds: { all: 30 },
      weather: [{ main: 'Clear', description: 'clear sky', icon: '01d' }],
      visibility: 10000,
      dt: Math.floor(Date.now() / 1000)
    },
    'Negril,JM': {
      name: 'Negril',
      sys: { country: 'JM', sunrise: 1634567890, sunset: 1634610890 },
      main: { temp: 27.8, feels_like: 29.5, humidity: 78, pressure: 1014 },
      wind: { speed: 11.3, deg: 170 },
      clouds: { all: 55 },
      weather: [{ main: 'Rainy', description: 'light rain', icon: '10d' }],
      visibility: 8000,
      dt: Math.floor(Date.now() / 1000)
    }
  };

  return mockData[city] || mockData['Kingston,JM'];
}

/**
 * Get cached weather data if available and not expired
 */
function getCachedWeather(cacheKey) {
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`✅ Cache hit for ${cacheKey}`);
    return cached.data;
  }
  if (cached) {
    weatherCache.delete(cacheKey);
  }
  return null;
}

/**
 * Set weather data in cache
 */
function setCachedWeather(cacheKey, data) {
  weatherCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  console.log(`💾 Cached weather data for ${cacheKey}`);
}

/**
 * Format weather response
 */
function formatWeatherResponse(data, type = 'current') {
  if (type === 'current') {
    return {
      location: data.name,
      country: data.sys?.country,
      temperature: data.main?.temp,
      feelsLike: data.main?.feels_like,
      humidity: data.main?.humidity,
      pressure: data.main?.pressure,
      windSpeed: data.wind?.speed,
      windDegree: data.wind?.deg,
      cloudiness: data.clouds?.all,
      condition: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
      visibility: data.visibility,
      sunrise: data.sys?.sunrise,
      sunset: data.sys?.sunset,
      timestamp: data.dt
    };
  } else if (type === 'forecast') {
    return {
      location: data.city?.name,
      country: data.city?.country,
      forecasts: data.list?.map(item => ({
        temperature: item.main?.temp,
        feelsLike: item.main?.feels_like,
        humidity: item.main?.humidity,
        condition: item.weather?.[0]?.main,
        description: item.weather?.[0]?.description,
        icon: item.weather?.[0]?.icon,
        windSpeed: item.wind?.speed,
        timestamp: item.dt,
        dateTime: new Date(item.dt * 1000).toISOString()
      })) || []
    };
  }
}

/**
 * GET /api/weather
 * Query parameters:
 *   - city (required): City name or "city,country_code"
 *   - type (optional): 'current' or 'forecast' (default: 'current')
 */
router.get('/', async (req, res) => {
  try {
    const { city, type = 'current' } = req.query;

    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'city parameter is required'
      });
    }

    // Validate type parameter
    if (!['current', 'forecast'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type parameter',
        message: 'type must be either "current" or "forecast"'
      });
    }

    const cacheKey = `${city}_${type}`;

    // Check cache first
    const cachedData = getCachedWeather(cacheKey);
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Use mock data or fetch from OpenWeather API
    let response;

    if (USE_MOCK_DATA) {
      console.log(`📦 Using mock weather data for ${city} (${type})...`);
      const mockData = generateMockWeather(city);
      response = { data: mockData };
    } else {
      // Fetch from OpenWeather API
      let url;
      if (type === 'current') {
        url = `${OPENWEATHER_BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      } else {
        url = `${OPENWEATHER_BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      }

      console.log(`🌍 Fetching weather for ${city} (${type})...`);
      response = await axios.get(url, { timeout: 10000 });
    }

    const formattedData = formatWeatherResponse(response.data, type);
    setCachedWeather(cacheKey, formattedData);

    res.json({
      success: true,
      data: formattedData,
      cached: false,
      mock: USE_MOCK_DATA
    });
  } catch (error) {
    console.error('❌ Weather API error:', error.message);

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        error: 'City not found',
        message: `Weather data for "${req.query.city}" could not be found`
      });
    }

    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'API key invalid',
        message: 'OpenWeather API key is not configured or invalid'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Weather service error',
      message: error.message || 'Failed to fetch weather data'
    });
  }
});

/**
 * GET /api/weather/cache-stats
 * Get cache statistics
 */
router.get('/cache-stats', (req, res) => {
  const stats = {
    cacheSize: weatherCache.size,
    cachedLocations: Array.from(weatherCache.keys()),
    ttlMinutes: process.env.WEATHER_CACHE_TTL_MINUTES || 5
  };

  res.json({
    success: true,
    data: stats
  });
});

/**
 * DELETE /api/weather/cache
 * Clear weather cache
 */
router.delete('/cache', (req, res) => {
  const size = weatherCache.size;
  weatherCache.clear();

  res.json({
    success: true,
    message: `Cleared ${size} cached weather entries`
  });
});

module.exports = router;

