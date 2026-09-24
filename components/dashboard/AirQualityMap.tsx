'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { DemoStation, GridCell, MapLayer, LocationDef } from '@/lib/types';
import { getAqiColor, getAqiCategory, getCategoryColor } from '@/lib/aqi/cpcb';

interface AirQualityMapProps {
  location: LocationDef;
  stations: DemoStation[];
  gridCells?: GridCell[];
  layer: MapLayer;
  onStationClick?: (station: DemoStation) => void;
  liveMode?: boolean;
  className?: string;
}

function getLayerValue(station: DemoStation, layer: MapLayer): number {
  switch (layer) {
    case 'aqi': return station.aqi;
    case 'pm25': return station.pollutants.pm25;
    case 'pm10': return station.pollutants.pm10;
    case 'no2': return station.pollutants.no2;
    case 'prediction_risk': return station.aqi;
    case 'sensor_network': return station.aqi;
    default: return station.aqi;
  }
}

function getGridLayerValue(cell: GridCell, layer: MapLayer): number {
  switch (layer) {
    case 'aqi': return cell.aqi;
    case 'pm25': return cell.pm25;
    case 'pm10': return cell.pm10;
    case 'no2': return 0;
    case 'prediction_risk': return cell.aqi;
    default: return cell.aqi;
  }
}

function getSourceLabel(station: DemoStation, isLive: boolean): string {
  if (isLive) {
    if (station.source === 'OPENAQ') return 'LIVE · OpenAQ';
    if (station.source === 'OPEN_METEO') return 'MODELLED · Open-Meteo';
    if (station.source === 'LIVE_SENSOR') return 'LIVE SENSOR';
    return 'LIVE DATA';
  }
  return 'DEMO SENSOR';
}

export function AirQualityMap({ location, stations, gridCells, layer, onStationClick, liveMode = false, className }: AirQualityMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.location.lat, location.location.lng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: false, // Disabled — controlled wheel handling below
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // ─── Ctrl + scroll to zoom ───
    // Without CTRL: normal page scrolling continues, map does not zoom.
    // With CTRL: map zooms, default scroll is prevented.
    const mapContainer = map.getContainer();
    const wheelHandler = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const currentZoom = map.getZoom();
        const delta = e.deltaY > 0 ? -1 : 1;
        map.setZoom(currentZoom + delta, { animate: true });
      }
      // If ctrlKey is false, do nothing — let the page scroll normally
    };
    wheelHandlerRef.current = wheelHandler;

    // Use passive: false so we can call preventDefault when ctrlKey is true
    mapContainer.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      mapContainer.removeEventListener('wheel', wheelHandler);
      map.remove();
      mapRef.current = null;
      wheelHandlerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when location changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([location.location.lat, location.location.lng], 12);
  }, [location]);

  // Update grid cells — increased opacity for better visibility
  useEffect(() => {
    if (!mapRef.current || !gridLayerRef.current) return;
    gridLayerRef.current.clearLayers();

    if (!gridCells || gridCells.length === 0) return;

    gridCells.forEach((cell) => {
      const value = getGridLayerValue(cell, layer);
      const color = layer === 'no2' ? '#3b82f6' : getAqiColor(cell.aqi);
      const radius = 600;

      // Increased fill opacity: was 0.15/0.25/0.35, now 0.35/0.50/0.60
      const fillOpacity = cell.dataType === 'AI_ESTIMATE' ? 0.35 : cell.dataType === 'MODEL_FORECAST' ? 0.50 : 0.60;

      L.circle([cell.location.lat, cell.location.lng], {
        radius,
        color: color,
        fillColor: color,
        fillOpacity,
        weight: 1,
        opacity: 0.6,
      }).addTo(gridLayerRef.current!);
    });
  }, [gridCells, layer]);

  // Update station markers — increased highlight visibility
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      const value = getLayerValue(station, layer);
      const aqiColor = getAqiColor(station.aqi);
      const category = getAqiCategory(station.aqi);
      const sourceLabel = getSourceLabel(station, liveMode);
      const sourceColor = liveMode ? '#16a34a' : '#0891b2';

      const markerSize = 28;
      const icon = L.divIcon({
        className: '',
        html: `<div class="aqi-marker" style="width:${markerSize}px;height:${markerSize}px;background:${aqiColor};">${Math.round(value)}</div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([station.location.lat, station.location.lng], { icon })
        .addTo(mapRef.current!);

      // Add a subtle highlight circle behind each station marker for visibility
      L.circle([station.location.lat, station.location.lng], {
        radius: 300,
        color: aqiColor,
        fillColor: aqiColor,
        fillOpacity: 0.25,
        weight: 0,
      }).addTo(mapRef.current!);

      const popupContent = `
        <div style="min-width:200px;">
          <div style="font-weight:600;margin-bottom:4px;">${station.name}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${aqiColor};"></span>
            <span style="font-weight:700;font-size:16px;">AQI ${station.aqi}</span>
            <span style="font-size:11px;color:#666;">${category}</span>
          </div>
          <div style="font-size:11px;color:#666;margin-bottom:6px;">
            PM2.5: ${station.pollutants.pm25} µg/m³<br/>
            PM10: ${station.pollutants.pm10} µg/m³<br/>
            NO₂: ${station.pollutants.no2} µg/m³
          </div>
          <div style="font-size:10px;color:${sourceColor};font-weight:500;">${sourceLabel}</div>
        </div>
      `;
      marker.bindPopup(popupContent);

      if (onStationClick) {
        marker.on('click', () => onStationClick(station));
      }

      markersRef.current.push(marker);
    });
  }, [stations, layer, onStationClick, liveMode]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className={className || 'h-full w-full'} />
      {/* Ctrl + scroll hint */}
      <div className="absolute bottom-2 right-2 z-[1000] rounded-md bg-white/90 px-2 py-1 text-[10px] text-gray-600 shadow-sm pointer-events-none">
        Use Ctrl + scroll to zoom
      </div>
    </div>
  );
}
