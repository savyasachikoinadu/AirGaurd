'use client';

import type { DatasetProfile, DemoDataStatus } from '@/lib/types';
import { Database, CheckCircle2, XCircle, Activity } from 'lucide-react';

interface DataQualityPanelProps {
  profile: DatasetProfile;
  demoData: DemoDataStatus;
}

export function DataQualityPanel({ profile, demoData }: DataQualityPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Data Quality & Pipeline</h3>
          <p className="text-xs text-muted-foreground mt-1">Data source status and system diagnostics</p>
        </div>
      </div>

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
          Coordinator historical CSV: Not connected in this Phase 1 build.
          The project file-size limit prevents direct upload.
        </p>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
          <div>Rows: {profile.rowCount || '—'}</div>
          <div>Columns: {profile.columnCount || '—'}</div>
          <div>Countries: {profile.countries || '—'}</div>
          <div>Date range: {profile.dateRangeStart ? `${profile.dateRangeStart} to ${profile.dateRangeEnd}` : '—'}</div>
        </div>
        <div className="mt-2 text-[11px] text-blue-600 font-medium">
          Historical dataset ingestion interface prepared for future integration.
        </div>
      </div>

      {/* Demo data status */}
      <div className="rounded-lg border p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3.5 h-3.5 text-cyan-600" />
          <span className="text-sm font-semibold">Asia Demo Data System</span>
          <span className="text-[10px] font-bold text-cyan-700 bg-cyan-100 px-1.5 py-0.5 rounded">ACTIVE</span>
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
        <div className="mt-2 text-[10px] text-cyan-600 font-medium">
          Source: ASIA DEMO DATA
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
