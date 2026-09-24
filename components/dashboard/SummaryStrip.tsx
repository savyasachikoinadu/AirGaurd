'use client';

import type { ForecastPoint } from '@/lib/types';
import { getAqiColor, getAqiCategory } from '@/lib/aqi/cpcb';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SummaryStripProps {
  forecast: ForecastPoint[];
}

export function SummaryStrip({ forecast }: SummaryStripProps) {
  if (!forecast.length) return null;

  const cards = forecast.slice(0, 5);
  const labels = ['CURRENT AQI', 'CURRENT RISK', 'NEXT 6H', 'NEXT 12H', 'NEXT 24H'];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {cards.map((fp, idx) => {
        const color = getAqiColor(fp.aqi);
        const category = getAqiCategory(fp.aqi);
        const label = labels[idx] || `+${fp.horizon}H`;
        const prev = idx > 0 ? cards[idx - 1].aqi : fp.aqi;
        const change = fp.aqi - prev;
        const trendIcon = change > 5 ? <TrendingUp className="w-3 h-3" /> : change < -5 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

        return (
          <div
            key={fp.horizon}
            className="rounded-xl border bg-card p-3 transition-all hover:shadow-md"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold" style={{ color }}>{fp.aqi}</span>
              <span className="text-[10px] font-medium" style={{ color }}>{category}</span>
            </div>
            {idx > 0 && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px]" style={{ color: change > 0 ? '#f97316' : change < 0 ? '#16a34a' : '#64748b' }}>
                {trendIcon}
                <span>{change > 0 ? '+' : ''}{change} vs prev</span>
              </div>
            )}
            {idx === 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">Risk: {fp.riskLevel}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
