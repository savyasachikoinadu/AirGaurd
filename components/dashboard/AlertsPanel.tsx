'use client';

import type { Alert } from '@/lib/types';
import { getSeverityColor, getSeverityBg, formatTime } from '@/lib/ui/utils';
import { Bell, AlertCircle } from 'lucide-react';

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Smart Alerts</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{alerts.length} alert(s) generated from forecast state</p>
        </div>
      </div>

      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        {alerts.map((alert) => {
          const sevColor = getSeverityColor(alert.severity);
          const sevBg = getSeverityBg(alert.severity);

          return (
            <div
              key={alert.id}
              className="rounded-lg border p-3 flex items-start gap-2"
              style={{ backgroundColor: sevBg, borderColor: `${sevColor}30` }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: sevColor }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold" style={{ color: sevColor }}>
                    {alert.severity}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    {alert.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(alert.timestamp)}</span>
                </div>
                <p className="text-xs text-foreground mb-1">{alert.reason}</p>
                <div className="text-[11px] text-muted-foreground">
                  <span className="font-medium">Action: </span>{alert.recommendedAction}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Location: {alert.location} | Horizon: +{alert.horizon}h
                </div>
              </div>
            </div>
          );
        })}
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">No alerts at this time.</p>
        )}
      </div>
    </div>
  );
}
