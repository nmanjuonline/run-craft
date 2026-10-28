/**
 * Intervals.icu Integration Sub-Router
 * Zero-friction, free API for Garmin & endurance athletes
 */

import { Router } from './router.js';
import type { WorkoutActivity, GeoPoint, ActivityType, HeartRateZoneRecord, SplitRecord } from '../types.js';
import { computeHeartRateZones, computeRobustElevationGain } from '../sources/types.js';
import { reverseGeocodeCoords } from '../utils/geocoding.js';

export const intervalsRouter = new Router();

// Cross-request caches for athlete gear and home location
const athleteGearCache = new Map<string, string>();
const athleteCityCache = new Map<string, string>();
let lastApiKey = '';

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
  let apiKey = rawKey.replace(/^API_KEY[:=]\s*/i, '').replace(/["']/g, '').trim();
  if (apiKey) lastApiKey = apiKey;
  else if (lastApiKey) apiKey = lastApiKey;

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

    // Fetch activities and athlete gear list in parallel
    // Try multiple athlete gear endpoints: universal /athlete/0/gear, /athlete/{id}/gear, and numeric id
    const cleanAthId = String(athleteId).replace(/^i/, '');
    const [activitiesRes, gearRes0, gearResAth, gearResNum] = await Promise.all([
      fetch(activitiesUrl, {
        headers: {
          Authorization: getBasicAuthHeader(apiKey),
          Accept: 'application/json',
        },
      }),
      fetch(`https://intervals.icu/api/v1/athlete/0/gear`, {
        headers: {
          Authorization: getBasicAuthHeader(apiKey),
          Accept: 'application/json',
        },
      }).catch(() => null),
      fetch(`https://intervals.icu/api/v1/athlete/${athleteId}/gear`, {
        headers: {
          Authorization: getBasicAuthHeader(apiKey),
          Accept: 'application/json',
        },
      }).catch(() => null),
      cleanAthId !== athleteId
        ? fetch(`https://intervals.icu/api/v1/athlete/${cleanAthId}/gear`, {
            headers: {
              Authorization: getBasicAuthHeader(apiKey),
              Accept: 'application/json',
            },
          }).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!activitiesRes.ok) {
      const errText = await activitiesRes.text();
      console.error(`[Intervals.icu Activities Error] status=${activitiesRes.status}:`, errText);
      return Router.json(
        { error: `Failed to fetch activities for athlete ${athleteId}`, details: errText },
        { status: activitiesRes.status }
      );
    }

    // Build gear map from athlete profile and dedicated /gear endpoints
    const gearMap = new Map<string, string>();
    const athleteGears: Array<{ id: string; name: string; type?: string }> = [];
    const rawGearList: any[] = [];

    const extractGearItems = (data: any) => {
      if (!data) return;
      if (Array.isArray(data)) {
        rawGearList.push(...data);
      } else if (typeof data === 'object') {
        if (Array.isArray(data.gear)) rawGearList.push(...data.gear);
        if (Array.isArray(data.shoes)) rawGearList.push(...data.shoes);
        if (Array.isArray(data.bikes)) rawGearList.push(...data.bikes);
        if (Array.isArray(data.equipment)) rawGearList.push(...data.equipment);
        // Also check if object values are gear items (e.g. dictionary indexed by ID)
        for (const [k, v] of Object.entries(data)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && ((v as any).name || (v as any).model || (v as any).brand)) {
            rawGearList.push({ id: (v as any).id || k, ...(v as any) });
          }
        }
      }
    };

    extractGearItems(athlete.gear);
    extractGearItems(athlete.shoes);
    extractGearItems(athlete.bikes);
    extractGearItems(athlete.equipment);
    for (const [k, v] of Object.entries(athlete)) {
      if (/gear|shoe|bike|equip/i.test(k)) {
        extractGearItems(v);
      }
    }

    for (const gRes of [gearRes0, gearResAth, gearResNum]) {
      if (gRes && gRes.ok) {
        try {
          const gData = await gRes.json();
          extractGearItems(gData);
        } catch {}
      }
    }

    for (const g of rawGearList) {
      if (!g) continue;
      const name = g.name || [g.brand, g.model].filter(Boolean).join(' ') || g.model || undefined;
      if (name) {
        const idStr = String(g.id ?? g.icu_id ?? '');
        if (idStr) {
          gearMap.set(idStr, name);
          gearMap.set(idStr.toLowerCase(), name);
          if (!isNaN(Number(idStr))) gearMap.set(String(Number(idStr)), name);
          if (idStr.startsWith('i')) gearMap.set(idStr.substring(1), name);
          else gearMap.set(`i${idStr}`, name);
        }
        if (g.icu_id) gearMap.set(String(g.icu_id), name);
        if (g.external_id) gearMap.set(String(g.external_id), name);
        if (g.gear_id) gearMap.set(String(g.gear_id), name);
        if (!athleteGears.some((ag) => ag.name === name)) {
          athleteGears.push({ id: idStr || name, name, type: g.type });
        }
      }
    }
    console.log(`[Intervals.icu Gear] Resolved ${gearMap.size} gear keys, ${athleteGears.length} unique equipment items:`, athleteGears.map((ag) => ag.name));
    for (const [k, v] of gearMap.entries()) {
      athleteGearCache.set(k, v);
    }
    if (athlete.city && typeof athlete.city === 'string' && athlete.city.trim()) {
      const athCity = athlete.city.trim();
      const athState = athlete.state && typeof athlete.state === 'string' && athlete.state.trim() ? athlete.state.trim() : '';
      const fullCity = athState ? `${athCity}, ${athState}` : athCity;
      athleteCityCache.set(String(athleteId), fullCity);
      athleteCityCache.set('default', fullCity);
    }

    const rawActivities: any[] = await activitiesRes.json();
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
      } else if (typeStr.includes('weight') || typeStr.includes('strength') || typeStr.includes('gym')) {
        sportType = 'WeightTraining';
      } else if (typeStr.includes('crossfit') || typeStr.includes('hiit')) {
        sportType = 'Crossfit';
      } else if (typeStr.includes('yoga') || typeStr.includes('pilates')) {
        sportType = 'Yoga';
      } else if (typeStr.includes('workout') || typeStr.includes('cardio') || typeStr.includes('training')) {
        sportType = 'Workout';
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
          return raw !== undefined && !isNaN(Number(raw)) ? Math.round(Number(raw)) : 0;
        })(),
        avgPaceSecPerKm: avgPaceSec,
        avgHeartRate: avgHr,
        maxHeartRate: maxHr,
        avgCadence: act.average_cadence ? Math.round(act.average_cadence * (sportType === 'Run' ? 2 : 1)) : undefined,
        avgPowerWatts: act.average_watts ? Math.round(act.average_watts) : undefined,
        calories: act.calories ? Math.round(act.calories) : undefined,
        locationCity: (() => {
          if (act.location_city && typeof act.location_city === 'string' && act.location_city.trim()) return act.location_city.trim();
          if (act.city && typeof act.city === 'string' && act.city.trim()) return act.city.trim();
          if (act.location && typeof act.location === 'string' && act.location.trim()) return act.location.trim();
          if (act.icu_location && typeof act.icu_location === 'string' && act.icu_location.trim()) return act.icu_location.trim();
          if (act.place && typeof act.place === 'string' && act.place.trim()) return act.place.trim();
          const parts: string[] = [];
          if (act.city) parts.push(act.city);
          else if (act.location_city) parts.push(act.location_city);
          if (act.location_state && !parts.includes(act.location_state)) parts.push(act.location_state);
          if (parts.length > 0) return parts.join(', ');
          return undefined;
        })(),
        gearName: (() => {
          if (act.gear && typeof act.gear === 'object' && act.gear.name) return act.gear.name;
          if (act.gear_name && typeof act.gear_name === 'string') return act.gear_name;
          if (act.shoe && typeof act.shoe === 'object' && act.shoe.name) return act.shoe.name;
          if (act.shoe_name && typeof act.shoe_name === 'string') return act.shoe_name;
          if (act.bike && typeof act.bike === 'object' && act.bike.name) return act.bike.name;
          if (act.bike_name && typeof act.bike_name === 'string') return act.bike_name;

          const checkGearVal = (v: any): string | undefined => {
            if (!v) return undefined;
            const str = String(v).trim();
            if (gearMap.has(str)) return gearMap.get(str);
            if (gearMap.has(str.toLowerCase())) return gearMap.get(str.toLowerCase());
            if (str.startsWith('i') && gearMap.has(str.substring(1))) return gearMap.get(str.substring(1));
            if (gearMap.has(`i${str}`)) return gearMap.get(`i${str}`);
            if (typeof v === 'string' && isNaN(Number(v)) && !v.startsWith('i') && !v.startsWith('http') && v.length > 2) {
              return v;
            }
            return undefined;
          };

          const fromGear = checkGearVal(act.gear_id) || checkGearVal(act.icu_gear_id) || checkGearVal(act.gear) || checkGearVal(act.shoe_id) || checkGearVal(act.bike_id);
          if (fromGear) return fromGear;

          if (Array.isArray(act.gear_ids) && act.gear_ids.length > 0) {
            const names = act.gear_ids.map((id: any) => checkGearVal(id)).filter(Boolean);
            if (names.length > 0) return names.join(' • ');
          }
          if (Array.isArray(act.icu_gear_ids) && act.icu_gear_ids.length > 0) {
            const names = act.icu_gear_ids.map((id: any) => checkGearVal(id)).filter(Boolean);
            if (names.length > 0) return names.join(' • ');
          }
          for (const [k, v] of Object.entries(act)) {
            if (/gear|shoe|bike/i.test(k)) {
              if (typeof v === 'object' && v && (v as any).name) return (v as any).name;
              const gv = checkGearVal(v);
              if (gv) return gv;
            }
          }
          return undefined;
        })(),
        points: [],
        splits,
        hrZones,
        deviceName: act.device_name || undefined,
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
      gears: athleteGears,
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
  let apiKey = authHeader.replace(/^Bearer\s+/i, '').replace(/^Basic\s+/i, '').trim() || url.searchParams.get('key') || lastApiKey;
  if (apiKey) lastApiKey = apiKey;

  if (!apiKey) {
    return Router.json({ error: 'Missing Intervals.icu API key' }, { status: 401 });
  }

  const cleanId = params.id.replace(/^icu_/, '');
  // NOTE: Intervals.icu requires .json extension for streams! Include both altitude & fixed_altitude (DEM-corrected)
  const streamsUrl = `https://intervals.icu/api/v1/activity/${cleanId}/streams.json?types=latlng,altitude,fixed_altitude,heartrate,distance,velocity_smooth,time`;

  try {
    const [res, detailRes] = await Promise.all([
      fetch(streamsUrl, {
        headers: {
          Authorization: getBasicAuthHeader(apiKey),
          Accept: 'application/json',
        },
      }),
      fetch(`https://intervals.icu/api/v1/activity/${cleanId}`, {
        headers: {
          Authorization: getBasicAuthHeader(apiKey),
          Accept: 'application/json',
        },
      }).catch(() => null),
    ]);

    if (!res.ok) {
      console.warn(`[Intervals Streams] HTTP ${res.status} for activity ${cleanId}`);
      return Router.json({ error: 'Streams not available for this activity', status: res.status }, { status: res.status });
    }

    let detailGearName: string | undefined = undefined;
    let detailCity: string | undefined = undefined;
    let detailActivityName: string | undefined = undefined;
    if (detailRes && detailRes.ok) {
      try {
        const detail = await detailRes.json();
        detailActivityName = detail.name;
        if (detail.gear && typeof detail.gear === 'object' && detail.gear.name) {
          detailGearName = detail.gear.name;
        } else if (detail.gear_name) {
          detailGearName = detail.gear_name;
        } else if (detail.shoe && typeof detail.shoe === 'object' && detail.shoe.name) {
          detailGearName = detail.shoe.name;
        } else if (detail.shoe_name) {
          detailGearName = detail.shoe_name;
        } else if (detail.bike && typeof detail.bike === 'object' && detail.bike.name) {
          detailGearName = detail.bike.name;
        } else if (detail.bike_name) {
          detailGearName = detail.bike_name;
        } else if (typeof detail.gear === 'string' && isNaN(Number(detail.gear)) && !detail.gear.startsWith('i')) {
          detailGearName = detail.gear;
        }

        if (!detailGearName && detail.gear_id && athleteGearCache.has(String(detail.gear_id))) {
          detailGearName = athleteGearCache.get(String(detail.gear_id));
        }
        if (!detailGearName && detail.gear && athleteGearCache.has(String(detail.gear))) {
          detailGearName = athleteGearCache.get(String(detail.gear));
        }
        if (!detailGearName && detail.shoe_id && athleteGearCache.has(String(detail.shoe_id))) {
          detailGearName = athleteGearCache.get(String(detail.shoe_id));
        }
        if (!detailGearName && detail.bike_id && athleteGearCache.has(String(detail.bike_id))) {
          detailGearName = athleteGearCache.get(String(detail.bike_id));
        }

        console.log(`[STREAMS DETAIL for ${cleanId}]`, {
          city: detail.city,
          location_city: detail.location_city,
          location: detail.location,
          icu_location: detail.icu_location,
          place: detail.place,
          name: detail.name,
        });
        detailCity = detail.location_city || detail.city || detail.location || detail.icu_location || detail.place || undefined;
      } catch (err: any) {
        console.error(`[STREAMS DETAIL ERROR for ${cleanId}]`, err.message);
      }
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

    console.log(`[STREAMS GEOCODE CHECK for ${cleanId}]`, {
      detailCity,
      pointsLen: points.length,
      startPt: points[0],
    });

    // Find valid points that have valid, non-zero coordinates
    const validPoints = points.filter(
      (p) => p && typeof p.lat === 'number' && typeof p.lon === 'number' && !isNaN(p.lat) && !isNaN(p.lon) && (Math.abs(p.lat) > 0.001 || Math.abs(p.lon) > 0.001)
    );

    // If GPS trackpoints exist, GPS geocoding ALWAYS takes precedence because it represents the actual location of this workout!
    if (validPoints.length > 0) {
      let geocoded = await reverseGeocodeCoords(validPoints[0].lat, validPoints[0].lon);

      // For trail workouts, point-to-point marathons, or mountain climbs:
      // If the activity title mentions a destination not matched by the start point (e.g. a trailhead or basecamp),
      // sample the route's midpoint, peak elevation point, and endpoint to discover the intended destination.
      if (validPoints.length > 20 && detailActivityName) {
        const titleLower = detailActivityName.toLowerCase();
        const startCity = geocoded ? geocoded.split(',')[0].trim().toLowerCase() : '';
        const titleHasStart = startCity && titleLower.includes(startCity);

        if (!titleHasStart) {
          // Identify peak elevation point (often the summit, ridge, or destination)
          let peakPt = validPoints[0];
          let maxEle = -Infinity;
          for (const pt of validPoints) {
            if (pt.ele !== undefined && pt.ele > maxEle) {
              maxEle = pt.ele;
              peakPt = pt;
            }
          }

          const midPt = validPoints[Math.floor(validPoints.length / 2)];
          const endPt = validPoints[validPoints.length - 1];
          const testPoints = [midPt, peakPt, endPt];

          for (const tp of testPoints) {
            if (tp && (tp.lat !== validPoints[0].lat || tp.lon !== validPoints[0].lon)) {
              const cand = await reverseGeocodeCoords(tp.lat, tp.lon);
              if (cand) {
                const candCity = cand.split(',')[0].trim().toLowerCase();
                if (candCity && titleLower.includes(candCity)) {
                  geocoded = cand;
                  break;
                }
              }
            }
          }
        }
      }

      console.log(`[Intervals Geocode for ${cleanId}]`, { count: validPoints.length, resolvedCity: geocoded });
      if (geocoded) {
        detailCity = geocoded;
      }
    }
    // Only if no GPS points exist and no metadata city exists, fallback to athlete home city
    if (!detailCity) {
      detailCity = athleteCityCache.get('default');
    }

    return Router.json({
      points,
      splits,
      elevationGainMeters,
      gearName: detailGearName,
      locationCity: detailCity,
    });
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

