import { NextRequest } from 'next/server';
import { getJourneyForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const horizon = parseInt(req.nextUrl.searchParams.get('horizon') || '0', 10);
    const { location, journey } = getJourneyForApi(locationId);
    const grid = journey.grids.find((g) => g.horizon === horizon) || journey.grids[0];
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      grid,
      source: 'AI_ESTIMATE',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to fetch hotspots', 500, err);
  }
}
