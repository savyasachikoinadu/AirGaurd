'use client';

import type { Threat } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { AlertTriangle, TrendingUp, MapPin, Clock, ShieldAlert } from 'lucide-react';

interface FutureThreatsProps {
  threats: Threat[];
}

export function FutureThreats({ threats }: FutureThreatsProps) {
  if (!threats.length) {
    return (
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Future Threats</h3>
          <SourceBadge source="MODEL_FORECAST" size="xs" />
        </div>
        <p className="text-sm text-muted-foreground">No significant threats detected in current forecast.</p>
      </div>
    );
  }

  const getThreatIcon = (type: Threat['type']) => {
    switch (type) {
      case 'aqi_deterioration': return TrendingUp;
      case 'rapid_pm25_increase': return TrendingUp;
      case 'hotspot_formation': return MapPin;
      case 'prolonged_high_risk': return ShieldAlert;
      case 'low_confidence': return Clock;
      default: return AlertTriangle;
    }
  };

  const getSeverityColor = (severity: Threat['severity']) => {
    const colors = { INFO: '#0891b2', WATCH: '#eab308', WARNING: '#f97316', CRITICAL: '#dc2626' };
    return colors[severity];
  };

  const getSeverityBg = (severity: Threat['severity']) => {
    const colors = { INFO: '#ecfeff', WATCH: '#fef9c3', WARNING: '#ffedd5', CRITICAL: '#fee2e2' };
    return colors[severity];
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Future Threats</h3>
          <p className="text-xs text-muted-foreground mt-1">Detected from forecast analysis</p>
        </div>
        <SourceBadge source="MODEL_FORECAST" size="xs" />
      </div>

      <div className="space-y-2.5 max-h-[400px] overflow-y-auto">
        {threats.map((threat) => {
          const Icon = getThreatIcon(threat.type);
          const sevColor = getSeverityColor(threat.severity);
          const sevBg = getSeverityBg(threat.severity);

          return (
            <div
              key={threat.id}
              className="rounded-lg border p-3"
              style={{ backgroundColor: sevBg, borderColor: `${sevColor}30` }}
            >
              <div className="flex items-start gap-2">
                <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sevColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold" style={{ color: sevColor }}>
                      {threat.severity}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {threat.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs font-medium mb-1">{threat.location}</div>
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    {threat.contributingFactors.map((f, i) => (
                      <div key={i}>• {f}</div>
                    ))}
                  </div>
                  <div className="text-[11px] mt-1.5 pt-1.5 border-t" style={{ borderColor: `${sevColor}20` }}>
                    <span className="font-medium" style={{ color: sevColor }}>Response: </span>
                    <span className="text-muted-foreground">{threat.recommendedResponse}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span>Horizon: +{threat.horizon}h</span>
                    <span>Confidence: {threat.confidence}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
