/**
 * Edge Parser Sub-Router
 * Parses GPX XML and FIT binary metadata
 */

import { Router } from './router.js';
import type { WorkoutActivity, GeoPoint, SplitRecord } from '../types.js';
import { computeHeartRateZones, computeRobustElevationGain } from '../sources/types.js';

export const parserRouter = new Router();

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseGpxString(gpxText: string): WorkoutActivity {
  // Regex-based trackpoint extractor compatible with pure Edge environments without DOMParser
  const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["']>([\s\S]*?)<\/trkpt>/gi;
  const eleRegex = /<ele>([^<]+)<\/ele>/i;
  const timeRegex = /<time>([^<]+)<\/time>/i;
  const hrRegex = /(?:<gpxtpx:hr>|<hr>)([^<]+)(?:<\/gpxtpx:hr>|<\/hr>)/i;
  const nameRegex = /<name>([^<]+)<\/name>/i;

  const titleMatch = gpxText.match(nameRegex);
  const title = titleMatch ? titleMatch[1].trim() : 'GPX Workout';

  const points: GeoPoint[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;

  let match: RegExpExecArray | null;
  while ((match = trkptRegex.exec(gpxText)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const inner = match[3];

    const eleMatch = inner.match(eleRegex);
    const timeMatch = inner.match(timeRegex);
    const hrMatch = inner.match(hrRegex);

    const ele = eleMatch ? parseFloat(eleMatch[1]) : undefined;
    const time = timeMatch ? timeMatch[1] : undefined;
    const hr = hrMatch ? parseInt(hrMatch[1], 10) : undefined;

    if (hr) {
      hrSum += hr;
      hrCount++;
      if (hr > maxHr) maxHr = hr;
    }

    if (points.length > 0) {
      const prev = points[points.length - 1];
      const dist = haversineDistanceMeters(prev.lat, prev.lon, lat, lon);
      totalDistance += dist;
    }

    points.push({ lat, lon, ele, time, hr });
  }

  // Calculate elapsed time from timestamps if available
  let movingTimeSec = 0;
  if (points.length >= 2 && points[0].time && points[points.length - 1].time) {
    const start = new Date(points[0].time).getTime();
    const end = new Date(points[points.length - 1].time).getTime();
    movingTimeSec = Math.max(0, Math.round((end - start) / 1000));
  } else {
    // Estimate moving time assuming 5:00/km if no timestamps
    movingTimeSec = Math.round((totalDistance / 1000) * 300);
  }

  const avgPaceSec = totalDistance > 0 ? Math.round(movingTimeSec / (totalDistance / 1000)) : 0;
  const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : undefined;
  const robustElevationGain = computeRobustElevationGain(points.map((p) => p.ele));

  return {
    id: `gpx_${Date.now()}`,
    title,
    sportType: 'Run',
    date: points[0]?.time ? points[0].time.split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: points[0]?.time ? points[0].time.split('T')[1]?.substring(0, 5) || '' : '',
    elapsedTimeSec: movingTimeSec,
    movingTimeSec,
    distanceMeters: Math.round(totalDistance),
    elevationGainMeters: robustElevationGain,
    avgPaceSecPerKm: avgPaceSec,
    avgHeartRate: avgHr,
    maxHeartRate: maxHr > 0 ? maxHr : undefined,
    points,
    splits: [],
    hrZones: avgHr && maxHr ? computeHeartRateZones(avgHr, maxHr, movingTimeSec) : [],
    source: 'gpx',
  };
}

parserRouter.post('/gpx', async (req) => {
  const text = await req.text();
  if (!text || text.length < 50) {
    return Router.json({ error: 'Invalid or empty GPX file' }, { status: 400 });
  }
  try {
    const activity = parseGpxString(text);
    return Router.json({ success: true, activity });
  } catch (err: any) {
    return Router.json({ error: 'Failed to parse GPX content', details: err.message }, { status: 400 });
  }
});
