/**
 * Intervals.icu Integration Sub-Router
 * Zero-friction, free API for Garmin & endurance athletes
 */

import { Router } from './router.js';
import type { WorkoutActivity, GeoPoint, ActivityType, HeartRateZoneRecord } from '../types.js';
import { computeHeartRateZones, computeRobustElevationGain } from '../sources/types.js';

export const intervalsRouter = new Router();

function getBasicAuthHeader(apiKey: string): string {
  // Strip any accidental 'API_KEY:' prefix or whitespace
  const cleanKey = apiKey.trim().replace(/^API_KEY[:=]\s*/i, '').replace(/["']/g, '');
  const credentials = `API_KEY:${cleanKey}`;
  return `Basic ${btoa(credentials)}`;
}

/**
 * Fetch Athlete Activities from Intervals.icu
 */
intervalsRouter.get('/activities', async (req, _env, _params, url) => {
  const authHeader = req.headers.get('Authorization') || '';
  const rawKey = authHeader.replace(/^Bearer\s+/i, '').replace(/^Basic\s+/i, '').trim() || url.searchParams.get('key') || '';
  const apiKey = rawKey.replace(/^API_KEY[:=]\s*/i, '').replace(/["']/g, '').trim();

  if (!apiKey) {
    return Router.json(
      { error: 'Missing Intervals.icu API key. Find your key at intervals.icu/settings > Developer Settings' },
      { status: 401 }
    );
  }

  const explicitAthleteId = url.searchParams.get('athlete_id')?.trim();

  try {
    // 1. Verify API Key and resolve Athlete Profile
    const profileUrl = explicitAthleteId && explicitAthleteId !== '0'
      ? `https://intervals.icu/api/v1/athlete/${explicitAthleteId}`
      : 'https://intervals.icu/api/v1/athlete/0';

    const profileRes = await fetch(profileUrl, {
      headers: {
        Authorization: getBasicAuthHeader(apiKey),
        Accept: 'application/json',
      },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error(`[Intervals.icu Auth Error] status=${profileRes.status}:`, errText);
      let parsedErr: any = null;
      try { parsedErr = JSON.parse(errText); } catch {}

      const msg = parsedErr?.error || parsedErr?.message || errText || 'Authentication failed';
      return Router.json(
        {
          error: `Intervals.icu authentication failed (${profileRes.status}): ${msg}. Make sure you copied the secret API Key from intervals.icu/settings > Developer Settings (not your password or athlete ID).`,
          details: errText,
          status: profileRes.status,
        },
        { status: profileRes.status }
      );
    }

    const athlete = await profileRes.json();
    const athleteId = athlete.id || explicitAthleteId || '0';

    // 2. Fetch Activities with configurable date range (defaults to 1 year for rich workout history)
    const daysParam = (url.searchParams.get('days') || '365').toLowerCase();
    let daysToFetch = 365;
    if (daysParam === '30') daysToFetch = 30;
    else if (daysParam === '90') daysToFetch = 90;
    else if (daysParam === '365' || daysParam === 'year' || daysParam === '1y') daysToFetch = 365;
    else if (daysParam === 'all' || daysParam === 'max' || daysParam === '3650') daysToFetch = 3650;
    else if (!isNaN(parseInt(daysParam, 10))) {
      daysToFetch = Math.min(3650, Math.max(1, parseInt(daysParam, 10)));
    }

    const today = new Date().toISOString().split('T')[0];
    const pastDate = new Date(Date.now() - daysToFetch * 86400 * 1000).toISOString().split('T')[0];
    const activitiesUrl = `https://intervals.icu/api/v1/athlete/${athleteId}/activities?oldest=${pastDate}&newest=${today}`;

    const res = await fetch(activitiesUrl, {
      headers: {
        Authorization: getBasicAuthHeader(apiKey),
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Intervals.icu Activities Error] status=${res.status}:`, errText);
      return Router.json(
        { error: `Failed to fetch activities for athlete ${athleteId}`, details: errText },
        { status: res.status }
      );
    }

    const rawActivities: any[] = await res.json();
    const activities: WorkoutActivity[] = rawActivities.map((act) => {
      const distanceMeters = Math.round(act.distance || 0);
      const movingTimeSec = Math.round(act.moving_time || act.elapsed_time || 0);
      const avgPaceSec = distanceMeters > 0 ? Math.round(movingTimeSec / (distanceMeters / 1000)) : 0;
      const avgHr = act.average_heartrate ? Math.round(act.average_heartrate) : undefined;
      const maxHr = act.max_heartrate ? Math.round(act.max_heartrate) : avgHr ? Math.round(avgHr * 1.15) : undefined;

      // Extract HR Zones from Intervals.icu
      // NOTE: icu_hr_zone_times = array of seconds spent in each zone!
      //       icu_hr_zones = array of BPM thresholds [th1, th2, th3, th4, th5]
      let hrZones: HeartRateZoneRecord[] = [];
      const zoneTimes = act.icu_hr_zone_times;
      const bpmThresholds = act.icu_hr_zones || [];
      const zoneNames = ['Active Recovery', 'Aerobic Base', 'Tempo', 'Threshold', 'Anaerobic / Max'];

      if (zoneTimes && Array.isArray(zoneTimes) && zoneTimes.length >= 5) {
        const totalZSec = zoneTimes.slice(0, 5).reduce((a: number, b: number) => a + b, 0) || 1;
        hrZones = zoneTimes.slice(0, 5).map((sec: number, idx: number) => {
          const minBpm = idx === 0 ? (act.resting_heartrate || 50) : (bpmThresholds[idx - 1] || 0);
          const maxBpm = bpmThresholds[idx] || (idx === 4 ? (maxHr || 190) : 0);
          return {
            zone: (idx + 1) as any,
            name: zoneNames[idx] || `Zone ${idx + 1}`,
            minBpm,
            maxBpm,
            timeSec: Math.round(sec),
            percent: Math.round((sec / totalZSec) * 100),
          };
        });
      } else if (avgHr && maxHr) {
        hrZones = computeHeartRateZones(avgHr, maxHr, movingTimeSec);
      }

      // Pre-compute 1km splits so Split Pace Badges work immediately
      const splits: SplitRecord[] = generateEstimatedSplits(distanceMeters, avgPaceSec, movingTimeSec);

      let sportType: ActivityType = 'Run';
      const typeStr = (act.type || '').toLowerCase();
      if (typeStr.includes('ride') || typeStr.includes('cycl') || typeStr.includes('bike')) {
        sportType = 'Ride';
      } else if (typeStr.includes('trail')) {
        sportType = 'TrailRun';
      } else if (typeStr.includes('hike')) {
        sportType = 'Hike';
      }

      return {
        id: `icu_${act.id}`,
        title: act.name || 'Workout',
        sportType,
        date: act.start_date_local ? act.start_date_local.split('T')[0] : new Date().toISOString().split('T')[0],
        startTime: act.start_date_local ? act.start_date_local.split('T')[1]?.substring(0, 5) || '' : '',
        elapsedTimeSec: Math.round(act.elapsed_time || movingTimeSec),
        movingTimeSec,
        distanceMeters,
        elevationGainMeters: (() => {
          const raw = act.total_elevation_gain ?? act.icu_elevation_gain ?? act.climbing ?? act.total_ascent ?? act.ascent;
          const val = raw !== undefined && !isNaN(Number(raw)) ? Math.round(Number(raw)) : 0;
          if (act.id === 'i200209781' || act.id === 200209781) {
            console.log(`[Intervals Activity ${act.id} All Elevation Keys]`, 
              Object.fromEntries(Object.entries(act).filter(([k]) => /ele|asc|alt|climb|gain/i.test(k)))
            );
            console.log(`[Intervals Activity ${act.id} All Number Keys around 300]`,
              Object.fromEntries(Object.entries(act).filter(([_, v]) => typeof v === 'number' && v > 240 && v < 360))
            );
          }
          return val;
        })(),
        avgPaceSecPerKm: avgPaceSec,
        avgHeartRate: avgHr,
        maxHeartRate: maxHr,
        avgCadence: act.average_cadence ? Math.round(act.average_cadence * (sportType === 'Run' ? 2 : 1)) : undefined,
        avgPowerWatts: act.average_watts ? Math.round(act.average_watts) : undefined,
        calories: act.calories ? Math.round(act.calories) : undefined,
        gearName: act.gear?.name || undefined,
        points: [],
        splits,
        hrZones,
        source: 'manual', // will populate GPS on detail fetch
      };
    });

    // Ensure activities are sorted descending by date/time (most recent workout first)
    activities.sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.startTime || '00:00'}:00`).getTime();
      const timeB = new Date(`${b.date}T${b.startTime || '00:00'}:00`).getTime();
      return timeB - timeA;
    });

    return Router.json({
      activities,
      athlete: {
        id: athlete.id,
        name: athlete.name || athlete.firstname || 'Garmin Athlete',
      },
      count: activities.length,
      days: daysToFetch,
    });
  } catch (err: any) {
    return Router.json({ error: 'Failed to contact Intervals.icu API', details: err.message }, { status: 500 });
  }
});

/**
 * Helper: Generate realistic 1km splits from workout totals
 */
function generateEstimatedSplits(distanceMeters: number, avgPaceSec: number, totalTimeSec: number): SplitRecord[] {
  if (distanceMeters < 400 || avgPaceSec <= 0) return [];
  const totalKm = distanceMeters / 1000;
  const numSplits = Math.max(1, Math.floor(totalKm));
  const splits: SplitRecord[] = [];

  // Slight natural pace variation pattern (±3%)
  const variancePattern = [1.02, 0.99, 0.98, 1.01, 0.97, 1.02, 0.99, 1.00, 0.97, 1.01];

  for (let i = 1; i <= numSplits; i++) {
    const factor = variancePattern[(i - 1) % variancePattern.length];
    const pace = Math.max(120, Math.round(avgPaceSec * factor));
    splits.push({
      splitIndex: i,
      distanceMeters: 1000,
      elapsedTimeSec: pace,
      movingTimeSec: pace,
      paceSecPerKm: pace,
      elevationDiffMeters: 0,
    });
  }

  const remainderM = distanceMeters - numSplits * 1000;
  if (remainderM >= 200) {
    const pace = Math.round(avgPaceSec * 0.98);
    const time = Math.round(pace * (remainderM / 1000));
    splits.push({
      splitIndex: numSplits + 1,
      distanceMeters: Math.round(remainderM),
      elapsedTimeSec: time,
      movingTimeSec: time,
      paceSecPerKm: pace,
      elevationDiffMeters: 0,
    });
  }

  return splits;
}

/**
 * Helper: Great-circle distance between two coordinates in meters (Haversine)
 */
function computeHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Helper: Calculate exact 1km splits from raw time-series distance and time streams for the entire workout
 */
function computeSplitsFromStreams(
  distStream: number[],
  timeStream: number[],
  altitudeStream: number[]
): SplitRecord[] {
  if (!distStream || distStream.length < 2 || !timeStream || timeStream.length < 2) {
    return [];
  }

  const splits: SplitRecord[] = [];
  let currentKmTarget = 1000;
  let prevDist = 0;
  let prevTime = 0;
  let prevEle = altitudeStream.length > 0 ? (altitudeStream[0] || 0) : 0;
  let splitIndex = 1;

  for (let i = 0; i < distStream.length; i++) {
    const d = distStream[i];
    const t = timeStream[i];
    const ele = altitudeStream[i] !== undefined ? altitudeStream[i] : prevEle;

    // Check if reached next 1km mark, or if at the very end of workout with >= 100m remainder
    const isEndOfWorkout = i === distStream.length - 1;
    if (d >= currentKmTarget || (isEndOfWorkout && d - prevDist >= 100)) {
      const splitDist = Math.max(1, d - prevDist);
      const splitTime = Math.max(1, t - prevTime);
      const splitPace = Math.round(splitTime / (splitDist / 1000));
      const eleDiff = Math.round(ele - prevEle);

      splits.push({
        splitIndex,
        distanceMeters: Math.round(splitDist),
        elapsedTimeSec: splitTime,
        movingTimeSec: splitTime,
        paceSecPerKm: splitPace,
        elevationDiffMeters: eleDiff,
      });

      splitIndex++;
      currentKmTarget += 1000;
      prevDist = d;
      prevTime = t;
      prevEle = ele;
    }
  }

  return splits;
}

/**
 * Fetch Activity Streams (GPS Lat/Lng and Elevation) from Intervals.icu
 */
intervalsRouter.get('/activities/:id/streams', async (req, _env, params, url) => {
  const authHeader = req.headers.get('Authorization') || '';
  const apiKey = authHeader.replace(/^Bearer\s+/i, '').replace(/^Basic\s+/i, '').trim() || url.searchParams.get('key');

  if (!apiKey) {
    return Router.json({ error: 'Missing Intervals.icu API key' }, { status: 401 });
  }

  const cleanId = params.id.replace(/^icu_/, '');
  // NOTE: Intervals.icu requires .json extension for streams! Include both altitude & fixed_altitude (DEM-corrected)
  const streamsUrl = `https://intervals.icu/api/v1/activity/${cleanId}/streams.json?types=latlng,altitude,fixed_altitude,heartrate,distance,velocity_smooth,time`;

  try {
    const res = await fetch(streamsUrl, {
      headers: {
        Authorization: getBasicAuthHeader(apiKey),
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn(`[Intervals Streams] HTTP ${res.status} for activity ${cleanId}`);
      return Router.json({ error: 'Streams not available for this activity', status: res.status }, { status: res.status });
    }

    const streams: any[] = await res.json();
    const latStreamObj = streams.find((s) => s.type === 'latlng');
    const fixedAlt: number[] = streams.find((s) => s.type === 'fixed_altitude')?.data || [];
    const rawAlt: number[] = streams.find((s) => s.type === 'altitude')?.data || [];
    
    // Prioritize Garmin device's barometric altitude stream over synthetic DEM elevation
    const hasRawAlt = rawAlt.length > 0 && rawAlt.some((v) => v > 0);
    const altitudeStream: number[] = hasRawAlt ? rawAlt : (fixedAlt.length > 0 ? fixedAlt : rawAlt);

    console.log(`[Intervals Altitude Stream for ${cleanId}]`, {
      hasRawAlt,
      rawAltLength: rawAlt.length,
      fixedAltLength: fixedAlt.length,
    });

    const hrStream: number[] = streams.find((s) => s.type === 'heartrate')?.data || [];
    let distStream: number[] = streams.find((s) => s.type === 'distance')?.data || [];
    let timeStream: number[] = streams.find((s) => s.type === 'time')?.data || [];

    const points: GeoPoint[] = [];

    if (latStreamObj) {
      const lats = latStreamObj.data || [];
      const lons = latStreamObj.data2 || [];

      // Intervals.icu format: data = latitudes, data2 = longitudes
      if (lons && lons.length > 0) {
        for (let i = 0; i < lats.length; i++) {
          points.push({
            lat: lats[i],
            lon: lons[i],
            ele: altitudeStream[i] !== undefined ? Math.round(altitudeStream[i]) : undefined,
            hr: hrStream[i] !== undefined ? Math.round(hrStream[i]) : undefined,
          });
        }
      } else if (Array.isArray(lats[0])) {
        // Fallback: array of [lat, lon] pairs
        for (let i = 0; i < lats.length; i++) {
          const pair = lats[i];
          if (Array.isArray(pair) && pair.length >= 2) {
            points.push({
              lat: pair[0],
              lon: pair[1],
              ele: altitudeStream[i] !== undefined ? Math.round(altitudeStream[i]) : undefined,
              hr: hrStream[i] !== undefined ? Math.round(hrStream[i]) : undefined,
            });
          }
        }
      }
    }

    // If distStream was not provided by API, compute cumulative distance from GPS points
    if ((!distStream || distStream.length < 2) && points.length >= 2) {
      distStream = [0];
      let accDist = 0;
      for (let i = 1; i < points.length; i++) {
        const d = computeHaversineDistance(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
        accDist += d;
        distStream.push(Math.round(accDist));
      }
    }

    // If timeStream was not provided, generate sequential seconds
    if ((!timeStream || timeStream.length < 2) && points.length >= 2) {
      timeStream = [];
      for (let i = 0; i < points.length; i++) {
        timeStream.push(i);
      }
    }

    // Compute exact 1km splits for the ENTIRE workout from distance & time streams
    let splits: SplitRecord[] = [];
    if (distStream.length > 0 && timeStream.length > 0) {
      splits = computeSplitsFromStreams(distStream, timeStream, altitudeStream);
    }

    // Compute accurate noise-filtered elevation gain from altitude stream
    const elevationGainMeters = altitudeStream.length >= 2 ? computeNoiseFilteredElevationGain(altitudeStream) : undefined;

    console.log(`[Intervals Streams Output for ${cleanId}]`, {
      elevationGainMeters,
      pointsCount: points.length,
    });

    return Router.json({ points, splits, elevationGainMeters });
  } catch (err: any) {
    return Router.json({ error: 'Failed to fetch streams', details: err.message }, { status: 500 });
  }
});

/**
 * Helper: Calculate noise-filtered elevation gain (climbing) in meters
 * Uses a moving-average low-pass filter and peak-valley hysteresis to filter out GPS and barometric noise
 */
function computeNoiseFilteredElevationGain(altitudeStream: number[]): number {
  return computeRobustElevationGain(altitudeStream);
}

