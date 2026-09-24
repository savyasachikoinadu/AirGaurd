import { getDataQualityForApi, getAllLocations, jsonRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { profile, demoData } = getDataQualityForApi();
    const locations = getAllLocations();
    return jsonRes({
      profile,
      demoData,
      locations: locations.map((l) => ({ id: l.id, city: l.city, country: l.country })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return jsonRes({ error: err instanceof Error ? err.message : 'Failed' }, 500);
  }
}
