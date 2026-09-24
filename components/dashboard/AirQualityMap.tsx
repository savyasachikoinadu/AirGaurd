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

export function AirQualityMap({ location, stations, gridCells, layer, onStationClick, className }: AirQualityMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const gridLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [location.location.lat, location.location.lng],
      zoom: 12,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    gridLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map when location changes
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([location.location.lat, location.location.lng], 12);
  }, [location]);

  // Update grid cells
  useEffect(() => {
    if (!mapRef.current || !gridLayerRef.current) return;
    gridLayerRef.current.clearLayers();

    if (!gridCells || gridCells.length === 0) return;

    gridCells.forEach((cell) => {
      const value = getGridLayerValue(cell, layer);
      const color = layer === 'no2' ? '#3b82f6' : getAqiColor(cell.aqi);
      const radius = 600;

      L.circle([cell.location.lat, cell.location.lng], {
        radius,
        color: color,
        fillColor: color,
        fillOpacity: cell.dataType === 'AI_ESTIMATE' ? 0.15 : cell.dataType === 'MODEL_FORECAST' ? 0.25 : 0.35,
        weight: 0,
      }).addTo(gridLayerRef.current!);
    });
  }, [gridCells, layer]);

  // Update station markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      const value = getLayerValue(station, layer);
      const aqiColor = getAqiColor(station.aqi);
      const category = getAqiCategory(station.aqi);

      const markerSize = 28;
      const icon = L.divIcon({
        className: '',
        html: `<div class="aqi-marker" style="width:${markerSize}px;height:${markerSize}px;background:${aqiColor};">${Math.round(value)}</div>`,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerSize / 2, markerSize / 2],
      });

      const marker = L.marker([station.location.lat, station.location.lng], { icon })
        .addTo(mapRef.current!);

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
          <div style="font-size:10px;color:#0891b2;font-weight:500;">DEMO SENSOR</div>
        </div>
      `;
      marker.bindPopup(popupContent);

      if (onStationClick) {
        marker.on('click', () => onStationClick(station));
      }

      markersRef.current.push(marker);
    });
  }, [stations, layer, onStationClick]);

  return <div ref={containerRef} className={className || 'h-full w-full'} />;
}
