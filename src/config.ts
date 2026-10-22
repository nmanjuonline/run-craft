/**
 * RunCraft Centralized Configuration & Resolvers
 * Edge-First Serverless Application Architecture
 * STRICT RULE: No source code file may ever contain hardcoded URLs, domains, or magic numbers.
 */

import type { Env, ExecutionLimits, OverlayConfig } from './types.js';

export const CONFIG = {
  APP: {
    NAME: 'RunCraft',
    VERSION: '1.0.0',
    SLOGAN: 'Workout Photo Overlay Studio for Runners & Cyclists',
    DEFAULT_DOMAIN: 'https://run-craft.pages.dev',
    DEV_DOMAIN: 'http://localhost:5173',
  },
  LIMITS: {
    MAX_UPLOAD_SIZE_BYTES: 15 * 1024 * 1024, // 15MB
    MAX_POINTS_RENDERED: 2500,
    DEFAULT_BATCH_SIZE: 50,
    RETRY_ATTEMPTS: 3,
    D1_BATCH_MAX_STATEMENTS: 90, // Cloudflare D1 strict limit
  },
  STRAVA: {
    AUTH_URL: 'https://www.strava.com/oauth/authorize',
    TOKEN_URL: 'https://www.strava.com/oauth/token',
    API_BASE: 'https://www.strava.com/api/v3',
    DEFAULT_SCOPES: 'read,activity:read_all',
  },
  STORAGE: {
    PREFIX_ACTIVITIES: 'rc_act_',
    PREFIX_PRESETS: 'rc_preset_',
    PREFIX_SETTINGS: 'rc_set_',
  },
  DEFAULTS: {
    THEME: 'glass-dark' as const,
    ACCENT_COLOR: '#c8ff00', // Hyper-lime
    ASPECT_RATIO: '9:16' as const,
    WATERMARK: 'Crafted with RunCraft',
    DEFAULT_OVERLAY_CONFIG: {
      aspectRatio: '9:16' as const,
      theme: 'glass-dark' as const,
      accentColor: '#c8ff00',
      routeColorMode: 'elevation' as const,
      showPolyline: true,
      showGlow: true,
      glowIntensity: 0.70,
      showStartFinishPins: true,
      showTitleHeader: true,
      showHeroStats: true,
      showHrZones: true,
      showSplits: false,
      showSecondaryStats: true,
      showWatermark: true,
      watermarkText: 'Crafted with RunCraft',
      cardOpacity: 0.85,
      photoFilters: {
        brightness: 1.0,
        contrast: 1.05,
        saturation: 1.05,
        vignette: 0.35,
        blur: 0,
        exposure: 0,
      },
      metrics: {
        distance: true,
        time: true,
        pace: true,
        elevation: true,
        heartRate: true,
        cadence: true,
        calories: true,
        power: true,
      },
      positions: {
        header: { xPercent: 50, yPercent: 7.5, scale: 1.0 },
        routeMap: { xPercent: 50, yPercent: 38, scale: 1.0 },
        splits: { xPercent: 50, yPercent: 59, scale: 0.95 },
        heroStats: { xPercent: 50, yPercent: 73, scale: 1.0 },
        hrZones: { xPercent: 50, yPercent: 88, scale: 1.0 },
      },
    } as OverlayConfig,
  },
} as const;

export function getSiteBaseUrl(env?: Env, customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.replace(/\/+$/, '');
  }
  if (env?.SITE_URL && env.SITE_URL.trim().length > 0) {
    return env.SITE_URL.replace(/\/+$/, '');
  }
  if (env?.ENVIRONMENT === 'development') {
    return CONFIG.APP.DEV_DOMAIN;
  }
  return CONFIG.APP.DEFAULT_DOMAIN;
}

export function getExecutionLimits(env?: Env): ExecutionLimits {
  return {
    maxUploadSizeBytes: CONFIG.LIMITS.MAX_UPLOAD_SIZE_BYTES,
    maxPointsRendered: CONFIG.LIMITS.MAX_POINTS_RENDERED,
    defaultBatchSize: CONFIG.LIMITS.DEFAULT_BATCH_SIZE,
    retryAttempts: CONFIG.LIMITS.RETRY_ATTEMPTS,
  };
}

export function getStravaConfig(env?: Env) {
  const baseUrl = getSiteBaseUrl(env);
  return {
    clientId: env?.STRAVA_CLIENT_ID || '',
    clientSecret: env?.STRAVA_CLIENT_SECRET || '',
    redirectUri: env?.STRAVA_REDIRECT_URI || `${baseUrl}/api/strava/callback`,
    authUrl: CONFIG.STRAVA.AUTH_URL,
    tokenUrl: CONFIG.STRAVA.TOKEN_URL,
    apiBase: CONFIG.STRAVA.API_BASE,
    scope: CONFIG.STRAVA.DEFAULT_SCOPES,
  };
}

export function getStorageConfig(env?: Env) {
  return {
    engine: env?.STORAGE_ENGINE || (env?.DB ? 'd1' : env?.KV ? 'kv' : 'memory'),
    d1BatchMaxStatements: CONFIG.LIMITS.D1_BATCH_MAX_STATEMENTS,
    activityPrefix: CONFIG.STORAGE.PREFIX_ACTIVITIES,
  };
}
