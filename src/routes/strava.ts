/**
 * Strava Integration Routes
 * Free Developer API (OAuth 2.0 & Activity Ingestion)
 */

import { Router } from './router.js';
import { getStravaConfig } from '../config.js';
import { decodePolyline, computeHeartRateZones } from '../sources/types.js';
import type { WorkoutActivity, ActivityType } from '../types.js';

export const stravaRouter = new Router();

/**
 * Generate Strava OAuth authorization URL
 */
stravaRouter.get('/auth-url', (_req, env, _params, url) => {
  const config = getStravaConfig(env);
  const clientId = url.searchParams.get('client_id') || config.clientId;
  const redirectUri = url.searchParams.get('redirect_uri') || config.redirectUri;

  if (!clientId) {
    return Router.json(
      {
        error: 'Missing Strava Client ID. You can enter your free Strava Client ID in settings.',
      },
      { status: 400 }
    );
  }

  const authUrl = `${config.authUrl}?client_id=${encodeURIComponent(
    clientId
  )}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&approval_prompt=auto&scope=${encodeURIComponent(config.scope)}`;

  return Router.json({ authUrl, clientId, redirectUri });
});

/**
 * Handle OAuth Callback Redirection
 */
stravaRouter.get('/callback', (_req, _env, _params, url) => {
  const code = url.searchParams.get('code') || '';
  const error = url.searchParams.get('error') || '';
  return Router.redirect(`/?code=${encodeURIComponent(code)}&error=${encodeURIComponent(error)}`);
});

/**
 * Exchange OAuth authorization code for Access Token
 */
stravaRouter.post('/token', async (req, env) => {
  const config = getStravaConfig(env);
  const body = await req.json().catch(() => ({}));
  const code = body.code;
  const clientId = body.clientId || config.clientId;
  const clientSecret = body.clientSecret || config.clientSecret;

  if (!code) {
    return Router.json({ error: 'Missing authorization code' }, { status: 400 });
  }

  if (!clientId || !clientSecret) {
    return Router.json(
      { error: 'Missing Strava Client ID or Client Secret' },
      { status: 400 }
    );
  }

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) {
    return Router.json({ error: 'Strava token exchange failed', details: tokenData }, { status: 400 });
  }

  return Router.json({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
    athlete: tokenData.athlete,
  });
});

/**
 * Fetch athlete activities from Strava API
 */
stravaRouter.get('/activities', async (req, env, _params, url) => {
  const config = getStravaConfig(env);
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/, '') || url.searchParams.get('token');

  if (!token) {
    return Router.json({ error: 'Missing access token in Authorization header' }, { status: 401 });
  }

  const perPage = url.searchParams.get('per_page') || '15';
  const page = url.searchParams.get('page') || '1';

  const stravaRes = await fetch(
    `${config.apiBase}/athlete/activities?per_page=${perPage}&page=${page}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!stravaRes.ok) {
    const rawErr = await stravaRes.text();
    console.error(`[Strava API Error] status=${stravaRes.status}:`, rawErr);
    let parsed: any = null;
    try {
      parsed = JSON.parse(rawErr);
    } catch {}

    let userFriendlyMsg = 'Failed to fetch Strava activities';
    if (parsed && parsed.errors && parsed.errors.length > 0) {
      const firstErr = parsed.errors[0];
      if (firstErr.code === 'insufficient_scope') {
        userFriendlyMsg = 'Insufficient Scope: This token only has public read permissions. Strava requires the "activity:read_all" scope to fetch your workouts.';
      } else if (firstErr.code === 'Inactive' || firstErr.field === 'Status') {
        userFriendlyMsg = 'Strava API App Inactive: Strava now requires the app owner to have an active paid Strava subscription to use their developer API. Since you are on a free account, export your activity as a .GPX or .FIT file for free from Strava/Garmin and drop it directly into RunCraft!';
      } else {
        userFriendlyMsg = `${firstErr.field || ''} ${firstErr.code || ''}: ${parsed.message || ''}`.trim();
      }
    } else if (parsed && parsed.message) {
      userFriendlyMsg = parsed.message;
    }

    return Router.json(
      {
        error: userFriendlyMsg,
        statusCode: stravaRes.status,
        details: parsed || rawErr,
      },
      { status: stravaRes.status }
    );
  }

  const rawActivities: any[] = await stravaRes.json();
  const normalized: WorkoutActivity[] = rawActivities.map((act) => {
    const distanceMeters = Math.round(act.distance || 0);
    const movingTimeSec = Math.round(act.moving_time || 0);
    const avgPaceSecPerKm = distanceMeters > 0 ? Math.round(movingTimeSec / (distanceMeters / 1000)) : 0;
    const avgHr = act.average_heartrate ? Math.round(act.average_heartrate) : undefined;
    const maxHr = act.max_heartrate ? Math.round(act.max_heartrate) : avgHr ? Math.round(avgHr * 1.15) : undefined;

    let points: any[] = [];
    if (act.map?.summary_polyline) {
      points = decodePolyline(act.map.summary_polyline);
    }

    const sportType: ActivityType =
      act.type === 'Ride' ? 'Ride' :
      act.type === 'Hike' ? 'Hike' :
      act.type === 'TrailRun' ? 'TrailRun' : 'Run';

    return {
      id: `strava_${act.id}`,
      title: act.name || 'Workout',
      sportType,
      date: act.start_date_local ? act.start_date_local.split('T')[0] : new Date().toISOString().split('T')[0],
      startTime: act.start_date_local ? act.start_date_local.split('T')[1]?.substring(0, 5) || '' : '',
      elapsedTimeSec: act.elapsed_time || movingTimeSec,
      movingTimeSec,
      distanceMeters,
      elevationGainMeters: Math.round(act.total_elevation_gain || 0),
      avgPaceSecPerKm,
      maxPaceSecPerKm: act.max_speed ? Math.round(1000 / act.max_speed) : undefined,
      avgHeartRate: avgHr,
      maxHeartRate: maxHr,
      avgCadence: act.average_cadence ? Math.round(act.average_cadence * 2) : undefined, // Garmin/Strava steps/min
      avgPowerWatts: act.average_watts ? Math.round(act.average_watts) : undefined,
      calories: act.kilojoules ? Math.round(act.kilojoules * 0.239) : undefined,
      locationCity: act.location_city || undefined,
      polyline: act.map?.summary_polyline,
      points,
      splits: [],
      hrZones: avgHr && maxHr ? computeHeartRateZones(avgHr, maxHr, movingTimeSec) : [],
      source: 'strava',
    };
  });

  return Router.json({ activities: normalized });
});
