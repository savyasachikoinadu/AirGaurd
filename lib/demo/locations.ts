// Asia demo locations and Bengaluru demo sensor stations
// All values are fictional and deterministic. Not real observations.

import type { LocationDef, GeoPoint } from '../types';

export const ASIA_LOCATIONS: LocationDef[] = [
  { id: 'bengaluru', country: 'India', city: 'Bengaluru', location: { lat: 12.9716, lng: 77.5946 }, timezone: 'Asia/Kolkata', isDefault: true, stationCount: 10 },
  { id: 'new-delhi', country: 'India', city: 'New Delhi', location: { lat: 28.6139, lng: 77.2090 }, timezone: 'Asia/Kolkata', isDefault: false, stationCount: 3 },
  { id: 'mumbai', country: 'India', city: 'Mumbai', location: { lat: 19.0760, lng: 72.8777 }, timezone: 'Asia/Kolkata', isDefault: false, stationCount: 3 },
  { id: 'kolkata', country: 'India', city: 'Kolkata', location: { lat: 22.5726, lng: 88.3639 }, timezone: 'Asia/Kolkata', isDefault: false, stationCount: 3 },
  { id: 'chennai', country: 'India', city: 'Chennai', location: { lat: 13.0827, lng: 80.2707 }, timezone: 'Asia/Kolkata', isDefault: false, stationCount: 3 },
  { id: 'dhaka', country: 'Bangladesh', city: 'Dhaka', location: { lat: 23.8103, lng: 90.4125 }, timezone: 'Asia/Dhaka', isDefault: false, stationCount: 3 },
  { id: 'islamabad', country: 'Pakistan', city: 'Islamabad', location: { lat: 33.6844, lng: 73.0479 }, timezone: 'Asia/Karachi', isDefault: false, stationCount: 2 },
  { id: 'kathmandu', country: 'Nepal', city: 'Kathmandu', location: { lat: 27.7172, lng: 85.3240 }, timezone: 'Asia/Kathmandu', isDefault: false, stationCount: 2 },
  { id: 'colombo', country: 'Sri Lanka', city: 'Colombo', location: { lat: 6.9271, lng: 79.8612 }, timezone: 'Asia/Colombo', isDefault: false, stationCount: 2 },
  { id: 'kabul', country: 'Afghanistan', city: 'Kabul', location: { lat: 34.5553, lng: 69.2075 }, timezone: 'Asia/Kabul', isDefault: false, stationCount: 2 },
  { id: 'beijing', country: 'China', city: 'Beijing', location: { lat: 39.9042, lng: 116.4074 }, timezone: 'Asia/Shanghai', isDefault: false, stationCount: 3 },
  { id: 'tokyo', country: 'Japan', city: 'Tokyo', location: { lat: 35.6762, lng: 139.6503 }, timezone: 'Asia/Tokyo', isDefault: false, stationCount: 3 },
  { id: 'seoul', country: 'South Korea', city: 'Seoul', location: { lat: 37.5665, lng: 126.9780 }, timezone: 'Asia/Seoul', isDefault: false, stationCount: 3 },
  { id: 'jakarta', country: 'Indonesia', city: 'Jakarta', location: { lat: -6.2088, lng: 106.8456 }, timezone: 'Asia/Jakarta', isDefault: false, stationCount: 3 },
  { id: 'kuala-lumpur', country: 'Malaysia', city: 'Kuala Lumpur', location: { lat: 3.1390, lng: 101.6869 }, timezone: 'Asia/Kuala_Lumpur', isDefault: false, stationCount: 2 },
  { id: 'singapore', country: 'Singapore', city: 'Singapore', location: { lat: 1.3521, lng: 103.8198 }, timezone: 'Asia/Singapore', isDefault: false, stationCount: 3 },
  { id: 'bangkok', country: 'Thailand', city: 'Bangkok', location: { lat: 13.7563, lng: 100.5018 }, timezone: 'Asia/Bangkok', isDefault: false, stationCount: 3 },
  { id: 'hanoi', country: 'Vietnam', city: 'Hanoi', location: { lat: 21.0285, lng: 105.8542 }, timezone: 'Asia/Ho_Chi_Minh', isDefault: false, stationCount: 2 },
  { id: 'manila', country: 'Philippines', city: 'Manila', location: { lat: 14.5995, lng: 120.9842 }, timezone: 'Asia/Manila', isDefault: false, stationCount: 2 },
  { id: 'abu-dhabi', country: 'United Arab Emirates', city: 'Abu Dhabi', location: { lat: 24.4539, lng: 54.3773 }, timezone: 'Asia/Dubai', isDefault: false, stationCount: 2 },
  { id: 'riyadh', country: 'Saudi Arabia', city: 'Riyadh', location: { lat: 24.7136, lng: 46.6753 }, timezone: 'Asia/Riyadh', isDefault: false, stationCount: 2 },
  { id: 'doha', country: 'Qatar', city: 'Doha', location: { lat: 25.2854, lng: 51.5310 }, timezone: 'Asia/Qatar', isDefault: false, stationCount: 2 },
  { id: 'muscat', country: 'Oman', city: 'Muscat', location: { lat: 23.5880, lng: 58.3829 }, timezone: 'Asia/Muscat', isDefault: false, stationCount: 2 },
  { id: 'astana', country: 'Kazakhstan', city: 'Astana', location: { lat: 51.1605, lng: 71.4704 }, timezone: 'Asia/Almaty', isDefault: false, stationCount: 2 },
  { id: 'tashkent', country: 'Uzbekistan', city: 'Tashkent', location: { lat: 41.2995, lng: 69.2401 }, timezone: 'Asia/Tashkent', isDefault: false, stationCount: 2 },
];

export function getDefaultLocation(): LocationDef {
  return ASIA_LOCATIONS.find((l) => l.isDefault) || ASIA_LOCATIONS[0];
}

export function getLocationById(id: string): LocationDef | undefined {
  return ASIA_LOCATIONS.find((l) => l.id === id);
}

// Fictional demo monitoring stations around Bengaluru
// These are NOT real CPCB or OpenAQ stations
export interface DemoStationDef {
  id: string;
  name: string;
  offsetLat: number;
  offsetLng: number;
  basePm25: number;
  basePm10: number;
  baseNo2: number;
  baseO3: number;
  baseSo2: number;
  baseCo: number;
  trafficInfluence: number; // 0-1
  industrialInfluence: number; // 0-1
  burningInfluence: number; // 0-1
}

export const BENGALURU_STATIONS: DemoStationDef[] = [
  { id: 'blr-central', name: 'Central Bengaluru', offsetLat: 0.0, offsetLng: 0.0, basePm25: 68, basePm10: 120, baseNo2: 55, baseO3: 48, baseSo2: 18, baseCo: 1.8, trafficInfluence: 0.8, industrialInfluence: 0.2, burningInfluence: 0.3 },
  { id: 'blr-whitefield', name: 'Whitefield', offsetLat: -0.02, offsetLng: 0.06, basePm25: 72, basePm10: 135, baseNo2: 62, baseO3: 42, baseSo2: 22, baseCo: 2.1, trafficInfluence: 0.7, industrialInfluence: 0.5, burningInfluence: 0.2 },
  { id: 'blr-electronic-city', name: 'Electronic City', offsetLat: -0.05, offsetLng: 0.02, basePm25: 80, basePm10: 148, baseNo2: 70, baseO3: 38, baseSo2: 28, baseCo: 2.4, trafficInfluence: 0.6, industrialInfluence: 0.7, burningInfluence: 0.15 },
  { id: 'blr-peenya', name: 'Peenya Industrial', offsetLat: 0.03, offsetLng: -0.05, basePm25: 95, basePm10: 175, baseNo2: 85, baseO3: 35, baseSo2: 42, baseCo: 3.2, trafficInfluence: 0.5, industrialInfluence: 0.9, burningInfluence: 0.1 },
  { id: 'blr-koramangala', name: 'Koramangala', offsetLat: -0.01, offsetLng: 0.01, basePm25: 65, basePm10: 110, baseNo2: 58, baseO3: 50, baseSo2: 16, baseCo: 1.7, trafficInfluence: 0.9, industrialInfluence: 0.1, burningInfluence: 0.4 },
  { id: 'blr-yelahanka', name: 'Yelahanka', offsetLat: 0.06, offsetLng: 0.0, basePm25: 55, basePm10: 95, baseNo2: 45, baseO3: 55, baseSo2: 14, baseCo: 1.4, trafficInfluence: 0.4, industrialInfluence: 0.2, burningInfluence: 0.5 },
  { id: 'blr-hebbal', name: 'Hebbal', offsetLat: 0.04, offsetLng: 0.02, basePm25: 70, basePm10: 125, baseNo2: 60, baseO3: 46, baseSo2: 20, baseCo: 1.9, trafficInfluence: 0.75, industrialInfluence: 0.3, burningInfluence: 0.25 },
  { id: 'blr-jp-nagar', name: 'JP Nagar', offsetLat: -0.03, offsetLng: 0.0, basePm25: 60, basePm10: 105, baseNo2: 52, baseO3: 52, baseSo2: 15, baseCo: 1.6, trafficInfluence: 0.7, industrialInfluence: 0.15, burningInfluence: 0.35 },
  { id: 'blr-devanahalli', name: 'Devanahalli', offsetLat: 0.09, offsetLng: 0.04, basePm25: 42, basePm10: 75, baseNo2: 35, baseO3: 60, baseSo2: 10, baseCo: 1.1, trafficInfluence: 0.3, industrialInfluence: 0.1, burningInfluence: 0.6 },
  { id: 'blr-bommanahalli', name: 'Bommanahalli', offsetLat: -0.04, offsetLng: 0.03, basePm25: 78, basePm10: 140, baseNo2: 68, baseO3: 40, baseSo2: 25, baseCo: 2.3, trafficInfluence: 0.65, industrialInfluence: 0.6, burningInfluence: 0.2 },
];

// Generic station templates for non-Bengaluru locations
export function getGenericStations(location: LocationDef): DemoStationDef[] {
  const baseSeed = location.id.length + location.location.lat + location.location.lng;
  const stations: DemoStationDef[] = [];
  for (let i = 0; i < location.stationCount; i++) {
    const angle = (i / location.stationCount) * Math.PI * 2;
    const radius = 0.03 + (i * 0.01);
    stations.push({
      id: `${location.id}-stn-${i}`,
      name: `${location.city} Station ${i + 1}`,
      offsetLat: Math.cos(angle) * radius,
      offsetLng: Math.sin(angle) * radius,
      basePm25: 50 + ((baseSeed + i * 17) % 60),
      basePm10: 90 + ((baseSeed + i * 23) % 80),
      baseNo2: 40 + ((baseSeed + i * 11) % 40),
      baseO3: 40 + ((baseSeed + i * 13) % 25),
      baseSo2: 12 + ((baseSeed + i * 7) % 20),
      baseCo: 1.2 + ((baseSeed + i * 5) % 20) / 10,
      trafficInfluence: 0.4 + ((i * 13) % 50) / 100,
      industrialInfluence: 0.3 + ((i * 17) % 50) / 100,
      burningInfluence: 0.2 + ((i * 11) % 40) / 100,
    });
  }
  return stations;
}

export function getStationsForLocation(location: LocationDef): DemoStationDef[] {
  if (location.id === 'bengaluru') {
    return BENGALURU_STATIONS;
  }
  return getGenericStations(location);
}
