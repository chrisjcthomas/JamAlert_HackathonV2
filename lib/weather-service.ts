export interface WeatherData {
  location: string;
  country?: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDegree?: number;
  cloudiness: number;
  condition: string;
  description: string;
  icon: string;
  visibility: number;
  sunrise?: number;
  sunset?: number;
  timestamp: number;
}

export interface ForecastData {
  location: string;
  country?: string;
  forecasts: Array<{
    temperature: number;
    feelsLike: number;
    humidity: number;
    condition: string;
    description: string;
    icon: string;
    windSpeed: number;
    timestamp: number;
    dateTime: string;
  }>;
}

export interface WeatherResponse {
  success: boolean;
  data: WeatherData | ForecastData;
  cached?: boolean;
  error?: string;
  message?: string;
}

/**
 * Get current weather for a city
 */
export async function getCurrentWeather(city: string): Promise<WeatherResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const url = `${baseUrl}/weather?city=${encodeURIComponent(city)}&type=current`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('❌ Failed to fetch current weather:', error);
    return {
      success: false,
      data: {} as WeatherData,
      error: 'Failed to fetch weather',
      message: error.message
    };
  }
}

/**
 * Get weather forecast for a city
 */
export async function getWeatherForecast(city: string): Promise<WeatherResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const url = `${baseUrl}/weather?city=${encodeURIComponent(city)}&type=forecast`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('❌ Failed to fetch weather forecast:', error);
    return {
      success: false,
      data: {} as ForecastData,
      error: 'Failed to fetch forecast',
      message: error.message
    };
  }
}

/**
 * Get OpenWeather icon URL
 */
export function getWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
}

/**
 * Format temperature for display
 */
export function formatTemperature(temp: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    const fahrenheit = (temp * 9/5) + 32;
    return `${fahrenheit.toFixed(1)}°F`;
  }
  return `${temp.toFixed(1)}°C`;
}

/**
 * Format wind speed for display
 */
export function formatWindSpeed(speed: number, unit: 'ms' | 'kmh' | 'mph' = 'kmh'): string {
  let value = speed;
  let unitStr = 'm/s';

  if (unit === 'kmh') {
    value = speed * 3.6;
    unitStr = 'km/h';
  } else if (unit === 'mph') {
    value = speed * 2.237;
    unitStr = 'mph';
  }

  return `${value.toFixed(1)} ${unitStr}`;
}

/**
 * Get weather condition emoji
 */
export function getWeatherEmoji(condition: string): string {
  const conditionMap: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Smoke': '💨',
    'Haze': '🌫️',
    'Dust': '🌪️',
    'Fog': '🌫️',
    'Sand': '🌪️',
    'Ash': '💨',
    'Squall': '💨',
    'Tornado': '🌪️'
  };

  return conditionMap[condition] || '🌤️';
}

/**
 * Check if weather condition is severe
 */
export function isSevereWeather(condition: string): boolean {
  const severeConditions = [
    'Thunderstorm',
    'Tornado',
    'Squall',
    'Snow',
    'Ash'
  ];
  return severeConditions.includes(condition);
}

/**
 * Get weather alert message based on conditions
 */
export function getWeatherAlert(weather: WeatherData): string | null {
  const alerts: string[] = [];

  if (weather.temperature > 35) {
    alerts.push('🔥 Extreme heat warning');
  } else if (weather.temperature < 0) {
    alerts.push('❄️ Extreme cold warning');
  }

  if (weather.windSpeed > 50) {
    alerts.push('💨 High wind warning');
  }

  if (isSevereWeather(weather.condition)) {
    alerts.push(`⚠️ ${weather.condition} warning`);
  }

  if (weather.humidity > 90) {
    alerts.push('💧 High humidity');
  }

  return alerts.length > 0 ? alerts.join(' | ') : null;
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<any> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/cache-stats`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to get cache stats:', error);
    return null;
  }
}

/**
 * Clear weather cache
 */
export async function clearWeatherCache(): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
    const response = await fetch(`${baseUrl}/weather/cache`, { method: 'DELETE' });
    return response.ok;
  } catch (error) {
    console.error('Failed to clear cache:', error);
    return false;
  }
}

