import { NextRequest } from 'next/server';
import { getScenarioForApi, jsonRes, errorRes } from '@/lib/api/helpers';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const scenarioSchema = z.object({
  locationId: z.string().optional(),
  trafficReduction: z.number().min(0).max(100),
  industrialReduction: z.number().min(0).max(100),
  openBurningReduction: z.number().min(0).max(100),
  temporaryTrafficRestriction: z.boolean().default(false),
  industrialMitigation: z.boolean().default(false),
  burningControl: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = scenarioSchema.safeParse(body);
    if (!parsed.success) {
      return errorRes('Invalid input', 400, parsed.error);
    }
    const { location, result } = getScenarioForApi(parsed.data.locationId, parsed.data);
    return jsonRes({
      location: { id: location.id, city: location.city, country: location.country },
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return errorRes('Failed to run simulation', 500, err);
  }
}
