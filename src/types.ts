/**
 * RunCraft Core Type Definitions & System Contracts
 * Edge-First Serverless Application Architecture
 */

export interface Env {
  ENVIRONMENT?: 'production' | 'staging' | 'development';
  SITE_URL?: string;
  STRAVA_CLIENT_ID?: string;
  STRAVA_CLIENT_SECRET?: string;
  STRAVA_REDIRECT_URI?: string;
  DB?: any; // Cloudflare D1 Database binding
  KV?: any; // Cloudflare KV Namespace binding
  STORAGE_ENGINE?: 'memory' | 'd1' | 'kv';
}

export interface GeoPoint {
  lat: number;
  lon: number;
  ele?: number; // Elevation in meters
  time?: string;
  hr?: number; // Heart rate in bpm
  cadence?: number;
  power?: number;
  paceSecPerKm?: number;
}

export interface SplitRecord {
  splitIndex: number;
  distanceMeters: number;
  elapsedSec?: number;
  elapsedTimeSec?: number;
  movingTimeSec?: number;
  paceSecPerKm: number;
  elevationDiffM?: number;
  elevationDiffMeters?: number;
  avgHeartRate?: number;
}

export interface HeartRateZoneRecord {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  minBpm: number;
  maxBpm: number;
  timeSec: number;
  percent: number;
}

export type ActivityType = 'Run' | 'Ride' | 'TrailRun' | 'Hike' | 'Walk' | 'Workout';

export interface WorkoutActivity {
  id: string;
  title: string;
  sportType: ActivityType;
  date: string;
  startTime: string;
  elapsedTimeSec: number;
  movingTimeSec: number;
  distanceMeters: number;
  elevationGainMeters: number;
  avgPaceSecPerKm: number;
  maxPaceSecPerKm?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  avgPowerWatts?: number;
  calories?: number;
  locationCity?: string;
  weatherTempC?: number;
  weatherCondition?: string;
  gearName?: string;
  polyline?: string; // Encoded summary polyline or raw
  points: GeoPoint[];
  splits: SplitRecord[];
  hrZones: HeartRateZoneRecord[];
  source: 'strava' | 'garmin_fit' | 'gpx' | 'mock' | 'manual';
}

export type AspectRatio = '9:16' | '4:5' | '1:1' | '16:9';
export type OverlayThemeId = 'glass-dark' | 'glass-light' | 'neon-cyber' | 'swiss-minimal' | 'retro-lcd';
export type RouteColorMode = 'solid' | 'elevation' | 'pace' | 'heartrate';

/** Visual layout / composition template for the canvas overlay */
export type OverlayLayoutId =
  | 'classic'      // Default: title top, route center, stats bottom
  | 'cinematic'    // Full-bleed photo, hero distance huge center, minimal bottom strip
  | 'swiss-grid'   // Swiss typography: big number left, data table right
  | 'neon-cyber'   // Neon glow-heavy, dark base, stats pill across center
  | 'split-story'  // 9:16 split: photo upper half, solid stats card lower half
  | 'polaroid';    // White-border frame, vintage film aesthetic

export interface PhotoFilterSettings {
  brightness: number; // 0.5 to 1.5, default 1.0
  contrast: number; // 0.5 to 1.5, default 1.0
  saturation: number; // 0 to 2.0, default 1.0
  vignette: number; // 0 to 1.0, default 0.3
  blur: number; // 0 to 10px, default 0
  exposure: number; // -0.5 to 0.5, default 0
}

export interface WidgetPosition {
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  scale: number; // 0.5 to 2.0
}

export interface MetricVisibilityConfig {
  distance: boolean;
  time: boolean;
  pace: boolean;
  elevation: boolean;
  heartRate: boolean;
  cadence: boolean;
  calories: boolean;
  power: boolean;
}

export interface OverlayConfig {
  layoutId: OverlayLayoutId;
  aspectRatio: AspectRatio;
  theme: OverlayThemeId;
  accentColor: string;
  routeColorMode: RouteColorMode;
  showPolyline: boolean;
  showGlow: boolean;
  glowIntensity?: number; // 0.1 to 1.0, default 0.70
  showStartFinishPins: boolean;
  showTitleHeader: boolean;
  showHeroStats: boolean;
  showHrZones: boolean;
  showSplits: boolean;
  showSecondaryStats: boolean;
  showWatermark: boolean;
  watermarkText: string;
  cardOpacity: number; // 0.1 to 1.0
  photoFilters: PhotoFilterSettings;
  metrics: MetricVisibilityConfig;
  positions: {
    header: WidgetPosition;
    heroStats: WidgetPosition;
    routeMap: WidgetPosition;
    hrZones: WidgetPosition;
    splits: WidgetPosition;
  };
}

export interface ExecutionLimits {
  maxUploadSizeBytes: number;
  maxPointsRendered: number;
  defaultBatchSize: number;
  retryAttempts: number;
}
