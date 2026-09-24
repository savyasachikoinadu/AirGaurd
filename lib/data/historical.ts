// Historical Data Pipeline Architecture
// Interfaces and modules for future CSV ingestion.
// The coordinator CSV is NOT currently connected in Phase 1.
// These modules are ready to accept the real dataset when available.

import type { HistoricalWeatherAirQualityRecord, DatasetProfile, DataSource } from '../types';
import { SeededRandom, hashStringToSeed } from '../demo/seeded-random';

// Schema adapter: maps known CSV column names to normalized fields
export const CSV_COLUMN_MAP: Record<string, keyof HistoricalWeatherAirQualityRecord> = {
  'country': 'country',
  'location_name': 'locationName',
  'latitude': 'latitude',
  'longitude': 'longitude',
  'timezone': 'timezone',
  'last_updated': 'timestamp',
  'temperature_celsius': 'temperatureC',
  'wind_kph': 'windSpeedKph',
  'wind_degree': 'windDirectionDeg',
  'pressure_mb': 'pressureMb',
  'precip_mm': 'precipitationMm',
  'humidity': 'humidity',
  'cloud': 'cloud',
  'visibility_km': 'visibilityKm',
  'air_quality_Carbon_Monoxide': 'co',
  'air_quality_Ozone': 'o3',
  'air_quality_Nitrogen_dioxide': 'no2',
  'air_quality_Sulphur_dioxide': 'so2',
  'air_quality_PM2.5': 'pm25',
  'air_quality_PM10': 'pm10',
};

export interface HistoricalRepository {
  isAvailable(): boolean;
  getProfile(): DatasetProfile;
  queryRecords(opts: {
    country?: string;
    locationName?: string;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): HistoricalWeatherAirQualityRecord[];
}

export interface SchemaAdapter {
  mapRow(rawRow: Record<string, string>): Partial<HistoricalWeatherAirQualityRecord>;
  getMappedColumns(): string[];
}

export interface DataQualityChecker {
  checkRecord(record: HistoricalWeatherAirQualityRecord): { valid: boolean; issues: string[] };
  checkDataset(records: HistoricalWeatherAirQualityRecord[]): {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    missingDataRate: number;
    duplicateCount: number;
    issues: string[];
  };
}

// Stub implementation: CSV not connected in Phase 1
export class StubHistoricalRepository implements HistoricalRepository {
  isAvailable(): boolean {
    return false;
  }

  getProfile(): DatasetProfile {
    return {
      connected: false,
      rowCount: 0,
      columnCount: 0,
      countries: 0,
      locations: [],
      dateRangeStart: null,
      dateRangeEnd: null,
      pollutantCoverage: [],
      weatherCoverage: [],
      missingDataRate: 0,
      source: 'Not connected',
      lastChecked: new Date().toISOString(),
    };
  }

  queryRecords(): HistoricalWeatherAirQualityRecord[] {
    return [];
  }
}

export class CsvSchemaAdapter implements SchemaAdapter {
  mapRow(rawRow: Record<string, string>): Partial<HistoricalWeatherAirQualityRecord> {
    const mapped: Partial<HistoricalWeatherAirQualityRecord> = {};
    for (const [csvCol, field] of Object.entries(CSV_COLUMN_MAP)) {
      if (rawRow[csvCol] !== undefined) {
        const value = rawRow[csvCol];
        if (typeof field === 'string') continue;
        const numFields = ['latitude', 'longitude', 'temperatureC', 'humidity', 'windSpeedKph',
          'windDirectionDeg', 'pressureMb', 'precipitationMm', 'cloud', 'visibilityKm',
          'pm25', 'pm10', 'co', 'no2', 'so2', 'o3'];
        if (numFields.includes(field as string)) {
          (mapped as Record<string, unknown>)[field as string] = parseFloat(value) || 0;
        } else {
          (mapped as Record<string, unknown>)[field as string] = value;
        }
      }
    }
    return mapped;
  }

  getMappedColumns(): string[] {
    return Object.keys(CSV_COLUMN_MAP);
  }
}

export class BasicDataQualityChecker implements DataQualityChecker {
  checkRecord(record: HistoricalWeatherAirQualityRecord): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    if (record.latitude < -90 || record.latitude > 90) issues.push('Invalid latitude');
    if (record.longitude < -180 || record.longitude > 180) issues.push('Invalid longitude');
    if (record.pm25 < 0 || record.pm25 > 1000) issues.push('Invalid PM2.5');
    if (record.pm10 < 0 || record.pm10 > 2000) issues.push('Invalid PM10');
    if (record.temperatureC < -60 || record.temperatureC > 60) issues.push('Invalid temperature');
    if (!record.timestamp) issues.push('Missing timestamp');
    return { valid: issues.length === 0, issues };
  }

  checkDataset(records: HistoricalWeatherAirQualityRecord[]) {
    let valid = 0, invalid = 0;
    const seen = new Set<string>();
    let duplicates = 0;
    const allIssues: string[] = [];

    for (const r of records) {
      const check = this.checkRecord(r);
      if (check.valid) valid++;
      else {
        invalid++;
        allIssues.push(...check.issues);
      }
      const key = `${r.locationName}:${r.timestamp}`;
      if (seen.has(key)) duplicates++;
      else seen.add(key);
    }

    const missingDataRate = records.length > 0
      ? Math.round((invalid / records.length) * 1000) / 10
      : 0;

    return {
      totalRecords: records.length,
      validRecords: valid,
      invalidRecords: invalid,
      missingDataRate,
      duplicateCount: duplicates,
      issues: Array.from(new Set(allIssues)).slice(0, 10),
    };
  }
}

// Factory: returns the stub for now, real implementation when CSV is connected
export function getHistoricalRepository(): HistoricalRepository {
  return new StubHistoricalRepository();
}

export function getDatasetProfile(): DatasetProfile {
  return getHistoricalRepository().getProfile();
}

export const HISTORICAL_SOURCE: DataSource = 'HISTORICAL_DATASET';
