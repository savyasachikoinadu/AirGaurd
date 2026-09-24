'use client';

import type { ExplanationResult } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Brain } from 'lucide-react';

interface ExplainableAIProps {
  explanation: ExplanationResult | null;
}

export function ExplainableAI({ explanation }: ExplainableAIProps) {
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
            <p className="text-xs text-muted-foreground mt-0.5">Explainable AI — structured model factors</p>
          </div>
        </div>
        <SourceBadge source="MODEL_FORECAST" size="xs" />
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-muted/40 p-3 mb-4">
        <p className="text-sm leading-relaxed">{explanation.summary}</p>
      </div>

      {/* Factor bars */}
      <div className="space-y-2.5 mb-4">
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
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: directionColor,
                  }}
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

      <div className="mt-3 text-[10px] text-muted-foreground">
        Language used: "contributing factor", "model indicates", "likely contributor" — not verified causation.
      </div>
    </div>
  );
}
