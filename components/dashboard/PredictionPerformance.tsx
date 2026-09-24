'use client';

import type { PredictionPerformance as PredictionPerformanceData } from '@/lib/types';
import { formatDateTime } from '@/lib/ui/utils';
import { BarChart3, TrendingUp, Target, CheckCircle2, XCircle } from 'lucide-react';

interface PredictionPerformanceProps {
  performance: PredictionPerformanceData | null;
}

export function PredictionPerformance({ performance }: PredictionPerformanceProps) {
  if (!performance) {
    return (
      <div className="rounded-xl border bg-card p-5 text-muted-foreground">
        Loading prediction performance...
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prediction vs Actual</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{performance.label}</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
        <p className="text-[11px] text-amber-800 leading-relaxed">
          DEMO REPLAY EVALUATION — "Actual" values are deterministic replay data, not real-world observations.
          Do not interpret as real-world model accuracy.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MetricBox icon={Target} label="MAE" value={performance.mae.toString()} sublabel="Mean Abs Error" />
        <MetricBox icon={TrendingUp} label="RMSE" value={performance.rmse.toString()} sublabel="Root Mean Sq Error" />
        <MetricBox icon={BarChart3} label="Dir. Accuracy" value={`${performance.directionalAccuracy}%`} sublabel="Directional" />
      </div>

      {/* Individual pairs */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {performance.pairs.map((pair) => (
          <div key={pair.id} className="rounded-lg border p-2.5 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted-foreground">{formatDateTime(pair.predictedTime)}</span>
              {pair.directionCorrect ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500" />
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-[10px] text-muted-foreground">Predicted AQI</div>
                <div className="font-semibold">{pair.predictedAqi}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Actual AQI</div>
                <div className="font-semibold">{pair.actualAqi}</div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">Error</div>
                <div className={`font-semibold ${pair.error > 20 ? 'text-orange-600' : 'text-green-600'}`}>
                  {pair.error}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">PM2.5 Err</div>
                <div className="font-semibold">{pair.pm25Error}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t text-[10px] text-muted-foreground">
        {performance.count} prediction-actual pairs evaluated | No fabricated accuracy claims
      </div>
    </div>
  );
}

function MetricBox({ icon: Icon, label, value, sublabel }: { icon: typeof Target; label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <Icon className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] font-medium text-muted-foreground">{label}</div>
      <div className="text-[9px] text-muted-foreground">{sublabel}</div>
    </div>
  );
}
