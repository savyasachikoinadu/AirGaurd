'use client';

import { useState, useEffect, useCallback } from 'react';
import type {
  Recommendation,
  Stakeholder,
  SmartRecommendationGroup,
  GeminiIntelligence,
  ForecastPoint,
  WeatherReadings,
  PollutantReadings,
  UserMode,
} from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Users, Building2, Factory, GraduationCap, HeartPulse, Sparkles, Loader2 } from 'lucide-react';

interface RecommendationsProps {
  recommendations: Recommendation[];
  forecast?: ForecastPoint[];
  weather?: WeatherReadings;
  pollutants?: PollutantReadings;
  city?: string;
  mode?: 'LIVE' | 'DEMO';
  userMode?: UserMode;
  stationCount?: number;
  stationAgreement?: number;
  dataFreshness?: string;
  smartGroups?: SmartRecommendationGroup[];
}

type TabKey = Stakeholder | 'STUDENTS' | 'RESPIRATORY';

export function Recommendations({
  recommendations,
  forecast,
  weather,
  pollutants,
  city = 'Bengaluru',
  mode = 'LIVE',
  userMode = 'default',
  stationCount = 0,
  stationAgreement = 0.5,
  dataFreshness = 'unknown',
  smartGroups,
}: RecommendationsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(
    userMode === 'student' ? 'STUDENTS' : userMode === 'respiratory' ? 'RESPIRATORY' : 'PUBLIC'
  );
  const [geminiIntel, setGeminiIntel] = useState<GeminiIntelligence | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiUsed, setGeminiUsed] = useState(false);

  // Fetch Gemini intelligence when user opens recommendations or data changes
  const fetchGemini = useCallback(async () => {
    if (!forecast || forecast.length === 0 || !weather || !pollutants) return;
    setGeminiLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city, mode, userMode,
          forecast, weather, pollutants,
          stationCount, stationAgreement, dataFreshness,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      if (data.intelligence) setGeminiIntel(data.intelligence);
      setGeminiUsed(data.geminiUsed || false);
    } catch (err) {
      console.error('[Recommendations] Gemini fetch failed:', err);
    } finally {
      setGeminiLoading(false);
    }
  }, [forecast, weather, pollutants, city, mode, userMode, stationCount, stationAgreement, dataFreshness]);

  useEffect(() => {
    if (forecast && forecast.length > 0 && weather && pollutants) {
      fetchGemini();
    }
  }, [fetchGemini]);

  const tabs: { key: TabKey; label: string; icon: typeof Users }[] = [
    { key: 'PUBLIC', label: 'Public', icon: Users },
    { key: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { key: 'RESPIRATORY', label: 'Respiratory', icon: HeartPulse },
    { key: 'GOVERNMENT', label: 'Government', icon: Building2 },
    { key: 'INDUSTRY', label: 'Industry', icon: Factory },
  ];

  // Determine which recommendations to show
  const getActiveRecommendations = (): { title: string; description: string; priority: string; timing?: string; context?: string }[] => {
    // Use Gemini recommendations if available, otherwise fall back to smart groups or deterministic
    if (geminiIntel) {
      switch (activeTab) {
        case 'PUBLIC': return geminiIntel.generalRecommendations.map((r, i) => ({ title: `Recommendation ${i + 1}`, description: r, priority: 'medium' }));
        case 'STUDENTS': return geminiIntel.studentRecommendations.map((r, i) => ({ title: `Student Guidance ${i + 1}`, description: r, priority: 'medium' }));
        case 'RESPIRATORY': return geminiIntel.respiratoryRecommendations.map((r, i) => ({ title: `Respiratory Guidance ${i + 1}`, description: r, priority: 'medium' }));
        case 'GOVERNMENT': return geminiIntel.governmentRecommendations.map((r, i) => ({ title: `Government Action ${i + 1}`, description: r, priority: 'medium' }));
        case 'INDUSTRY': return geminiIntel.industryRecommendations.map((r, i) => ({ title: `Industry Action ${i + 1}`, description: r, priority: 'medium' }));
      }
    }

    // Use smart recommendation groups if available
    if (smartGroups) {
      const group = smartGroups.find((g) => g.stakeholder === activeTab);
      if (group) {
        return group.recommendations;
      }
    }

    // Fall back to deterministic recommendations (legacy)
    const filtered = recommendations.filter((r) => r.stakeholder === activeTab);
    return filtered.map((r) => ({ title: r.title, description: r.description, priority: r.priority, context: r.context }));
  };

  const activeRecs = getActiveRecommendations();
  const filtered = recommendations.filter((r) => r.stakeholder === activeTab);

  const priorityColor = (priority: string) => {
    if (priority === 'high') return '#dc2626';
    if (priority === 'medium') return '#eab308';
    return '#64748b';
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Smart Recommendations</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {geminiUsed ? 'AI-enhanced by Gemini · ' : ''}Stakeholder-specific actions based on forecast state
          </p>
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

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gemini loading state */}
      {geminiLoading && (
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span>Asking Gemini for contextual recommendations...</span>
        </div>
      )}

      {/* Recommendations */}
      <div className="space-y-2.5">
        {activeRecs.map((rec, idx) => (
          <div key={idx} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold">{rec.title}</span>
              {rec.priority && (
                <span
                  className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: `${priorityColor(rec.priority)}20`, color: priorityColor(rec.priority) }}
                >
                  {rec.priority}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
            {rec.timing && (
              <div className="mt-1.5 text-[10px] text-primary font-medium">
                {rec.timing}
              </div>
            )}
            {rec.context && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Context: {rec.context}
              </div>
            )}
          </div>
        ))}
        {activeRecs.length === 0 && !geminiLoading && (
          <p className="text-sm text-muted-foreground">No recommendations available for this group.</p>
        )}
      </div>

      {/* Source transparency */}
      <div className="mt-4 pt-3 border-t flex flex-wrap gap-1.5 text-[9px] text-muted-foreground">
        <span>Observed data: OpenAQ</span>
        <span>·</span>
        <span>Weather: Open-Meteo</span>
        <span>·</span>
        <span>AQI: CPCB methodology</span>
        <span>·</span>
        <span>Forecast: AirGuard engine</span>
        {geminiUsed && <><span>·</span><span>AI interpretation: Gemini</span></>}
      </div>
    </div>
  );
}
