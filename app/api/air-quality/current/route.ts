import { NextRequest } from 'next/server';
import { getStationsForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, stations } = getStationsForApi(locationId);

    // Aggregate current conditions from all stations
    const avgAqi = Math.round(stations.reduce((a, s) => a + s.aqi, 0) / stations.length);
    const avgPm25 = Math.round((stations.reduce((a, s) => a + s.pollutants.pm25, 0) / stations.length) * 10) / 10;
    const avgPm10 = Math.round((stations.reduce((a, s) => a + s.pollutants.pm10, 0) / stations.length) * 10) / 10;
    const avgNo2 = Math.round((stations.reduce((a, s) => a + s.pollutants.no2, 0) / stations.length) * 10) / 10;
    const avgO3 = Math.round((stations.reduce((a, s) => a + s.pollutants.o3, 0) / stations.length) * 10) / 10;
    const avgSo2 = Math.round((stations.reduce((a, s) => a + s.pollutants.so2, 0) / stations.length) * 10) / 10;
    const avgCo = Math.round((stations.reduce((a, s) => a + s.pollutants.co, 0) / stations.length) * 100) / 100;

    const avgTemp = Math.round((stations.reduce((a, s) => a + s.weather.temperatureC, 0) / stations.length) * 10) / 10;
    const avgHumidity = Math.round(stations.reduce((a, s) => a + s.weather.humidity, 0) / stations.length);
    const avgWind = Math.round((stations.reduce((a, s) => a + s.weather.windSpeedKph, 0) / stations.length) * 10) / 10;
    const avgWindDir = Math.round(stations.reduce((a, s) => a + s.weather.windDirectionDeg, 0) / stations.length);
    const avgPressure = Math.round(stations.reduce((a, s) => a + s.weather.pressureMb, 0) / stations.length);
    const totalPrecip = Math.round(stations.reduce((a, s) => a + s.weather.precipitationMm, 0) / stations.length * 10) / 10;

    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      aqi: avgAqi,
      aqiCategory: stations[0]?.aqiCategory,
      pollutants: { pm25: avgPm25, pm10: avgPm10, no2: avgNo2, o3: avgO3, so2: avgSo2, co: avgCo },
      weather: {
        temperatureC: avgTemp,
        humidity: avgHumidity,
        windSpeedKph: avgWind,
        windDirectionDeg: avgWindDir,
        pressureMb: avgPressure,
        precipitationMm: totalPrecip,
      },
      source: 'ASIA_DEMO_DATA',
      timestamp: new Date().toISOString(),
      freshness: 'Live demo data - generated on request',
    });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch current air quality');
  }
}
