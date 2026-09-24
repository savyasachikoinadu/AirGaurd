import { NextRequest } from 'next/server';
import { getExplanationForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const stationId = req.nextUrl.searchParams.get('station') || undefined;
    const { location, station, forecast, explanation } = getExplanationForApi(locationId, stationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      station: { id: station.id, name: station.name },
      forecast,
      explanation,
      source: 'MODEL_FORECAST',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch explanation');
  }
}
