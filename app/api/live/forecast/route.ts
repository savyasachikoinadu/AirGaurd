import { NextRequest } from 'next/server';
import { getLiveData } from '@/lib/live/orchestrator';
import { getLocationById, getDefaultLocation } from '@/lib/demo/locations';
import { jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const location = locationId ? getLocationById(locationId) || getDefaultLocation() : getDefaultLocation();
    const bundle = await getLiveData(location);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      forecast: bundle.forecast,
      mode: bundle.mode,
      lastUpdated: bundle.lastUpdated,
    });
  } catch (err) {
    return errorRes('Failed to fetch live forecast', 500, err);
  }
}
