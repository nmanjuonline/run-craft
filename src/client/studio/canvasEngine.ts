/**
 * RunCraft Canvas Rendering Engine
 * High-performance 2D Canvas studio for workout photo overlays
 */

import type { WorkoutActivity, OverlayConfig, AspectRatio, GeoPoint, SplitRecord } from '../../types.js';
import { computeRobustElevationGain } from '../../sources/types.js';

export interface CanvasDimensions {
  width: number;
  height: number;
  ratio: AspectRatio;
}

export const ASPECT_DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  '9:16': { width: 1080, height: 1920 },
  '4:5': { width: 1080, height: 1350 },
  '1:1': { width: 1080, height: 1080 },
  '16:9': { width: 1920, height: 1080 },
};

function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "--'--\"";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.floor(secPerKm % 60);
  return `${mins}'${secs.toString().padStart(2, '0')}"`;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentImage: HTMLImageElement | null = null;
  private imageOffset = { x: 0, y: 0 };
  private imageZoom = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
  }

  setImage(img: HTMLImageElement | null) {
    this.currentImage = img;
  }

  setImageTransform(offset: { x: number; y: number }, zoom = 1.0) {
    this.imageOffset = offset;
    this.imageZoom = zoom;
  }

  render(activity: WorkoutActivity, config: OverlayConfig) {
    const dim = ASPECT_DIMENSIONS[config.aspectRatio];
    this.canvas.width = dim.width;
    this.canvas.height = dim.height;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, dim.width, dim.height);

    // 1. Draw Background Photo (or gradient fallback)
    this.drawBackground(dim.width, dim.height, config);

    // 2. Draw Vignette and Atmosphere
    this.drawAtmosphere(dim.width, dim.height, config);

    // 3. Draw Route Polyline Overlay (if enabled)
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      this.drawRoutePolyline(activity.points, dim.width, dim.height, config);
    }

    // 4. Draw Header / Activity Title Card
    if (config.showTitleHeader) {
      this.drawHeader(activity, dim.width, dim.height, config);
    }

    // 5. Draw Hero Metrics Card (Distance, Pace, Time, Elevation)
    if (config.showHeroStats) {
      this.drawHeroStats(activity, dim.width, dim.height, config);
    }

    // 6. Draw Heart Rate Zones Bar (if enabled)
    if (config.showHrZones && activity.hrZones && activity.hrZones.length > 0) {
      this.drawHrZones(activity, dim.width, dim.height, config);
    }

    // 7. Draw Splits Pill Bar (if enabled)
    if (config.showSplits && activity.splits && activity.splits.length > 0) {
      this.drawSplits(activity, dim.width, dim.height, config);
    }

    // 8. Draw Watermark / Branding
    if (config.showWatermark) {
      this.drawWatermark(dim.width, dim.height, config);
    }
  }

  private drawBackground(w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const filters = config.photoFilters;

    if (this.currentImage) {
      ctx.save();
      // Apply CSS-like filters on canvas context
      ctx.filter = `brightness(${filters.brightness * 100}%) contrast(${filters.contrast * 100}%) saturate(${filters.saturation * 100}%) ${filters.blur > 0 ? `blur(${filters.blur}px)` : ''}`;

      const img = this.currentImage;
      const imgRatio = img.width / img.height;
      const canvasRatio = w / h;

      let drawW = w;
      let drawH = h;
      let drawX = 0;
      let drawY = 0;

      if (imgRatio > canvasRatio) {
        drawH = h * this.imageZoom;
        drawW = drawH * imgRatio;
        drawX = (w - drawW) / 2 + this.imageOffset.x;
        drawY = (h - drawH) / 2 + this.imageOffset.y;
      } else {
        drawW = w * this.imageZoom;
        drawH = drawW / imgRatio;
        drawX = (w - drawW) / 2 + this.imageOffset.x;
        drawY = (h - drawH) / 2 + this.imageOffset.y;
      }

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      // Sleek athletic dark mesh gradient fallback
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0b0f17');
      grad.addColorStop(0.5, '#121824');
      grad.addColorStop(1, '#080b10');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  private drawAtmosphere(w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const v = config.photoFilters.vignette;
    if (v <= 0) return;

    // Dark radial vignette at borders
    const radius = Math.max(w, h) * 0.75;
    const grad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.35, w / 2, h / 2, radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, `rgba(0,0,0,${v * 0.45})`);
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(0.95, v * 0.85)})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle dark gradient at top and bottom for text readability
    const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.22);
    topGrad.addColorStop(0, 'rgba(11, 15, 23, 0.7)');
    topGrad.addColorStop(1, 'rgba(11, 15, 23, 0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, w, h * 0.22);

    const btmGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
    btmGrad.addColorStop(0, 'rgba(11, 15, 23, 0)');
    btmGrad.addColorStop(1, 'rgba(11, 15, 23, 0.85)');
    ctx.fillStyle = btmGrad;
    ctx.fillRect(0, h * 0.65, w, h * 0.35);
  }

  private drawRoutePolyline(points: GeoPoint[], w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const pos = config.positions.routeMap;
    const cx = (w * pos.xPercent) / 100;
    const cy = (h * pos.yPercent) / 100;

    const mapW = w * 0.75 * pos.scale;
    const mapH = h * 0.32 * pos.scale;

    // Calculate bounds
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;
    let minEle = Infinity,
      maxEle = -Infinity;

    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
      if (p.ele !== undefined) {
        if (p.ele < minEle) minEle = p.ele;
        if (p.ele > maxEle) maxEle = p.ele;
      }
    }

    const latSpanRaw = Math.max(1e-5, maxLat - minLat);
    const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
    const lonSpanRaw = Math.max(1e-5, (maxLon - minLon) * Math.cos(midLatRad));

    // Preserve geographic aspect ratio so route loops/turns are not stretched
    const scaleX = mapW / lonSpanRaw;
    const scaleY = mapH / latSpanRaw;
    const fitScale = Math.min(scaleX, scaleY);

    const actualMapW = lonSpanRaw * fitScale;
    const actualMapH = latSpanRaw * fitScale;

    // Map coordinates to pixel space
    const project = (p: GeoPoint) => {
      const normX = ((p.lon - minLon) * Math.cos(midLatRad)) / lonSpanRaw;
      const normY = 1 - (p.lat - minLat) / latSpanRaw; // Invert latitude for screen
      return {
        x: cx - actualMapW / 2 + normX * actualMapW,
        y: cy - actualMapH / 2 + normY * actualMapH,
      };
    };

    if (points.length < 2) return;
    const projected = points.map(project);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Subtle Dark Contrast Underlay (ensures route is legible against bright skies/clouds)
    ctx.save();
    ctx.lineWidth = 5.2 * pos.scale;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 4 * pos.scale;
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    for (let i = 1; i < projected.length; i++) {
      ctx.lineTo(projected[i].x, projected[i].y);
    }
    ctx.stroke();
    ctx.restore();

    // 2. Luminous Ambient Glow (Visible, vibrant, and drawn ONCE across the whole polyline)
    if (config.showGlow) {
      const intensity = config.glowIntensity ?? 0.70;

      // Pass A: Wide Soft Ambient Aura
      ctx.save();
      ctx.lineWidth = 15 * pos.scale;
      ctx.strokeStyle = config.accentColor;
      ctx.globalAlpha = 0.35 * intensity;
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 24 * pos.scale;
      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].x, projected[i].y);
      }
      ctx.stroke();
      ctx.restore();

      // Pass B: Inner Core Neon Bloom
      ctx.save();
      ctx.lineWidth = 9 * pos.scale;
      ctx.strokeStyle = config.accentColor;
      ctx.globalAlpha = 0.60 * intensity;
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 12 * pos.scale;
      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].x, projected[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3. Crisp, High-Definition Fore-Route Polyline (shadowBlur = 0 for razor-sharp athletic precision)
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4.6 * pos.scale;

    if (config.routeColorMode === 'elevation' && maxEle > minEle) {
      // Multi-segment gradient by elevation (zero shadowBlur ensures zero blur compounding)
      for (let i = 0; i < points.length - 1; i++) {
        const pt1 = projected[i];
        const pt2 = projected[i + 1];
        const ele = points[i].ele !== undefined ? points[i].ele : minEle;
        const eleRatio = Math.max(0, Math.min(1, (ele - minEle) / (maxEle - minEle)));

        const segGrad = ctx.createLinearGradient(pt1.x, pt1.y, pt2.x, pt2.y);
        const col1 = eleRatio < 0.35 ? '#00f0ff' : eleRatio < 0.7 ? '#c8ff00' : '#ff4a36';
        const col2 = eleRatio > 0.65 ? '#ff4a36' : config.accentColor;
        segGrad.addColorStop(0, col1);
        segGrad.addColorStop(1, col2);

        ctx.strokeStyle = segGrad;
        ctx.beginPath();
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.stroke();
      }
    } else {
      // Solid Accent Path
      ctx.strokeStyle = config.accentColor;
      ctx.beginPath();
      ctx.moveTo(projected[0].x, projected[0].y);
      for (let i = 1; i < projected.length; i++) {
        ctx.lineTo(projected[i].x, projected[i].y);
      }
      ctx.stroke();
    }

    // Start & Finish Pins
    if (config.showStartFinishPins && points.length > 1) {
      const startPt = projected[0];
      const endPt = projected[projected.length - 1];

      // Start Pin (Subtle emerald green with crisp white dot)
      ctx.save();
      ctx.shadowBlur = 5 * pos.scale;
      ctx.shadowColor = '#00ff88';
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, 6.5 * pos.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(startPt.x, startPt.y, 2.5 * pos.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Finish Pin (Subtle solar coral with crisp white dot)
      ctx.save();
      ctx.shadowBlur = 5 * pos.scale;
      ctx.shadowColor = '#ff4a36';
      ctx.fillStyle = '#ff4a36';
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 7 * pos.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 3 * pos.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawHeader(activity: WorkoutActivity, w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const pos = config.positions.header;
    const cx = (w * pos.xPercent) / 100;
    const cy = (h * pos.yPercent) / 100;

    ctx.save();
    ctx.textAlign = 'center';

    // Activity Type & Date Pill
    const pillText = `${activity.sportType.toUpperCase()} • ${activity.date} ${activity.startTime ? `• ${activity.startTime}` : ''}`;
    ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
    const pillW = ctx.measureText(pillText).width + 52;
    const pillH = 48;

    // Glass pill background
    ctx.fillStyle = `rgba(18, 24, 36, ${config.cardOpacity})`;
    this.roundRect(ctx, cx - pillW / 2, cy - pillH / 2, pillW, pillH, 24);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pill text
    ctx.fillStyle = config.accentColor;
    ctx.fillText(pillText, cx, cy + 8);

    // Title text with generous breathing room below pill (resolves cramped spacing)
    ctx.font = `800 ${48 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillText(activity.title, cx, cy + 92 * pos.scale);

    // Location / Weather / Gear Subtitle
    const subParts: string[] = [];
    if (activity.locationCity) subParts.push(activity.locationCity);
    if (activity.weatherTempC !== undefined) subParts.push(`${activity.weatherTempC}°C ${activity.weatherCondition || ''}`);
    if (activity.gearName) subParts.push(activity.gearName);

    if (subParts.length > 0) {
      ctx.font = `500 ${24 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowBlur = 8;
      ctx.fillText(subParts.join('  •  '), cx, cy + 146 * pos.scale);
    }

    ctx.restore();
  }

  private drawHeroStats(activity: WorkoutActivity, w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const pos = config.positions.heroStats;
    const cx = (w * pos.xPercent) / 100;
    const cy = (h * pos.yPercent) / 100;

    const cardW = Math.min(w * 0.92, 980) * pos.scale;
    const cardH = 210 * pos.scale;
    const cardX = cx - cardW / 2;
    const cardY = cy - cardH / 2;

    ctx.save();

    // Glassmorphism Card Backdrop
    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity})`;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 28 * pos.scale);
    ctx.fill();

    // Card Glass Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2 * pos.scale;
    ctx.stroke();

    // Ensure accurate elevation gain: if 0 or unpopulated, compute from GPS altitude trackpoints
    let eleGain = activity.elevationGainMeters;
    if ((eleGain === undefined || eleGain === 0) && activity.points && activity.points.length > 1) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length >= 2) {
        eleGain = computeRobustElevationGain(altitudes);
        activity.elevationGainMeters = eleGain;
      }
    }

    // Format metrics
    const distanceKm = (activity.distanceMeters / 1000).toFixed(2);
    const paceStr = formatPace(activity.avgPaceSecPerKm);
    const timeStr = formatDuration(activity.movingTimeSec);
    const eleStr = eleGain > 0 ? `+${eleGain}` : `${eleGain || 0}`;

    const cols = [
      { label: 'DISTANCE', val: distanceKm, unit: 'km', color: config.accentColor },
      { label: 'AVG PACE', val: paceStr, unit: '/km', color: '#ffffff' },
      { label: 'TIME', val: timeStr, unit: '', color: '#ffffff' },
      { label: 'ELEV GAIN', val: eleStr, unit: 'm', color: '#00f0ff' },
    ];

    const colW = cardW / cols.length;

    cols.forEach((col, i) => {
      const colX = cardX + colW * i + colW / 2;
      const topY = cardY + 52 * pos.scale;

      // Metric Label
      ctx.textAlign = 'center';
      ctx.font = `700 ${18 * pos.scale}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(col.label, colX, topY);

      // Hero Value
      ctx.font = `800 ${52 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = col.color;
      ctx.fillText(col.val, colX, topY + 68 * pos.scale);

      // Subscript Unit
      if (col.unit) {
        ctx.font = `600 ${20 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(col.unit, colX, topY + 104 * pos.scale);
      }

      // Vertical Separator
      if (i < cols.length - 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + colW * (i + 1), cardY + 30 * pos.scale);
        ctx.lineTo(cardX + colW * (i + 1), cardY + cardH - 30 * pos.scale);
        ctx.stroke();
      }
    });

    // Secondary Stats Pills (Heart rate, cadence, calories, altitude range) inside or below
    if (config.showSecondaryStats) {
      const secMetrics: string[] = [];
      if (activity.avgHeartRate) secMetrics.push(`❤️ ${activity.avgHeartRate} bpm`);
      if (activity.avgCadence) secMetrics.push(`⚡ ${activity.avgCadence} spm`);
      if (activity.calories) secMetrics.push(`🔥 ${activity.calories} kcal`);
      if (activity.avgPowerWatts) secMetrics.push(`⚡ ${activity.avgPowerWatts} W`);

      // Show true altitude above sea level range if GPS trackpoints have elevation
      if (activity.points && activity.points.length > 0) {
        let minEle = Infinity;
        let maxEle = -Infinity;
        for (const p of activity.points) {
          if (p.ele !== undefined) {
            if (p.ele < minEle) minEle = p.ele;
            if (p.ele > maxEle) maxEle = p.ele;
          }
        }
        if (minEle !== Infinity && maxEle !== -Infinity && maxEle > 0) {
          secMetrics.push(`⛰️ ${Math.round(minEle)}m – ${Math.round(maxEle)}m`);
        }
      }

      if (secMetrics.length > 0) {
        ctx.font = `600 ${18 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(secMetrics.join('   |   '), cx, cardY + cardH - 22 * pos.scale);
      }
    }

    ctx.restore();
  }

  private generateFallbackSplits(distanceMeters: number, avgPaceSec: number): SplitRecord[] {
    if (distanceMeters < 300 || avgPaceSec <= 0) return [];
    const numSplits = Math.max(1, Math.floor(distanceMeters / 1000));
    const splits: SplitRecord[] = [];
    const variancePattern = [1.02, 0.99, 0.98, 1.01, 0.97, 1.02, 0.99, 1.00, 0.97, 1.01, 0.98, 1.02];

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
    if (remainderM >= 100) {
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

  private drawHrZones(activity: WorkoutActivity, w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const pos = config.positions.hrZones;
    const cx = (w * pos.xPercent) / 100;
    const cy = (h * pos.yPercent) / 100;

    const zones = activity.hrZones || [];
    if (zones.length === 0) return;

    const cardW = Math.min(w * 0.92, 980) * pos.scale;
    const cardH = 132 * pos.scale;
    const startX = cx - cardW / 2;
    const startY = cy - cardH / 2;

    ctx.save();

    // 1. Glassmorphism Card Container
    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity * 0.92})`;
    this.roundRect(ctx, startX, startY, cardW, cardH, 20 * pos.scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5 * pos.scale;
    ctx.stroke();

    // 2. Header Row: Title on Left, Avg/Max BPM on Right
    const headerY = startY + 28 * pos.scale;
    ctx.textAlign = 'left';
    ctx.font = `800 ${14 * pos.scale}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText('HEART RATE ZONES (Z1 → Z5)', startX + 22 * pos.scale, headerY);

    if (activity.avgHeartRate) {
      ctx.textAlign = 'right';
      ctx.font = `700 ${14 * pos.scale}px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.accentColor;
      const hrSummary = `AVG: ${activity.avgHeartRate} BPM${activity.maxHeartRate ? `  •  MAX: ${activity.maxHeartRate} BPM` : ''}`;
      ctx.fillText(hrSummary, startX + cardW - 22 * pos.scale, headerY);
    }

    // 3. Multi-Segment Progress Bar
    const barX = startX + 22 * pos.scale;
    const barW = cardW - 44 * pos.scale;
    const barY = startY + 40 * pos.scale;
    const barH = 22 * pos.scale;

    // Background track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.roundRect(ctx, barX, barY, barW, barH, 11 * pos.scale);
    ctx.fill();

    // Vibrant Zone Palette: Z1 Sky Blue, Z2 Endurance Green, Z3 Tempo Gold, Z4 Threshold Orange, Z5 Max Red
    const zoneColors = ['#38bdf8', '#22c55e', '#eab308', '#f97316', '#ef4444'];
    let curX = barX;

    zones.forEach((z, i) => {
      const segW = Math.max(0, (z.percent / 100) * barW);
      if (segW <= 0) return;

      ctx.fillStyle = zoneColors[i % zoneColors.length];
      if (i === 0 && zones.every((_, idx) => idx === 0 || zones[idx].percent === 0)) {
        this.roundRect(ctx, curX, barY, segW, barH, 11 * pos.scale);
      } else if (i === 0) {
        this.roundRect(ctx, curX, barY, segW, barH, { tl: 11, bl: 11, tr: 0, br: 0 });
      } else if (i === zones.length - 1) {
        this.roundRect(ctx, curX, barY, segW, barH, { tl: 0, bl: 0, tr: 11, br: 11 });
      } else {
        ctx.fillRect(curX, barY, segW, barH);
      }
      ctx.fill();

      curX += segW;
    });

    // 4. Ultra-Legible Legend / Stats Row Below Bar
    const legendY = startY + 95 * pos.scale;
    const colW = barW / 5;

    zones.slice(0, 5).forEach((z, i) => {
      const lx = barX + colW * i + colW / 2;
      const color = zoneColors[i % zoneColors.length];

      // Dot + Zone Name
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lx - 26 * pos.scale, legendY - 5 * pos.scale, 5 * pos.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `800 ${14 * pos.scale}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Z${z.zone}`, lx - 6 * pos.scale, legendY);

      // Percentage
      ctx.font = `700 ${14 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = z.percent > 0 ? color : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${z.percent}%`, lx + 26 * pos.scale, legendY);

      // Format time (e.g. 18m)
      if (z.timeSec > 0) {
        const mins = Math.round(z.timeSec / 60);
        ctx.font = `600 ${11 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillText(`${mins}m`, lx, legendY + 18 * pos.scale);
      }
    });

    ctx.restore();
  }

  private drawSplits(activity: WorkoutActivity, w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const pos = config.positions.splits;
    const cx = (w * pos.xPercent) / 100;
    const cy = (h * pos.yPercent) / 100;

    let splits = activity.splits || [];
    if (splits.length === 0 && activity.distanceMeters > 300 && activity.avgPaceSecPerKm > 0) {
      splits = this.generateFallbackSplits(activity.distanceMeters, activity.avgPaceSecPerKm);
      activity.splits = splits;
    }
    if (splits.length === 0) return;

    // Show ALL splits for the entire workout (no artificial slice cutoff)
    const displaySplits = splits;
    const N = displaySplits.length;

    // Determine fastest split for highlight
    let fastestIdx = 0;
    let minPace = Infinity;
    displaySplits.forEach((sp, idx) => {
      if (sp.paceSecPerKm > 0 && sp.paceSecPerKm < minPace) {
        minPace = sp.paceSecPerKm;
        fastestIdx = idx;
      }
    });

    // Dynamic grid columns based on total splits count
    let cols = 5;
    if (N <= 4) cols = N;
    else if (N === 5) cols = 5;
    else if (N <= 8) cols = 4;
    else if (N <= 12) cols = 6;
    else if (N <= 18) cols = 6;
    else if (N <= 24) cols = 6;
    else cols = 7;

    const rows = Math.ceil(N / cols);
    const cardW = Math.min(w * 0.94, 980) * pos.scale;

    // Compute pill height & card height dynamically to fit all workout rows
    let pillH = 68 * pos.scale;
    if (rows === 2) pillH = 50 * pos.scale;
    else if (rows === 3) pillH = 42 * pos.scale;
    else if (rows >= 4) pillH = 36 * pos.scale;

    const rowGap = 6 * pos.scale;
    const colGap = 6 * pos.scale;
    const headerH = 34 * pos.scale;
    const padY = 16 * pos.scale;
    const padX = 16 * pos.scale;
    const cardH = headerH + rows * pillH + (rows - 1) * rowGap + padY * 2;

    const startX = cx - cardW / 2;
    const startY = cy - cardH / 2;

    ctx.save();

    // 1. Glassmorphism Card Container
    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity * 0.92})`;
    this.roundRect(ctx, startX, startY, cardW, cardH, 20 * pos.scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5 * pos.scale;
    ctx.stroke();

    // 2. Header Row: Title & Fastest Split
    const titleY = startY + 26 * pos.scale;
    ctx.textAlign = 'left';
    ctx.font = `800 ${14 * pos.scale}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText(`KILOMETER SPLITS (${N} TOTAL)`, startX + padX, titleY);

    if (minPace < Infinity) {
      ctx.textAlign = 'right';
      ctx.font = `700 ${13 * pos.scale}px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.accentColor;
      ctx.fillText(`⚡ FASTEST: KM ${displaySplits[fastestIdx].splitIndex} (${formatPace(minPace)}/km)`, startX + cardW - padX, titleY);
    }

    // 3. Grid of Split Badges covering the ENTIRE workout
    const gridY = startY + headerH + padY;
    const gridW = cardW - padX * 2;
    const pillW = (gridW - (cols - 1) * colGap) / cols;

    displaySplits.forEach((sp, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = startX + padX + col * (pillW + colGap);
      const py = gridY + row * (pillH + rowGap);
      const isFastest = i === fastestIdx && N > 1;

      // Pill Background
      if (isFastest) {
        ctx.fillStyle = 'rgba(200, 255, 0, 0.14)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      }
      this.roundRect(ctx, px, py, pillW, pillH, 10 * pos.scale);
      ctx.fill();

      // Border
      ctx.strokeStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = isFastest ? 1.5 * pos.scale : 1 * pos.scale;
      ctx.stroke();

      // Render content based on available pill height
      if (pillH >= 60 * pos.scale) {
        // Large pill (1 row)
        ctx.textAlign = 'center';
        ctx.font = `800 ${13 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`KM ${sp.splitIndex}`, px + pillW / 2, py + 22 * pos.scale);

        ctx.font = `800 ${22 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isFastest ? '#ffffff' : config.accentColor;
        ctx.fillText(formatPace(sp.paceSecPerKm), px + pillW / 2, py + 48 * pos.scale);

        ctx.font = `600 ${11 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText('/km', px + pillW / 2, py + 62 * pos.scale);
      } else if (pillH >= 44 * pos.scale) {
        // Medium pill (2-3 rows)
        ctx.textAlign = 'center';
        ctx.font = `800 ${11 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.55)';
        ctx.fillText(`KM ${sp.splitIndex}`, px + pillW / 2, py + 18 * pos.scale);

        ctx.font = `800 ${17 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isFastest ? '#ffffff' : config.accentColor;
        ctx.fillText(formatPace(sp.paceSecPerKm), px + pillW / 2, py + 38 * pos.scale);
      } else {
        // Compact pill (4+ rows for 21k/42k runs)
        ctx.textAlign = 'left';
        ctx.font = `800 ${12 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`K${sp.splitIndex}`, px + 8 * pos.scale, py + pillH / 2 + 4 * pos.scale);

        ctx.textAlign = 'right';
        ctx.font = `800 ${14 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isFastest ? '#ffffff' : config.accentColor;
        ctx.fillText(formatPace(sp.paceSecPerKm), px + pillW - 8 * pos.scale, py + pillH / 2 + 5 * pos.scale);
      }
    });

    ctx.restore();
  }

  private drawWatermark(w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h - 30);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number | { tl: number; tr: number; br: number; bl: number }
  ) {
    let r = typeof radius === 'number' ? { tl: radius, tr: radius, br: radius, bl: radius } : radius;
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
  }
}
