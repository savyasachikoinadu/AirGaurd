'use client';

import type { StudentGuidance } from '@/lib/types';
import { GraduationCap, Clock, Activity, Wind, Sun } from 'lucide-react';

interface StudentModeProps {
  guidance: StudentGuidance | null;
}

export function StudentMode({ guidance }: StudentModeProps) {
  if (!guidance) {
    return (
      <div className="rounded-xl border bg-card p-5 text-muted-foreground">
        Loading student guidance...
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <GraduationCap className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Student Mode</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Commute, sports, and campus exposure guidance</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Forecast note */}
        <div className="rounded-lg bg-primary/5 p-3">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">{guidance.forecastNote}</p>
          </div>
        </div>

        {/* Commute advice */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Commute</span>
          </div>
          <p className="text-sm leading-relaxed">{guidance.commuteAdvice}</p>
        </div>

        {/* Outdoor sports advice */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Outdoor Sports</span>
          </div>
          <p className="text-sm leading-relaxed">{guidance.outdoorSportsAdvice}</p>
        </div>

        {/* Best window */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wind className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase text-muted-foreground">Best Period for Outdoor Activity</span>
          </div>
          <p className="text-sm leading-relaxed">{guidance.bestWindowForOutdoor}</p>
        </div>

        {/* Campus exposure */}
        <div className="rounded-lg border p-3">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Campus Exposure Note</span>
          <p className="text-sm leading-relaxed mt-1">{guidance.campusExposureNote}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-3 text-[10px] text-muted-foreground border-t pt-2">
        {guidance.disclaimer}
      </div>

      {/* Source transparency */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
        <span>Observed data: OpenAQ</span>
        <span>·</span>
        <span>Weather: Open-Meteo</span>
        <span>·</span>
        <span>AQI: CPCB methodology</span>
        <span>·</span>
        <span>Forecast: AirGuard engine</span>
      </div>
    </div>
  );
}
