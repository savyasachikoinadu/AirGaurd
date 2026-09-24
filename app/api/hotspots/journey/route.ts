import { NextRequest } from 'next/server';
import { getJourneyForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, journey } = getJourneyForApi(locationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      journey,
      source: 'AI_ESTIMATE',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to fetch hotspot journey', 500, err);
  }
}
