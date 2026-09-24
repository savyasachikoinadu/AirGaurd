'use client';

import { useState, useEffect, useRef } from 'react';
import type { HotspotJourney as HotspotJourneyData, DemoStation, LocationDef } from '@/lib/types';
import { AirQualityMap } from './AirQualityMap';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';

interface HotspotJourneyProps {
  journey: HotspotJourneyData;
  stations: DemoStation[];
  location: LocationDef;
}

export function HotspotJourney({ journey, stations, location }: HotspotJourneyProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = journey.grids;
  const currentGrid = steps[currentStep];
  const narrative = journey.narrative;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length]);

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1 && !isPlaying) {
      setCurrentStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStep = (direction: 'forward' | 'back') => {
    setIsPlaying(false);
    if (direction === 'forward') {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    } else {
      setCurrentStep((prev) => Math.max(prev - 1, 0));
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pollution Hotspot Journey</h3>
          <p className="text-xs text-muted-foreground mt-1">AI-estimated local risk movement over 24 hours</p>
        </div>
        <SourceBadge source="AI_ESTIMATE" size="xs" />
      </div>

      {/* Map */}
      <div className="relative h-[400px] rounded-lg overflow-hidden border mb-4">
        <AirQualityMap
          location={location}
          stations={stations}
          gridCells={currentGrid?.cells}
          layer="prediction_risk"
          className="h-full w-full"
        />
        {/* Overlay info */}
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md pointer-events-none">
          <div className="text-xs font-bold text-muted-foreground">{currentGrid?.label}</div>
          <div className="text-lg font-bold" style={{ color: getAqiColorForValue(currentGrid?.averageAqi || 0) }}>
            AQI {Math.round(currentGrid?.averageAqi || 0)}
          </div>
          {currentGrid?.topHotspot && (
            <div className="text-[10px] text-muted-foreground mt-0.5">
              Top hotspot: AQI {currentGrid.topHotspot.aqi}
            </div>
          )}
        </div>
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-md pointer-events-none">
          <div className="text-[9px] font-bold text-muted-foreground mb-1">DATA TYPE</div>
          <div className="flex items-center gap-2 text-[9px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Measured</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Model</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500" />AI Est.</span>
          </div>
        </div>
      </div>

      {/* Timeline controls */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => handleStep('back')}
          disabled={currentStep === 0}
          className="p-2 rounded-lg border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </button>
        <button
          onClick={handlePlayPause}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium text-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Pause' : 'Play Journey'}
        </button>
        <button
          onClick={() => handleStep('forward')}
          disabled={currentStep >= steps.length - 1}
          className="p-2 rounded-lg border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Timeline slider */}
        <div className="flex-1 flex items-center gap-1">
          {steps.map((step, idx) => (
            <button
              key={step.horizon}
              onClick={() => { setIsPlaying(false); setCurrentStep(idx); }}
              className={`flex-1 h-2 rounded-full transition-all ${
                idx === currentStep ? 'bg-primary' : idx < currentStep ? 'bg-primary/40' : 'bg-muted'
              }`}
              title={step.label}
            />
          ))}
        </div>
      </div>

      {/* Journey summary narrative */}
      <div className="grid grid-cols-5 gap-2">
        {narrative.map((step, idx) => (
          <div
            key={step.horizon}
            className={`rounded-lg border p-2 text-center transition-all ${idx === currentStep ? 'ring-2 ring-primary/40' : ''}`}
            style={{ backgroundColor: idx === currentStep ? `${getAqiColorForValue(step.aqi)}15` : '' }}
          >
            <div className="text-[9px] font-bold text-muted-foreground uppercase">{step.label}</div>
            <div className="text-sm font-bold mt-0.5" style={{ color: getAqiColorForValue(step.aqi) }}>
              {step.aqi}
            </div>
            <div className="text-[10px] font-medium text-muted-foreground mt-0.5">{step.status}</div>
            <div className="text-[9px] text-muted-foreground mt-1 leading-tight">{step.description}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-2 border-t text-[10px] text-muted-foreground">
        Affected area: {currentGrid?.affectedAreaKm2} km² | Hotspot cells: {currentGrid?.hotspotCount} | Grid: 7×7 IDW interpolation
      </div>
    </div>
  );
}

function getAqiColorForValue(aqi: number): string {
  if (aqi <= 50) return '#16a34a';
  if (aqi <= 100) return '#84cc16';
  if (aqi <= 200) return '#eab308';
  if (aqi <= 300) return '#f97316';
  if (aqi <= 400) return '#dc2626';
  return '#991b1b';
}
