import { NextRequest } from 'next/server';
import { getThreatsForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, threats } = getThreatsForApi(locationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      threats,
      source: 'MODEL_FORECAST',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to fetch threats', 500, err);
  }
}
