'use client';

/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertTriangle, Cloud, Wind, Droplets, Eye, Gauge } from 'lucide-react';
import {
  getCurrentWeather,
  getWeatherIconUrl,
  formatTemperature,
  formatWindSpeed,
  getWeatherEmoji,
  getWeatherAlert,
  WeatherData
} from '@/lib/weather-service';

interface WeatherDisplayProps {
  initialCity?: string;
  onWeatherUpdate?: (weather: WeatherData) => void;
}

export function WeatherDisplay({ initialCity = 'Kingston,JM', onWeatherUpdate }: WeatherDisplayProps) {
  const [city, setCity] = useState(initialCity);
  const [searchInput, setSearchInput] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchWeather = async (cityName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await getCurrentWeather(cityName);
      
      if (response.success && response.data) {
        setWeather(response.data as WeatherData);
        setCached(response.cached || false);
        setCity(cityName);
        onWeatherUpdate?.(response.data as WeatherData);
      } else {
        setError(response.message || 'Failed to fetch weather data');
      }
    } catch (err) {
      setError('Error fetching weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchWeather(initialCity);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchWeather(searchInput.trim());
      setSearchInput('');
    }
  };

  const alert = weather ? getWeatherAlert(weather) : null;

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle>Weather Search</CardTitle>
          <CardDescription>Enter a city name to get current weather</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="e.g., Kingston,JM or London"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p>Loading weather data...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weather Display */}
      {weather && !loading && (
        <>
          {/* Alert Banner */}
          {alert && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <p>{alert}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Weather Card */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">
                    {weather.location}, {weather.country}
                  </CardTitle>
                  <CardDescription>
                    {cached && '📦 Cached data • '}
                    Last updated: {new Date(weather.timestamp * 1000).toLocaleTimeString()}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold">
                    {formatTemperature(weather.temperature)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Feels like {formatTemperature(weather.feelsLike)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Condition */}
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getWeatherIconUrl(weather.icon)}
                  alt={weather.condition}
                  className="h-16 w-16"
                />
                <div>
                  <p className="text-lg font-semibold">
                    {getWeatherEmoji(weather.condition)} {weather.condition}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{weather.description}</p>
                </div>
              </div>

              {/* Weather Details Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {/* Humidity */}
                <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                  <Droplets className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Humidity</p>
                    <p className="font-semibold">{weather.humidity}%</p>
                  </div>
                </div>

                {/* Wind Speed */}
                <div className="flex items-center gap-2 rounded-lg bg-cyan-50 p-3">
                  <Wind className="h-5 w-5 text-cyan-600" />
                  <div>
                    <p className="text-xs text-gray-600">Wind</p>
                    <p className="font-semibold">{formatWindSpeed(weather.windSpeed)}</p>
                  </div>
                </div>

                {/* Pressure */}
                <div className="flex items-center gap-2 rounded-lg bg-purple-50 p-3">
                  <Gauge className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-gray-600">Pressure</p>
                    <p className="font-semibold">{weather.pressure} hPa</p>
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3">
                  <Eye className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Visibility</p>
                    <p className="font-semibold">{(weather.visibility / 1000).toFixed(1)} km</p>
                  </div>
                </div>

                {/* Cloudiness */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
                  <Cloud className="h-5 w-5 text-gray-600" />
                  <div>
                    <p className="text-xs text-gray-600">Clouds</p>
                    <p className="font-semibold">{weather.cloudiness}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

