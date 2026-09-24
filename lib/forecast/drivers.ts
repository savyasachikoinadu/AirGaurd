// Forecast drivers — identifies key meteorological and pollutant factors
// driving the forecast, based on actual data.

import type {
  ForecastPoint,
  WeatherReadings,
  PollutantReadings,
  ForecastDriver,
} from '../types';

export function identifyForecastDrivers(
  forecast: ForecastPoint[],
  weather: WeatherReadings,
  pollutants: PollutantReadings,
): ForecastDriver[] {
  const drivers: ForecastDriver[] = [];
  const current = forecast[0];
  const next6h = forecast[1];
  if (!current) return drivers;

  // 1. PM2.5 trend
  const pm25Change = next6h ? next6h.pollutants.pm25 - current.pollutants.pm25 : 0;
  if (Math.abs(pm25Change) > 2) {
    drivers.push({
      factor: 'pm25_trend',
      direction: pm25Change > 0 ? 'increase' : 'decrease',
      description: `PM2.5 ${pm25Change > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(pm25Change).toFixed(1)} µg/m³`,
      weight: Math.min(1, Math.abs(pm25Change) / 15),
    });
  }

  // 2. PM10 trend
  const pm10Change = next6h ? next6h.pollutants.pm10 - current.pollutants.pm10 : 0;
  if (Math.abs(pm10Change) > 3) {
    drivers.push({
      factor: 'pm10_trend',
      direction: pm10Change > 0 ? 'increase' : 'decrease',
      description: `PM10 ${pm10Change > 0 ? 'increasing' : 'decreasing'} by ${Math.abs(pm10Change).toFixed(1)} µg/m³`,
      weight: Math.min(0.8, Math.abs(pm10Change) / 20),
    });
  }

  // 3. Wind dispersion
  if (weather.windSpeedKph < 5) {
    drivers.push({
      factor: 'low_wind',
      direction: 'increase',
      description: `Low wind speed (${weather.windSpeedKph} km/h) limits pollutant dispersion`,
      weight: 0.7,
    });
  } else if (weather.windSpeedKph > 20) {
    drivers.push({
      factor: 'high_wind',
      direction: 'decrease',
      description: `Strong wind (${weather.windSpeedKph} km/h) improves pollutant dispersion`,
      weight: 0.6,
    });
  }

  // 4. Humidity
  if (weather.humidity > 70) {
    drivers.push({
      factor: 'high_humidity',
      direction: 'increase',
      description: `High humidity (${weather.humidity}%) may promote secondary particulate formation`,
      weight: 0.4,
    });
  } else if (weather.humidity < 30) {
    drivers.push({
      factor: 'low_humidity',
      direction: 'neutral',
      description: `Low humidity (${weather.humidity}%) — minimal secondary particulate formation`,
      weight: 0.2,
    });
  }

  // 5. Rainfall
  if (weather.precipitationMm > 2) {
    drivers.push({
      factor: 'rainfall_washout',
      direction: 'decrease',
      description: `Rainfall (${weather.precipitationMm} mm) may wash out particulate pollution`,
      weight: 0.65,
    });
  } else if (weather.precipitationMm > 0.5) {
    drivers.push({
      factor: 'light_rain',
      direction: 'decrease',
      description: `Light precipitation (${weather.precipitationMm} mm) may slightly reduce particulates`,
      weight: 0.3,
    });
  }

  // 6. Dominant pollutant
  const dominant = current.dominantPollutant;
  if (dominant === 'pm25' && pollutants.pm25 > 60) {
    drivers.push({
      factor: 'pm25_dominant',
      direction: 'increase',
      description: `PM2.5 is the dominant pollutant at ${pollutants.pm25} µg/m³`,
      weight: Math.min(0.8, pollutants.pm25 / 100),
    });
  } else if (dominant === 'no2' && pollutants.no2 > 80) {
    drivers.push({
      factor: 'no2_traffic',
      direction: 'increase',
      description: `NO2 elevated at ${pollutants.no2} µg/m³ — likely traffic-related`,
      weight: 0.5,
    });
  } else if (dominant === 'o3' && pollutants.o3 > 100) {
    drivers.push({
      factor: 'o3_photochemical',
      direction: 'increase',
      description: `O3 elevated at ${pollutants.o3} µg/m³ — photochemical activity`,
      weight: 0.5,
    });
  }

  // 7. Temperature effect
  if (weather.temperatureC > 35) {
    drivers.push({
      factor: 'high_temp',
      direction: 'increase',
      description: `High temperature (${weather.temperatureC}°C) may enhance photochemical reactions`,
      weight: 0.35,
    });
  }

  // Sort by weight descending
  return drivers.sort((a, b) => b.weight - a.weight);
}

export function driversToStrings(drivers: ForecastDriver[]): string[] {
  return drivers.slice(0, 5).map((d) => d.description);
}
