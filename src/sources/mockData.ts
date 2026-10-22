/**
 * Built-in Sample Workouts & Mock Data Source
 * Realistic GPS routes with coordinates, elevations, splits, and HR data
 */

import type { WorkoutActivity, GeoPoint } from '../types.js';
import { computeHeartRateZones } from './types.js';

function generateArcTrack(
  startLat: number,
  startLon: number,
  pointsCount: number,
  radiusKm: number,
  elevationBaseM: number,
  elevationVarianceM: number
): GeoPoint[] {
  const points: GeoPoint[] = [];
  for (let i = 0; i < pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2 * 0.85;
    const latOffset = (Math.sin(angle) * radiusKm) / 111;
    const lonOffset = (Math.cos(angle) * radiusKm) / (111 * Math.cos(startLat * (Math.PI / 180)));
    const ele = Math.round(
      elevationBaseM + Math.sin(i / 15) * elevationVarianceM + Math.cos(i / 30) * (elevationVarianceM * 0.5)
    );
    const hr = Math.round(142 + Math.sin(i / 10) * 22);
    points.push({
      lat: +(startLat + latOffset).toFixed(6),
      lon: +(startLon + lonOffset).toFixed(6),
      ele,
      hr,
    });
  }
  return points;
}

export const MOCK_ACTIVITIES: WorkoutActivity[] = [
  {
    id: 'sample_trail_21k',
    title: 'Marin Headlands Skyline Trail',
    sportType: 'TrailRun',
    date: '2026-10-18',
    startTime: '07:15 AM',
    elapsedTimeSec: 6840, // 1h 54m
    movingTimeSec: 6480,
    distanceMeters: 21100, // 21.1 km
    elevationGainMeters: 640,
    avgPaceSecPerKm: 307, // 5:07 /km
    maxPaceSecPerKm: 242,
    avgHeartRate: 156,
    maxHeartRate: 178,
    avgCadence: 174,
    calories: 1540,
    locationCity: 'Marin County, CA',
    weatherTempC: 14,
    weatherCondition: 'Cool & Misty',
    gearName: 'Salomon S/Lab Genesis',
    source: 'mock',
    points: generateArcTrack(37.832, -122.525, 120, 3.8, 180, 240),
    splits: [
      { splitIndex: 1, distanceMeters: 5000, elapsedSec: 1530, paceSecPerKm: 306, elevationDiffM: 140, avgHeartRate: 148 },
      { splitIndex: 2, distanceMeters: 5000, elapsedSec: 1610, paceSecPerKm: 322, elevationDiffM: 260, avgHeartRate: 162 },
      { splitIndex: 3, distanceMeters: 5000, elapsedSec: 1510, paceSecPerKm: 302, elevationDiffM: -180, avgHeartRate: 154 },
      { splitIndex: 4, distanceMeters: 6100, elapsedSec: 1830, paceSecPerKm: 300, elevationDiffM: 420, avgHeartRate: 160 },
    ],
    hrZones: computeHeartRateZones(156, 178, 6480),
  },
  {
    id: 'sample_morning_5k',
    title: 'Sunrise River Tempo Run',
    sportType: 'Run',
    date: '2026-10-21',
    startTime: '06:30 AM',
    elapsedTimeSec: 1260, // 21m 00s
    movingTimeSec: 1245,
    distanceMeters: 5020,
    elevationGainMeters: 38,
    avgPaceSecPerKm: 248, // 4:08 /km
    maxPaceSecPerKm: 220,
    avgHeartRate: 168,
    maxHeartRate: 184,
    avgCadence: 182,
    calories: 385,
    locationCity: 'Central River Loop',
    weatherTempC: 17,
    weatherCondition: 'Clear & Crisp',
    gearName: 'Nike Vaporfly 3',
    source: 'mock',
    points: generateArcTrack(40.7128, -74.006, 90, 1.4, 15, 20),
    splits: [
      { splitIndex: 1, distanceMeters: 1000, elapsedSec: 252, paceSecPerKm: 252, elevationDiffM: 5, avgHeartRate: 152 },
      { splitIndex: 2, distanceMeters: 1000, elapsedSec: 250, paceSecPerKm: 250, elevationDiffM: 8, avgHeartRate: 164 },
      { splitIndex: 3, distanceMeters: 1000, elapsedSec: 248, paceSecPerKm: 248, elevationDiffM: 10, avgHeartRate: 170 },
      { splitIndex: 4, distanceMeters: 1000, elapsedSec: 246, paceSecPerKm: 246, elevationDiffM: 7, avgHeartRate: 175 },
      { splitIndex: 5, distanceMeters: 1020, elapsedSec: 249, paceSecPerKm: 244, elevationDiffM: 8, avgHeartRate: 182 },
    ],
    hrZones: computeHeartRateZones(168, 184, 1245),
  },
  {
    id: 'sample_cycling_60k',
    title: 'Alpine Pass Weekend Century Ride',
    sportType: 'Ride',
    date: '2026-10-19',
    startTime: '08:00 AM',
    elapsedTimeSec: 7560, // 2h 06m
    movingTimeSec: 7200,
    distanceMeters: 62400, // 62.4 km
    elevationGainMeters: 1120,
    avgPaceSecPerKm: 115, // 31.2 km/h
    maxPaceSecPerKm: 60,
    avgHeartRate: 146,
    maxHeartRate: 172,
    avgCadence: 88,
    avgPowerWatts: 235,
    calories: 1890,
    locationCity: 'Sierra Foothills',
    weatherTempC: 21,
    weatherCondition: 'Sunny',
    gearName: 'Trek Emonda SLR 9',
    source: 'mock',
    points: generateArcTrack(39.1911, -106.8175, 150, 12.0, 2100, 750),
    splits: [
      { splitIndex: 1, distanceMeters: 20000, elapsedSec: 2300, paceSecPerKm: 115, elevationDiffM: 350, avgHeartRate: 142 },
      { splitIndex: 2, distanceMeters: 20000, elapsedSec: 2700, paceSecPerKm: 135, elevationDiffM: 620, avgHeartRate: 155 },
      { splitIndex: 3, distanceMeters: 22400, elapsedSec: 2200, paceSecPerKm: 98, elevationDiffM: 150, avgHeartRate: 140 },
    ],
    hrZones: computeHeartRateZones(146, 172, 7200),
  },
];
