'use client';

import type { ForecastPoint, AirQualitySummary } from '@/lib/types';
import { getAqiColor, getAqiCategory, getCategoryColor } from '@/lib/aqi/cpcb';
import { SourceBadge } from '@/components/shared/SourceBadge';
import { TrendingUp, TrendingDown, Minus, Wind, Droplets, Thermometer, Eye, Gauge } from 'lucide-react';

interface CurrentAirQualityProps {
  summary: AirQualitySummary | null;
  forecast: ForecastPoint[];
}

export function CurrentAirQuality({ summary, forecast }: CurrentAirQualityProps) {
  if (!summary) {
    return <div className="rounded-xl border bg-card p-6 text-muted-foreground">Loading current air quality...</div>;
  }

  const aqiColor = getAqiColor(summary.aqi);
  const category = summary.category;
  const nextForecast = forecast[1];
  const trendArrow = nextForecast
    ? nextForecast.aqi > summary.aqi + 5
      ? 'rising'
      : nextForecast.aqi < summary.aqi - 5
        ? 'falling'
        : 'stable'
    : 'stable';

  const pollutants = [
    { key: 'pm25', label: 'PM2.5', value: summary.pollutants.pm25, unit: 'µg/m³' },
    { key: 'pm10', label: 'PM10', value: summary.pollutants.pm10, unit: 'µg/m³' },
    { key: 'no2', label: 'NO₂', value: summary.pollutants.no2, unit: 'µg/m³' },
    { key: 'o3', label: 'O₃', value: summary.pollutants.o3, unit: 'µg/m³' },
    { key: 'so2', label: 'SO₂', value: summary.pollutants.so2, unit: 'µg/m³' },
    { key: 'co', label: 'CO', value: summary.pollutants.co, unit: 'mg/m³' },
  ];

  const weatherItems = [
    { icon: Thermometer, label: 'Temperature', value: `${summary.weather.temperatureC}°C` },
    { icon: Droplets, label: 'Humidity', value: `${summary.weather.humidity}%` },
    { icon: Wind, label: 'Wind', value: `${summary.weather.windSpeedKph} km/h` },
    { icon: Gauge, label: 'Pressure', value: `${summary.weather.pressureMb} mb` },
    { icon: Droplets, label: 'Precipitation', value: `${summary.weather.precipitationMm} mm` },
    { icon: Eye, label: 'Visibility', value: `${summary.weather.visibilityKm} km` },
  ];

  return (
    <div className="rounded-xl border bg-card p-5 animate-fade-in">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current Air Quality</h3>
          <p className="text-xs text-muted-foreground mt-1">{summary.freshness}</p>
        </div>
        <SourceBadge source={summary.source} size="xs" />
      </div>

      <div className="flex items-center gap-6 mb-5">
        <div className="relative flex-shrink-0">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${aqiColor}20`, width: 88, height: 88 }}
          >
            <span className="text-3xl font-bold" style={{ color: aqiColor }}>{summary.aqi}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-semibold" style={{ color: aqiColor }}>{category}</span>
            {trendArrow === 'rising' && <TrendingUp className="w-4 h-4 text-orange-500" />}
            {trendArrow === 'falling' && <TrendingDown className="w-4 h-4 text-green-500" />}
            {trendArrow === 'stable' && <Minus className="w-4 h-4 text-muted-foreground" />}
          </div>
          <p className="text-xs text-muted-foreground">{getHealthMessage(category)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {pollutants.map((p) => (
          <div key={p.key} className="rounded-lg border bg-muted/30 px-2.5 py-2">
            <div className="text-[10px] font-medium text-muted-foreground uppercase">{p.label}</div>
            <div className="text-sm font-semibold mt-0.5">{p.value} <span className="text-[10px] text-muted-foreground font-normal">{p.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {weatherItems.map((w) => (
          <div key={w.label} className="flex items-center gap-1.5 text-xs">
            <w.icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground">{w.label}:</span>
            <span className="font-medium">{w.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
        <span>Dominant: {summary.dominantPollutant.toUpperCase()}</span>
        <span>Last updated: {new Date(summary.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}

function getHealthMessage(category: string): string {
  const messages: Record<string, string> = {
    'Good': 'Air quality is good. Safe for all outdoor activities.',
    'Satisfactory': 'Air quality is satisfactory. Minimal health risk.',
    'Moderately Polluted': 'May cause breathing discomfort to sensitive groups.',
    'Poor': 'Breathing discomfort on prolonged exposure.',
    'Very Poor': 'Respiratory illness on prolonged exposure.',
    'Severe': 'Serious health impact. Avoid outdoor exposure.',
  };
  return messages[category] || '';
}
