'use client';

import { useState } from 'react';
import type { ForecastPoint, ScenarioResult, ScenarioInput } from '@/lib/types';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react';

interface WhatIfSimulationProps {
  forecast: ForecastPoint[];
  onRunSimulation: (input: ScenarioInput) => Promise<ScenarioResult | null>;
  result: ScenarioResult | null;
}

export function WhatIfSimulation({ forecast, onRunSimulation, result }: WhatIfSimulationProps) {
  const [traffic, setTraffic] = useState(30);
  const [industrial, setIndustrial] = useState(20);
  const [burning, setBurning] = useState(15);
  const [trafficRestriction, setTrafficRestriction] = useState(false);
  const [industrialMitigation, setIndustrialMitigation] = useState(false);
  const [burningControl, setBurningControl] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    await onRunSimulation({
      trafficReduction: traffic,
      industrialReduction: industrial,
      openBurningReduction: burning,
      temporaryTrafficRestriction: trafficRestriction,
      industrialMitigation,
      burningControl,
    });
    setLoading(false);
  };

  const baseline = forecast;
  const scenario = result?.scenario;

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">What If We Take Action?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Interactive scenario simulation</p>
          </div>
        </div>
        {result && <SourceBadge source="AI_ESTIMATE" size="xs" />}
      </div>

      {/* Controls */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        <ScenarioSlider
          label="Traffic reduction"
          value={traffic}
          onChange={setTraffic}
          color="#f97316"
        />
        <ScenarioSlider
          label="Industrial emission reduction"
          value={industrial}
          onChange={setIndustrial}
          color="#8b5cf6"
        />
        <ScenarioSlider
          label="Open-burning reduction"
          value={burning}
          onChange={setBurning}
          color="#dc2626"
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <ToggleControl
          label="Temporary traffic restriction"
          checked={trafficRestriction}
          onChange={setTrafficRestriction}
        />
        <ToggleControl
          label="Industrial mitigation"
          checked={industrialMitigation}
          onChange={setIndustrialMitigation}
        />
        <ToggleControl
          label="Burning control"
          checked={burningControl}
          onChange={setBurningControl}
        />
      </div>

      <Button
        onClick={handleRun}
        disabled={loading}
        className="w-full mb-4"
      >
        {loading ? 'Running Simulation...' : 'Run Simulation'}
      </Button>

      {/* Results */}
      {result && scenario && (
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
            <span className="text-xs font-bold text-amber-700">SCENARIO ESTIMATE</span>
            <span className="text-[10px] text-amber-600">— not a guaranteed real-world outcome</span>
          </div>

          {/* Comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <div className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Baseline</div>
              <ComparisonData forecast={baseline} />
            </div>
            <div className="rounded-lg border p-3" style={{ backgroundColor: '#16a34a08' }}>
              <div className="text-[10px] font-bold text-green-700 uppercase mb-2">Intervention Scenario</div>
              <ComparisonData forecast={scenario} />
            </div>
          </div>

          {/* Improvement summary */}
          <div className="grid grid-cols-3 gap-3">
            <MetricCard
              label="AQI Improvement"
              value={`${result.improvementAqi > 0 ? '+' : ''}${result.improvementAqi}`}
              pct={`${result.improvementPct}%`}
              positive={result.improvementAqi > 0}
            />
            <MetricCard
              label="Hotspot Intensity Reduction"
              value={`${result.hotspotIntensityReduction}`}
              positive={result.hotspotIntensityReduction > 0}
            />
            <MetricCard
              label="Hotspot Area Reduction"
              value={`${result.hotspotAreaReduction}%`}
              positive={result.hotspotAreaReduction > 0}
            />
          </div>

          {/* Scenario confidence */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Scenario confidence: </span>
            <span className="font-medium" style={{ color: result.scenarioConfidence === 'High' ? '#16a34a' : result.scenarioConfidence === 'Medium' ? '#eab308' : '#f97316' }}>
              {result.scenarioConfidence}
            </span>
          </div>

          {/* Assumptions */}
          <div className="border rounded-lg">
            <button
              onClick={() => setShowAssumptions(!showAssumptions)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors"
            >
              <span>How is this calculated?</span>
              {showAssumptions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showAssumptions && (
              <div className="px-3 pb-3 space-y-1">
                {result.assumptions.map((a, i) => (
                  <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold flex-shrink-0">•</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioSlider({ label, value, onChange, color }: { label: string; value: number; onChange: (v: number) => void; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        max={100}
        step={5}
        className="w-full"
      />
    </div>
  );
}

function ToggleControl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      <Label className="text-[11px] leading-tight">{label}</Label>
    </div>
  );
}

function ComparisonData({ forecast }: { forecast: ForecastPoint[] }) {
  const last = forecast[forecast.length - 1];
  if (!last) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">AQI (24h):</span>
        <span className="font-bold">{last.aqi}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">PM2.5:</span>
        <span className="font-medium">{last.pollutants.pm25} µg/m³</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">PM10:</span>
        <span className="font-medium">{last.pollutants.pm10} µg/m³</span>
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Category:</span>
        <span className="font-medium">{last.aqiCategory}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, pct, positive }: { label: string; value: string; pct?: string; positive: boolean }) {
  return (
    <div className="rounded-lg border p-2.5 text-center">
      <div className="text-[10px] font-medium text-muted-foreground uppercase mb-1">{label}</div>
      <div className={`text-lg font-bold ${positive ? 'text-green-600' : 'text-muted-foreground'}`}>{value}</div>
      {pct && <div className={`text-[10px] ${positive ? 'text-green-600' : 'text-muted-foreground'}`}>{pct}</div>}
    </div>
  );
}
