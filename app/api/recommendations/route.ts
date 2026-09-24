import { NextRequest } from 'next/server';
import { getRecommendationsForApi, jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const { location, recommendations } = getRecommendationsForApi(locationId);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to fetch recommendations', 500, err);
  }
}
