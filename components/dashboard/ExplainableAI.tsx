'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ExplanationResult, ForecastPoint, WeatherReadings, PollutantReadings, GeminiIntelligence, ForecastDriver } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Brain, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface ExplainableAIProps {
  explanation: ExplanationResult | null;
  forecast?: ForecastPoint[];
  weather?: WeatherReadings;
  pollutants?: PollutantReadings;
  city?: string;
  mode?: 'LIVE' | 'DEMO';
  stationCount?: number;
  stationAgreement?: number;
  dataFreshness?: string;
}

export function ExplainableAI({
  explanation,
  forecast,
  weather,
  pollutants,
  city = 'Bengaluru',
  mode = 'LIVE',
  stationCount = 0,
  stationAgreement = 0.5,
  dataFreshness = 'unknown',
}: ExplainableAIProps) {
  const [geminiIntel, setGeminiIntel] = useState<GeminiIntelligence | null>(null);
  const [drivers, setDrivers] = useState<ForecastDriver[]>([]);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiUsed, setGeminiUsed] = useState(false);
  const [confidencePct, setConfidencePct] = useState<number | null>(null);

  const fetchGemini = useCallback(async () => {
    if (!forecast || forecast.length === 0 || !weather || !pollutants) return;
    setGeminiLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city, mode, userMode: 'default',
          forecast, weather, pollutants,
          stationCount, stationAgreement, dataFreshness,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.intelligence) setGeminiIntel(data.intelligence);
      if (data.drivers) {
        // Drivers are string[] from API — we'll use them as description-only
        setDrivers(data.drivers.map((d: string, i: number) => ({
          factor: `driver_${i}`,
          direction: 'neutral' as const,
          description: d,
          weight: 1 - i * 0.15,
        })));
      }
      setGeminiUsed(data.geminiUsed || false);
      if (data.confidence) setConfidencePct(data.confidence);
    } catch (err) {
      // Silently fall back to deterministic explanation
      console.error('[ExplainableAI] Gemini fetch failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  }, [forecast, weather, pollutants, city, mode, stationCount, stationAgreement, dataFreshness]);

  // Fetch Gemini intelligence when user opens the Why? section or data changes
  useEffect(() => {
    if (forecast && forecast.length > 0 && weather && pollutants) {
      fetchGemini();
    }
  }, [fetchGemini]);

  if (!explanation) {
    return (
      <div className="rounded-xl border bg-card p-5 text-muted-foreground">
        Loading explanation...
      </div>
    );
  }

  const maxWeight = Math.max(...explanation.factors.map((f) => f.weight), 0.01);

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Why is pollution changing?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {geminiUsed ? 'AI interpretation by Gemini + deterministic factors' : 'Explainable AI — structured model factors'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {geminiUsed && (
            <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: '#2563eb15', color: '#2563eb' }}>
              <Sparkles className="w-3 h-3" />
              Gemini
            </span>
          )}
          <SourceBadge source="MODEL_FORECAST" size="xs" />
        </div>
      </div>

      {/* Gemini AI summary */}
      {geminiLoading && (
        <div className="rounded-lg bg-muted/40 p-3 mb-4 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">Asking Gemini to interpret forecast...</span>
        </div>
      )}

      {geminiIntel && !geminiLoading && (
        <div className="rounded-lg bg-primary/5 p-3 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm leading-relaxed">{geminiIntel.summary}</p>
              {geminiIntel.why.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Key reasons:</span>
                  {geminiIntel.why.map((reason, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-primary flex-shrink-0">•</span>
                      <span>{reason}</span>
                    </p>
                  ))}
                </div>
              )}
              {geminiIntel.keyRisks.length > 0 && (
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-semibold uppercase text-muted-foreground">Key risks:</span>
                  {geminiIntel.keyRisks.map((risk, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>{risk}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confidence badge */}
      {confidencePct !== null && (
        <div className="mb-3 text-[11px] text-muted-foreground">
          Forecast confidence: <span className="font-semibold" style={{ color: confidencePct >= 70 ? '#16a34a' : confidencePct >= 45 ? '#eab308' : '#f97316' }}>{confidencePct}%</span>
        </div>
      )}

      {/* Deterministic factor bars */}
      <div className="space-y-2.5 mb-4">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">Deterministic Factors</span>
        {explanation.factors.map((factor) => {
          const barWidth = (factor.weight / maxWeight) * 100;
          const directionColor =
            factor.direction === 'increase' ? '#f97316' :
            factor.direction === 'decrease' ? '#16a34a' : '#64748b';

          return (
            <div key={factor.factor}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{factor.label}</span>
                <span className="text-[10px] text-muted-foreground">{factor.description}</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, backgroundColor: directionColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Uncertainty statement */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 text-xs font-bold">UNCERTAINTY</span>
        </div>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">{explanation.uncertaintyStatement}</p>
      </div>

      {/* Source transparency */}
      <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
        <span>Observed data: OpenAQ</span>
        <span>·</span>
        <span>Weather: Open-Meteo</span>
        <span>·</span>
        <span>Numerical AQI: CPCB methodology</span>
        <span>·</span>
        <span>Forecast: AirGuard engine</span>
        {geminiUsed && <><span>·</span><span>AI interpretation: Gemini</span></>}
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        Language used: "contributing factor", "model indicates", "likely contributor" — not verified causation.
      </div>
    </div>
  );
}
