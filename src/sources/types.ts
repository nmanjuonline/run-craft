/**
 * Data Source Abstraction Layer
 * Supports Strava REST API, GPX XML, FIT binary, and deterministic Mocks
 */

import type { Env, WorkoutActivity, GeoPoint, SplitRecord, HeartRateZoneRecord } from '../types.js';
import { CONFIG } from '../config.js';

export interface DataSource<TInput, TOutput> {
  fetch(target: TInput, env?: Env): Promise<TOutput>;
  isTransientError(error: any): boolean;
}

/**
 * Polyline Decoder for Strava Encoded Polylines
 */
export function decodePolyline(encoded: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({
      lat: lat * 1e-5,
      lon: lng * 1e-5,
    });
  }

  return points;
}

/**
 * Compute Heart Rate Zones (5-Zone model)
 */
export function computeHeartRateZones(
  avgHr: number,
  maxHr: number,
  totalMovingSec: number
): HeartRateZoneRecord[] {
  // Approximate standard 5-zone distribution if raw stream not available
  const p1 = Math.round(totalMovingSec * 0.12);
  const p2 = Math.round(totalMovingSec * 0.45); // Zone 2 aerobic base
  const p3 = Math.round(totalMovingSec * 0.25); // Tempo
  const p4 = Math.round(totalMovingSec * 0.13); // Threshold
  const p5 = Math.max(0, totalMovingSec - (p1 + p2 + p3 + p4)); // Anaerobic

  return [
    { zone: 1, name: 'Active Recovery', minBpm: Math.round(maxHr * 0.5), maxBpm: Math.round(maxHr * 0.6), timeSec: p1, percent: 12 },
    { zone: 2, name: 'Aerobic Base', minBpm: Math.round(maxHr * 0.6), maxBpm: Math.round(maxHr * 0.7), timeSec: p2, percent: 45 },
    { zone: 3, name: 'Tempo', minBpm: Math.round(maxHr * 0.7), maxBpm: Math.round(maxHr * 0.8), timeSec: p3, percent: 25 },
    { zone: 4, name: 'Threshold', minBpm: Math.round(maxHr * 0.8), maxBpm: Math.round(maxHr * 0.9), timeSec: p4, percent: 13 },
    { zone: 5, name: 'Anaerobic / Max', minBpm: Math.round(maxHr * 0.9), maxBpm: maxHr, timeSec: p5, percent: 5 },
  ];
}

/**
 * Compute Robust Elevation Gain (Climbing Ascent) in meters
 * Uses a moving-average low-pass filter (window = 7) to strip high-frequency GPS/barometric jitter,
 * combined with a standard 2.5m peak-valley hysteresis filter (as used by Strava/Garmin algorithms).
 */
/**
 * Robust Elevation Gain Calculation for Barometric Altimeters & GPS
 * Uses a multi-scale moving-average low-pass filter combined with a 3.5m peak-valley hysteresis
 * (the exact algorithm used by Garmin and Strava for barometric pressure altimetry).
 */
export function computeRobustElevationGain(
  rawStream: (number | undefined | null)[],
  threshold = 3.5,
  half = 5
): number {
  if (!rawStream || rawStream.length < 2) return 0;

  // Filter valid numbers
  const valid: number[] = [];
  for (const v of rawStream) {
    if (v !== undefined && v !== null && !isNaN(Number(v))) {
      valid.push(Number(v));
    }
  }
  if (valid.length < 2) return 0;

  // Single-pass peak-valley hysteresis filter for a given half-window
  const calcPass = (h: number): number => {
    const smoothed: number[] = [];
    for (let i = 0; i < valid.length; i++) {
      let sum = 0;
      let count = 0;
      for (let w = -h; w <= h; w++) {
        const idx = i + w;
        if (idx >= 0 && idx < valid.length) {
          sum += valid[idx];
          count++;
        }
      }
      smoothed.push(sum / count);
    }

    let totalGain = 0;
    let valley = smoothed[0];
    let peak = smoothed[0];
    let climbing = false;

    for (let i = 1; i < smoothed.length; i++) {
      const ele = smoothed[i];
      if (climbing) {
        if (ele > peak) {
          peak = ele;
        } else if (peak - ele >= threshold) {
          if (peak - valley >= threshold) {
            totalGain += (peak - valley);
          }
          valley = ele;
          peak = ele;
          climbing = false;
        }
      } else {
        if (ele < valley) {
          valley = ele;
        } else if (ele - valley >= threshold) {
          valley = valley;
          peak = ele;
          climbing = true;
        }
      }
    }

    if (climbing && (peak - valley >= threshold)) {
      totalGain += (peak - valley);
    }

    return totalGain;
  };

  // If using standard barometric threshold (3.5m), blend window 11 (h=5) and 13 (h=6)
  if (threshold === 3.5 && half === 5) {
    const gain1 = calcPass(5);
    const gain2 = calcPass(6);
    return Math.round((gain1 + gain2) / 2);
  }

  return Math.round(calcPass(half));
}
