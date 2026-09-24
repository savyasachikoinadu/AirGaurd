import { jsonRes } from '@/lib/api/helpers';
import { isOpenAQConfigured } from '@/lib/live/openaq';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openaqConfigured = isOpenAQConfigured();
  return jsonRes({
    status: 'operational',
    mode: openaqConfigured ? 'LIVE' : 'DEMO',
    dataSource: openaqConfigured ? 'OPENAQ + OPEN_METEO' : 'ASIA_DEMO_DATA',
    externalApis: {
      openMeteo: 'connected',
      openAq: openaqConfigured ? 'configured' : 'no_api_key',
      openai: 'not_connected',
      traffic: 'not_connected',
    },
    historicalCsv: 'not_connected',
    liveProviders: {
      openaq: openaqConfigured ? 'ready' : 'missing_api_key',
      openmeteo: 'ready',
    },
    timestamp: new Date().toISOString(),
  });
}
