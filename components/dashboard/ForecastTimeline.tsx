'use client';

import type { ForecastPoint } from '@/lib/types';
import { getAqiColor, getAqiCategory, getPollutantLabel } from '@/lib/aqi/cpcb';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ForecastTimelineProps {
  forecast: ForecastPoint[];
}

export function ForecastTimeline({ forecast }: ForecastTimelineProps) {
  if (!forecast.length) return null;

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">AI Forecast Timeline</h3>
          <p className="text-xs text-muted-foreground mt-1">Hybrid Baseline Forecast — 24-hour prediction</p>
        </div>
        <SourceBadge source="MODEL_FORECAST" size="xs" />
      </div>

      <div className="grid grid-cols-5 gap-2">
        {forecast.map((fp, idx) => {
          const color = getAqiColor(fp.aqi);
          const category = getAqiCategory(fp.aqi);
          const isNow = idx === 0;

          return (
            <div
              key={fp.horizon}
              className={`rounded-lg border p-3 text-center transition-all ${isNow ? 'ring-2 ring-primary/30' : ''}`}
              style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}
            >
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{fp.label}</div>
              <div className="text-2xl font-bold mb-1" style={{ color }}>{fp.aqi}</div>
              <div className="text-[10px] font-medium mb-2" style={{ color }}>{category}</div>
              <div className="space-y-0.5 text-[10px] text-muted-foreground">
                <div>PM2.5: {fp.pollutants.pm25}</div>
                <div>PM10: {fp.pollutants.pm10}</div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                {fp.trendDirection === 'rising' && <TrendingUp className="w-3 h-3 text-orange-500" />}
                {fp.trendDirection === 'falling' && <TrendingDown className="w-3 h-3 text-green-500" />}
                {fp.trendDirection === 'stable' && <Minus className="w-3 h-3 text-muted-foreground" />}
                <span className="text-[9px] font-medium" style={{ color: getConfidenceColor(fp.confidence) }}>
                  {fp.confidence}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground mt-1">
                Dominant: {getPollutantLabel(fp.dominantPollutant)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t text-[10px] text-muted-foreground">
        <span>Model uncertainty: heuristic confidence based on data coverage, trend stability, and horizon length</span>
        <span>Forecast generated: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

function getConfidenceColor(level: string): string {
  if (level === 'High') return '#16a34a';
  if (level === 'Medium') return '#eab308';
  return '#f97316';
}
