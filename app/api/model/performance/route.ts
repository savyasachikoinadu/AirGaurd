import { NextRequest } from 'next/server';
import { getPerformanceForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, performance } = getPerformanceForApi(locationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      performance,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes(err instanceof Error ? err.message : 'Failed to fetch model performance');
  }
}
