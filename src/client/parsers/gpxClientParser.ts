/**
 * Client-Side GPX Parser
 * 100% private, instant offline parsing via browser DOMParser
 */

import type { WorkoutActivity, GeoPoint, SplitRecord } from '../../types.js';
import { computeHeartRateZones, computeRobustElevationGain } from '../../sources/types.js';

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
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

export function parseGpxFileContent(content: string, filename = 'Workout'): WorkoutActivity {
  const parser = new DOMParser();
  const xml = parser.parseFromString(content, 'application/xml');

  const parseError = xml.querySelector('parsererror');
  if (parseError) {
    throw new Error('Malformed GPX XML file');
  }

  const nameEl = xml.querySelector('trk > name, gpx > name');
  const title = nameEl?.textContent?.trim() || filename.replace(/\.gpx$/i, '');

  const trkpts = xml.querySelectorAll('trkpt');
  if (trkpts.length === 0) {
    throw new Error('No trackpoints found in GPX file');
  }

  const points: GeoPoint[] = [];
  let totalDistMeters = 0;
  let elevationGainMeters = 0;
  let hrSum = 0;
  let hrCount = 0;
  let maxHr = 0;

  // Split tracking (every 1000m)
  const splits: SplitRecord[] = [];
  let currentSplitDist = 0;
  let currentSplitTimeStart: number | null = null;
  let currentSplitEleStart: number | null = null;

  trkpts.forEach((pt, index) => {
    const lat = parseFloat(pt.getAttribute('lat') || '0');
    const lon = parseFloat(pt.getAttribute('lon') || '0');
    const eleEl = pt.querySelector('ele');
    const ele = eleEl ? parseFloat(eleEl.textContent || '0') : undefined;
    const timeEl = pt.querySelector('time');
    const time = timeEl?.textContent?.trim();

    // Check heart rate extension in GPX
    const hrEl = pt.querySelector('hr, gpxtpx\\:hr, ns3\\:hr');
    const hr = hrEl ? parseInt(hrEl.textContent || '0', 10) : undefined;

    if (hr && hr > 30) {
      hrSum += hr;
      hrCount++;
      if (hr > maxHr) maxHr = hr;
    }

    if (points.length > 0) {
      const prev = points[points.length - 1];
      const dist = haversineMeters(prev.lat, prev.lon, lat, lon);
      totalDistMeters += dist;
      currentSplitDist += dist;

      // Check split threshold (1000m)
      if (currentSplitDist >= 1000 && time && currentSplitTimeStart) {
        const curTimeMs = new Date(time).getTime();
        const splitSec = Math.max(1, Math.round((curTimeMs - currentSplitTimeStart) / 1000));
        const paceSec = Math.round(splitSec / (currentSplitDist / 1000));
        const eleDiff = ele !== undefined && currentSplitEleStart !== null ? ele - currentSplitEleStart : 0;

        splits.push({
          splitIndex: splits.length + 1,
          distanceMeters: Math.round(currentSplitDist),
          elapsedSec: splitSec,
          paceSecPerKm: paceSec,
          elevationDiffM: Math.round(eleDiff),
        });

        currentSplitDist = 0;
        currentSplitTimeStart = curTimeMs;
        currentSplitEleStart = ele ?? null;
      }
    } else {
      if (time) currentSplitTimeStart = new Date(time).getTime();
      if (ele !== undefined) currentSplitEleStart = ele;
    }

    points.push({ lat, lon, ele, time, hr });
  });

  // Calculate elapsed time from start and end points
  let movingTimeSec = 0;
  if (points.length >= 2 && points[0].time && points[points.length - 1].time) {
    const start = new Date(points[0].time).getTime();
    const end = new Date(points[points.length - 1].time).getTime();
    movingTimeSec = Math.max(0, Math.round((end - start) / 1000));
  } else {
    movingTimeSec = Math.round((totalDistMeters / 1000) * 310);
  }

  const avgPaceSec = totalDistMeters > 0 ? Math.round(movingTimeSec / (totalDistMeters / 1000)) : 0;
  const avgHr = hrCount > 0 ? Math.round(hrSum / hrCount) : undefined;

  return {
    id: `gpx_${Date.now()}`,
    title,
    sportType: 'Run',
    date: points[0]?.time ? points[0].time.split('T')[0] : new Date().toISOString().split('T')[0],
    startTime: points[0]?.time ? points[0].time.split('T')[1]?.substring(0, 5) || '' : '',
    elapsedTimeSec: movingTimeSec,
    movingTimeSec,
    distanceMeters: Math.round(totalDistMeters),
    elevationGainMeters: computeRobustElevationGain(points.map((p) => p.ele)),
    avgPaceSecPerKm: avgPaceSec,
    avgHeartRate: avgHr,
    maxHeartRate: maxHr > 0 ? maxHr : undefined,
    points,
    splits,
    hrZones: avgHr && maxHr ? computeHeartRateZones(avgHr, maxHr, movingTimeSec) : [],
    source: 'gpx',
  };
}
