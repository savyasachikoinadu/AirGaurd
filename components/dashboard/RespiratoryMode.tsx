'use client';

import type { RespiratoryGuidance } from '@/lib/types';
import { HeartPulse, AlertTriangle, Shield, TrendingUp, Clock } from 'lucide-react';

interface RespiratoryModeProps {
  guidance: RespiratoryGuidance | null;
}

export function RespiratoryMode({ guidance }: RespiratoryModeProps) {
  if (!guidance) {
    return (
      <div className="rounded-xl border bg-card p-5 text-muted-foreground">
        Loading respiratory sensitivity guidance...
      </div>
    );
  }

  const riskColor = guidance.currentRisk.startsWith('Very High') ? '#dc2626'
    : guidance.currentRisk.startsWith('High') ? '#f97316'
    : guidance.currentRisk.startsWith('Moderate') ? '#eab308'
    : '#16a34a';

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <HeartPulse className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Respiratory Sensitivity Mode</h3>
          <p className="text-xs text-muted-foreground mt-0.5">General air-quality risk information for asthma or airway sensitivity</p>
        </div>
      </div>

      {/* Current risk */}
      <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: `${riskColor}15` }}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4" style={{ color: riskColor }} />
          <span className="text-xs font-semibold uppercase" style={{ color: riskColor }}>Current Risk Level</span>
        </div>
        <p className="text-sm font-medium leading-relaxed" style={{ color: riskColor }}>{guidance.currentRisk}</p>
      </div>

      {/* Dominant pollutant */}
      <div className="rounded-lg border p-3 mb-3">
        <span className="text-xs font-semibold uppercase text-muted-foreground">Dominant Pollutant</span>
        <p className="text-sm leading-relaxed mt-1">{guidance.dominantPollutantNote}</p>
      </div>

      {/* Forecast peak */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Forecast Peak</span>
          </div>
          <p className="text-sm font-semibold">{guidance.forecastPeak}</p>
        </div>
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase text-muted-foreground">Peak Time</span>
          </div>
          <p className="text-sm font-semibold">{guidance.forecastPeakTime}</p>
        </div>
      </div>

      {/* Exposure reduction tips */}
      <div className="rounded-lg border p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold uppercase text-muted-foreground">Exposure Reduction</span>
        </div>
        <ul className="space-y-1.5">
          {guidance.exposureReductionTips.map((tip, idx) => (
            <li key={idx} className="text-xs leading-relaxed flex items-start gap-2">
              <span className="text-primary flex-shrink-0 mt-0.5">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Confidence note */}
      <div className="text-xs text-muted-foreground mb-3">
        {guidance.confidenceNote}
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-[11px] text-amber-800 leading-relaxed">{guidance.disclaimer}</p>
      </div>

      {/* Source transparency */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
        <span>Observed data: OpenAQ</span>
        <span>·</span>
        <span>Weather: Open-Meteo</span>
        <span>·</span>
        <span>AQI: CPCB methodology</span>
        <span>·</span>
        <span>Forecast: AirGuard engine</span>
        <span>·</span>
        <span>AI interpretation: Gemini</span>
      </div>
    </div>
  );
}
