import { NextRequest } from 'next/server';
import { getStationsForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, stations } = getStationsForApi(locationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      stations: stations.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.location.lat,
        lng: s.location.lng,
        pollutants: s.pollutants,
        weather: s.weather,
        aqi: s.aqi,
        aqiCategory: s.aqiCategory,
        riskLevel: s.riskLevel,
        dominantPollutant: s.dominantPollutant,
        source: s.source,
      })),
      source: 'ASIA_DEMO_DATA',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to fetch sensors', 500, err);
  }
}
