'use client';

import type { DatasetProfile, DemoDataStatus, DataQualityLive } from '@/lib/types';
import { Database, CheckCircle2, XCircle, Activity, Wifi, WifiOff } from 'lucide-react';

interface DataQualityPanelProps {
  profile: DatasetProfile;
  demoData: DemoDataStatus;
  liveDataQuality?: DataQualityLive | null;
}

export function DataQualityPanel({ profile, demoData, liveDataQuality }: DataQualityPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Data Quality & Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-1">Data source status and system diagnostics</p>
        </div>
      </div>

      {/* Live data status */}
      {liveDataQuality && liveDataQuality.mode === 'LIVE' ? (
        <div className="rounded-lg border p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="w-3.5 h-3.5 text-green-600" />
            <span className="text-sm font-semibold">Live Data Providers</span>
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">LIVE MODE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <StatRow label="Live stations" value={liveDataQuality.liveStations} />
            <StatRow label="Stations with PM2.5" value={liveDataQuality.stationsWithPm25} />
            <StatRow label="Stations with PM10" value={liveDataQuality.stationsWithPm10} />
            <StatRow label="Stale observations" value={liveDataQuality.staleObservations} />
            <StatRow label="OpenAQ status" value={liveDataQuality.openaqStatus} />
            <StatRow label="Open-Meteo status" value={liveDataQuality.openmeteoStatus} />
            <StatRow label="Forecast source" value={liveDataQuality.forecastSource} />
            <StatRow label="Missing pollutants" value={liveDataQuality.missingPollutants.length > 0 ? liveDataQuality.missingPollutants.join(', ') : 'None'} />
          </div>
          {liveDataQuality.newestObservation && (
            <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
              Newest observation: {new Date(liveDataQuality.newestObservation).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
              {liveDataQuality.oldestObservation && liveDataQuality.oldestObservation !== liveDataQuality.newestObservation && (
                <> · Oldest: {new Date(liveDataQuality.oldestObservation).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Historical CSV status */}
      <div className="rounded-lg border p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Coordinator Historical CSV</span>
          {profile.connected ? (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
              <XCircle className="w-3.5 h-3.5" /> Not connected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          Coordinator historical CSV: Not connected in this build.
          The project file-size limit prevents direct upload.
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>Rows: {profile.rowCount || '—'}</div>
          <div>Columns: {profile.columnCount || '—'}</div>
          <div>Countries: {profile.countries || '—'}</div>
          <div>Date range: {profile.dateRangeStart ? `${profile.dateRangeStart} to ${profile.dateRangeEnd}` : '—'}</div>
        </div>
      </div>

      {/* Demo data status */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span className="text-sm font-semibold">Asia Demo Data System</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            liveDataQuality?.mode === 'LIVE' ? 'text-muted-foreground bg-muted' : 'text-cyan-700 bg-cyan-100'
          }`}>
            {liveDataQuality?.mode === 'LIVE' ? 'STANDBY' : 'ACTIVE'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <StatRow label="Demo locations" value={demoData.locations} />
          <StatRow label="Demo stations" value={demoData.stations} />
          <StatRow label="Generated records" value={demoData.generatedRecords} />
          <StatRow label="Pollutants" value={demoData.pollutants.length} />
          <StatRow label="Weather variables" value={demoData.weatherVariables.length} />
          <StatRow label="Data freshness" value="Real-time" />
        </div>
        <div className="mt-2 pt-2 border-t">
          <div className="text-[10px] text-muted-foreground mb-1">Available pollutants:</div>
          <div className="flex flex-wrap gap-1">
            {demoData.pollutants.map((p) => (
              <span key={p} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{p}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
