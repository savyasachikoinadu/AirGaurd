'use client';

import { useState } from 'react';
import type { Recommendation, Stakeholder } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Users, Building2, Factory } from 'lucide-react';

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export function Recommendations({ recommendations }: RecommendationsProps) {
  const [activeTab, setActiveTab] = useState<Stakeholder>('PUBLIC');

  const tabs: { key: Stakeholder; label: string; icon: typeof Users }[] = [
    { key: 'PUBLIC', label: 'Public', icon: Users },
    { key: 'GOVERNMENT', label: 'Government', icon: Building2 },
    { key: 'INDUSTRY', label: 'Industry', icon: Factory },
  ];

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
          <p className="text-xs text-muted-foreground mt-1">Stakeholder-specific actions based on forecast state</p>
        </div>
        <SourceBadge source="MODEL_FORECAST" size="xs" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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

      {/* Recommendations */}
      <div className="space-y-2.5">
        {filtered.map((rec) => (
          <div key={rec.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold">{rec.title}</span>
              <span
                className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ backgroundColor: `${priorityColor(rec.priority)}20`, color: priorityColor(rec.priority) }}
              >
                {rec.priority}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              Context: {rec.context}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No recommendations available.</p>
        )}
      </div>
    </div>
  );
}
