'use client';

import { useState } from 'react';
import type { ForecastPoint } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

interface ForecastChartProps {
  forecast: ForecastPoint[];
}

type Metric = 'aqi' | 'pm25' | 'pm10';

export function ForecastChart({ forecast }: ForecastChartProps) {
  const [metric, setMetric] = useState<Metric>('aqi');

  const data = forecast.map((fp) => ({
    label: fp.label,
    aqi: fp.aqi,
    pm25: fp.pollutants.pm25,
    pm10: fp.pollutants.pm10,
  }));

  const metricConfig: Record<Metric, { label: string; color: string; unit: string }> = {
    aqi: { label: 'AQI', color: '#0ea5e9', unit: '' },
    pm25: { label: 'PM2.5', color: '#f97316', unit: 'µg/m³' },
    pm10: { label: 'PM10', color: '#8b5cf6', unit: 'µg/m³' },
  };

  const config = metricConfig[metric];

  // AQI category lines
  const aqiLines = metric === 'aqi' ? [
    { y: 100, label: 'Satisfactory', color: '#84cc16' },
    { y: 200, label: 'Moderate', color: '#eab308' },
    { y: 300, label: 'Poor', color: '#f97316' },
  ] : [];

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Forecast Chart</h3>
          <p className="text-xs text-muted-foreground mt-1">Interactive time-series prediction</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(Object.keys(metricConfig) as Metric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  metric === m ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'
                }`}
              >
                {metricConfig[m].label}
              </button>
            ))}
          </div>
          <SourceBadge source="MODEL_FORECAST" size="xs" />
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ borderRadius: '0.5rem', border: '1px solid #e0e0e0', fontSize: '12px' }}
              formatter={(value: number) => [`${value} ${config.unit}`, config.label]}
            />
            {aqiLines.map((line) => (
              <ReferenceLine
                key={line.y}
                y={line.y}
                stroke={line.color}
                strokeDasharray="5 5"
                label={{ value: line.label, fontSize: 9, fill: line.color, position: 'right' }}
              />
            ))}
            <Line
              type="monotone"
              dataKey={metric}
              stroke={config.color}
              strokeWidth={2.5}
              dot={{ r: 5, fill: config.color }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
