import { NextRequest } from 'next/server';
import { getLiveData } from '@/lib/live/orchestrator';
import { getLocationById, getDefaultLocation } from '@/lib/demo/locations';
import { jsonRes, errorRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET(req: NextRequest) {
  try {
    const locationId = req.nextUrl.searchParams.get('location') || undefined;
    const mode = (req.nextUrl.searchParams.get('mode') || 'LIVE') as 'LIVE' | 'DEMO';
    const location = locationId ? getLocationById(locationId) || getDefaultLocation() : getDefaultLocation();
    const bundle = await getLiveData(location, mode);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      stations: bundle.stations,
      mode: bundle.mode,
      providerStatus: bundle.providerStatus,
      lastUpdated: bundle.lastUpdated,
      errors: bundle.errors,
    });
  } catch (err) {
    return errorRes('Failed to fetch live stations', 500, err);
  }
}
