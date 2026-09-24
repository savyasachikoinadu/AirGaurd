import { jsonRes } from '@/lib/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  return jsonRes({
    status: 'operational',
    mode: 'DEMO',
    dataSource: 'ASIA_DEMO_DATA',
    externalApis: {
      openMeteo: 'not_connected',
      openAq: 'not_connected',
      openai: 'not_connected',
      traffic: 'not_connected',
    },
    historicalCsv: 'not_connected',
    timestamp: new Date().toISOString(),
  });
}
