// Shared UI helper utilities for AQI display

import type { AqiCategory, DataSource, AlertSeverity, ConfidenceLevel } from '@/lib/types';
import { getCategoryInfo } from '@/lib/aqi/cpcb';

export function getAqiCategoryColor(category: AqiCategory): string {
  return getCategoryInfo(category).color;
}

export function getAqiCategoryBg(category: AqiCategory): string {
  return getCategoryInfo(category).bgColor;
}

export function getAqiCategoryText(category: AqiCategory): string {
  return getCategoryInfo(category).textColor;
}

export function getDataSourceLabel(source: DataSource): string {
  const labels: Record<DataSource, string> = {
    ASIA_DEMO_DATA: 'ASIA DEMO DATA',
    MODEL_FORECAST: 'MODEL FORECAST',
    AI_ESTIMATE: 'AI ESTIMATE',
    HISTORICAL_DATASET: 'HISTORICAL DATASET',
    EXTERNAL_FORECAST: 'EXTERNAL FORECAST',
    LIVE_SENSOR: 'LIVE SENSOR',
  };
  return labels[source] || source;
}

export function getDataSourceColor(source: DataSource): string {
  const colors: Record<DataSource, string> = {
    ASIA_DEMO_DATA: '#0891b2',
    MODEL_FORECAST: '#7c3aed',
    AI_ESTIMATE: '#2563eb',
    HISTORICAL_DATASET: '#64748b',
    EXTERNAL_FORECAST: '#059669',
    LIVE_SENSOR: '#16a34a',
  };
  return colors[source] || '#64748b';
}

export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    INFO: '#0891b2',
    WATCH: '#eab308',
    WARNING: '#f97316',
    CRITICAL: '#dc2626',
  };
  return colors[severity];
}

export function getSeverityBg(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    INFO: '#ecfeff',
    WATCH: '#fef9c3',
    WARNING: '#ffedd5',
    CRITICAL: '#fee2e2',
  };
  return colors[severity];
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  const colors: Record<ConfidenceLevel, string> = {
    High: '#16a34a',
    Medium: '#eab308',
    Low: '#f97316',
  };
  return colors[level];
}

export function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(timestamp: string): string {
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

export function getTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
