/**
 * RunCraft Canvas Rendering Engine
 * High-performance 2D Canvas studio for workout photo overlays
 * Supports 6 distinct layout templates
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

class SeededRandom {
  private s: number;
  constructor(seed: number) {
    this.s = Math.abs(seed) % 2147483647 || 12345;
  }
  next(): number {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  pick<T>(arr: readonly T[] | T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  bool(chance = 0.5): boolean {
    return this.next() < chance;
  }
}

export class CanvasEngine {
  public lastGenerativeArchetype: string = 'Editorial Magazine';
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

    const layout = config.layoutId || 'classic';

    switch (layout) {
      case 'cinematic':
        this.renderCinematic(activity, config, dim.width, dim.height);
        break;
      case 'swiss-grid':
        this.renderSwissGrid(activity, config, dim.width, dim.height);
        break;
      case 'neon-cyber':
        this.renderNeonCyber(activity, config, dim.width, dim.height);
        break;
      case 'split-story':
        this.renderSplitStory(activity, config, dim.width, dim.height);
        break;
      case 'polaroid':
        this.renderPolaroid(activity, config, dim.width, dim.height);
        break;
      case 'generative':
        this.renderGenerative(activity, config, dim.width, dim.height);
        break;
      case 'classic':
      default:
        this.renderClassic(activity, config, dim.width, dim.height);
        break;
    }
  }

  // ============================================================
  // LAYOUT 1: CLASSIC (original design)
  // ============================================================
  private renderClassic(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    // 1. Draw Background Photo (or gradient fallback)
    this.drawBackground(w, h, config);
    // 2. Vignette and Atmosphere
    this.drawAtmosphere(w, h, config);
    // 3. GPS Route Polyline
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      this.drawRoutePolyline(activity.points, w, h, config);
    }
    // 4. Header / Activity Title Card
    if (config.showTitleHeader) {
      this.drawHeader(activity, w, h, config);
    }
    // 5. Hero Metrics Card
    if (config.showHeroStats) {
      this.drawHeroStats(activity, w, h, config);
    }
    // 6. Heart Rate Zones Bar
    if (config.showHrZones && activity.hrZones && activity.hrZones.length > 0) {
      this.drawHrZones(activity, w, h, config);
    }
    // 7. Splits Pill Bar
    if (config.showSplits && activity.splits && activity.splits.length > 0) {
      this.drawSplits(activity, w, h, config);
    }
    // 8. Watermark / Branding
    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
    }
  }

  // ============================================================
  // LAYOUT 2: CINEMATIC
  // Full-bleed photo, huge centered hero stat, minimal bottom pill
  // ============================================================
  private renderCinematic(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    this.drawBackground(w, h, config);

    // Heavy cinematic dark letterbox at bottom
    const btmGrad = this.ctx.createLinearGradient(0, h * 0.45, 0, h);
    btmGrad.addColorStop(0, 'rgba(0,0,0,0)');
    btmGrad.addColorStop(0.4, 'rgba(0,0,0,0.55)');
    btmGrad.addColorStop(1, 'rgba(0,0,0,0.92)');
    this.ctx.fillStyle = btmGrad;
    this.ctx.fillRect(0, h * 0.45, w, h * 0.55);

    // Dark top scrim for title
    const topGrad = this.ctx.createLinearGradient(0, 0, 0, h * 0.28);
    topGrad.addColorStop(0, 'rgba(0,0,0,0.75)');
    topGrad.addColorStop(1, 'rgba(0,0,0,0)');
    this.ctx.fillStyle = topGrad;
    this.ctx.fillRect(0, 0, w, h * 0.28);

    // Route polyline: bottom-right quadrant
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 75, yPercent: 72, scale: 0.62 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    const ctx = this.ctx;
    ctx.save();

    // Activity type pill - top left
    const sportLabel = `${activity.sportType.toUpperCase()} • ${activity.date}`;
    ctx.font = `700 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.accentColor;
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 12;
    ctx.fillText(sportLabel, w * 0.06, h * 0.065);

    // Giant activity title
    ctx.font = `900 ${Math.round(w * 0.068)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.95)';
    ctx.shadowBlur = 24;
    ctx.fillText(activity.title, w * 0.06, h * 0.115);

    // Location subtitle
    if (activity.locationCity) {
      ctx.font = `500 ${Math.round(w * 0.028)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.shadowBlur = 10;
      ctx.fillText(activity.locationCity, w * 0.06, h * 0.148);
    }

    // BIG central distance hero
    const distKm = (activity.distanceMeters / 1000).toFixed(2);
    const bigFontSize = Math.round(w * 0.22);
    ctx.font = `900 ${bigFontSize}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = config.accentColor;
    ctx.textAlign = 'left';
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 40;
    ctx.globalAlpha = 0.15;
    ctx.fillText(distKm, w * 0.03, h * 0.62);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Distance label
    ctx.font = `800 ${Math.round(w * 0.028)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.textAlign = 'left';
    ctx.fillText('DISTANCE', w * 0.06, h * 0.58);

    ctx.font = `900 ${Math.round(w * 0.17)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 30;
    ctx.fillText(distKm, w * 0.06, h * 0.72);

    ctx.font = `700 ${Math.round(w * 0.038)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.accentColor;
    ctx.shadowBlur = 0;
    ctx.fillText('KM', w * 0.06, h * 0.755);

    // Ensure accurate elevation gain
    let eleGain = activity.elevationGainMeters;
    if ((eleGain === undefined || eleGain === 0) && activity.points && activity.points.length > 1) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length >= 2) {
        eleGain = computeRobustElevationGain(altitudes);
        activity.elevationGainMeters = eleGain;
      }
    }

    // Bottom metric pill strip
    const metricsToShow: Array<{ label: string; val: string; unit: string }> = [];
    if (config.metrics?.pace !== false) {
      metricsToShow.push({ label: 'PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/km' });
    }
    if (config.metrics?.time !== false) {
      metricsToShow.push({ label: 'TIME', val: formatDuration(activity.movingTimeSec), unit: '' });
    }
    if (config.metrics?.elevation !== false && eleGain > 0) {
      metricsToShow.push({ label: 'ELEV', val: `+${Math.round(eleGain)}`, unit: 'm' });
    }
    if (config.metrics?.heartRate !== false && activity.avgHeartRate) {
      metricsToShow.push({ label: 'AVG HR', val: `${activity.avgHeartRate}`, unit: 'bpm' });
    }
    if (config.metrics?.cadence && activity.avgCadence) {
      metricsToShow.push({ label: 'CADENCE', val: `${activity.avgCadence}`, unit: 'spm' });
    }

    if (metricsToShow.length > 0) {
      const minDim = Math.min(w, h);
      const pillW = w * 0.88;
      const pillH = Math.max(Math.round(h * 0.088), Math.round(minDim * 0.09));
      const pillX = w * 0.06;
      const pillY = h * 0.85;
      const colW = pillW / metricsToShow.length;

      // Dark glass container with subtle blur border and fill
      ctx.fillStyle = 'rgba(15, 20, 30, 0.55)';
      this.roundRect(ctx, pillX, pillY, pillW, pillH, 18);
      ctx.fill();

      // Glass border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle top edge specular highlight line
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, pillX, pillY, pillW, pillH, 18);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pillX, pillY + 1);
      ctx.lineTo(pillX + pillW, pillY + 1);
      ctx.stroke();
      ctx.restore();

      const labelFontSize = Math.max(11, Math.round(minDim * 0.016));
      // Base value size tuned so that numbers and units fit without crowding
      const baseValFontSize = Math.min(
        Math.round(minDim * 0.038),
        Math.round(colW * 0.17)
      );

      metricsToShow.forEach((m, i) => {
        const cx = pillX + colW * i + colW / 2;

        // Subtle vertical column divider
        if (i < metricsToShow.length - 1) {
          const divX = pillX + colW * (i + 1);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(divX, pillY + pillH * 0.22);
          ctx.lineTo(divX, pillY + pillH * 0.78);
          ctx.stroke();
        }

        // Metric label (e.g. PACE, TIME, ELEV, AVG HR)
        ctx.textAlign = 'center';
        ctx.font = `700 ${labelFontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 0;
        ctx.fillText(m.label, cx, pillY + pillH * 0.35);

        // Metric Value + Unit lockup:
        // Value: bold Plus Jakarta Sans; Unit: smaller mono font
        let curValSize = baseValFontSize;
        let curUnitSize = Math.max(10, Math.round(curValSize * 0.52));
        const unitText = m.unit ? ' ' + m.unit : '';

        // Measure with initial sizes
        ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
        let valW = ctx.measureText(m.val).width;

        ctx.font = `600 ${curUnitSize}px "JetBrains Mono", monospace`;
        let unitW = unitText ? ctx.measureText(unitText).width : 0;
        let totalW = valW + unitW;

        // Auto-scale down if content exceeds 82% of column width
        const maxAllowedW = colW * 0.82;
        if (totalW > maxAllowedW) {
          const scale = maxAllowedW / totalW;
          curValSize = Math.max(12, Math.floor(curValSize * scale));
          curUnitSize = Math.max(9, Math.floor(curUnitSize * scale));

          ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
          valW = ctx.measureText(m.val).width;

          ctx.font = `600 ${curUnitSize}px "JetBrains Mono", monospace`;
          unitW = unitText ? ctx.measureText(unitText).width : 0;
          totalW = valW + unitW;
        }

        // Center the combined value + unit block within the column
        const startX = cx - totalW / 2;
        const valY = pillY + pillH * 0.76;

        ctx.textAlign = 'left';
        ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 6;
        ctx.fillText(m.val, startX, valY);

        if (unitText) {
          ctx.font = `600 ${curUnitSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.shadowBlur = 0;
          ctx.fillText(unitText, startX + valW, valY);
        }
      });
    }

    // Watermark
    if (config.showWatermark) {
      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h * 0.982);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 3: SWISS GRID
  // Left column: huge bold distance. Right: data table.
  // ============================================================
  private renderSwissGrid(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;

    // Dark-toned background
    this.drawBackground(w, h, config);

    // Left-side semi-transparent panel
    const panelGrad = ctx.createLinearGradient(0, 0, w * 0.55, 0);
    panelGrad.addColorStop(0, 'rgba(8, 10, 18, 0.92)');
    panelGrad.addColorStop(0.8, 'rgba(8, 10, 18, 0.72)');
    panelGrad.addColorStop(1, 'rgba(8, 10, 18, 0)');
    ctx.fillStyle = panelGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    const margin = w * 0.06;
    const isWide = w > h; // 16:9 or 1:1

    if (isWide) {
      // Wide layout: left third stats, right two thirds photo
      const leftW = w * 0.38;

      // Accent bar on far left
      ctx.fillStyle = config.accentColor;
      ctx.fillRect(0, 0, 8, h);

      // Sport type label
      ctx.font = `700 ${Math.round(w * 0.013)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(activity.sportType.toUpperCase(), margin + 12, h * 0.08);

      // Date
      ctx.font = `400 ${Math.round(w * 0.013)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText(activity.date, margin + 12, h * 0.105);

      // Activity title
      ctx.font = `800 ${Math.round(w * 0.03)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(activity.title, margin + 12, h * 0.16);
      ctx.shadowBlur = 0;

      // Thick rule
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(margin + 12, h * 0.175, leftW - margin - 12, 2);

      // Big distance
      const distKm = (activity.distanceMeters / 1000).toFixed(2);
      ctx.font = `900 ${Math.round(w * 0.115)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(distKm, margin + 12, h * 0.34);

      ctx.font = `700 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('KILOMETERS', margin + 12, h * 0.375);

      // Metric grid
      const rows = [
        { label: 'PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/km' },
        { label: 'TIME', val: formatDuration(activity.movingTimeSec), unit: '' },
        { label: 'ELEV', val: `+${Math.round(activity.elevationGainMeters)}m`, unit: '' },
        { label: 'HEART RATE', val: activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : '—', unit: '' },
      ];

      rows.forEach((row, i) => {
        const rowY = h * 0.44 + i * h * 0.1;
        ctx.textAlign = 'left';
        ctx.font = `700 ${Math.round(w * 0.012)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.fillText(row.label, margin + 12, rowY);

        ctx.font = `800 ${Math.round(w * 0.028)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(row.val, margin + 12, rowY + h * 0.055);

        // divider
        if (i < rows.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.fillRect(margin + 12, rowY + h * 0.072, leftW - margin * 2, 1);
        }
      });

      // Route in the right portion
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          positions: {
            ...config.positions,
            routeMap: { xPercent: 68, yPercent: 50, scale: 0.9 },
          },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

    } else {
      // Portrait layout (9:16 / 4:5 / 1:1 tall)
      // Accent bar on left edge
      ctx.fillStyle = config.accentColor;
      ctx.fillRect(0, 0, 10, h);

      // Sport type + date
      ctx.font = `700 ${Math.round(w * 0.025)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(activity.sportType.toUpperCase() + '  •  ' + activity.date, margin + 16, h * 0.065);

      // Activity title
      ctx.font = `900 ${Math.round(w * 0.055)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 12;
      const titleLines = this.wrapText(ctx, activity.title, w * 0.78);
      titleLines.forEach((line, i) => {
        ctx.fillText(line, margin + 16, h * 0.108 + i * h * 0.065);
      });
      ctx.shadowBlur = 0;

      // Horizontal rule
      const ruleY = h * 0.18;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(margin + 16, ruleY, w * 0.85, 2);

      // Giant distance number
      const distKm = (activity.distanceMeters / 1000).toFixed(2);
      ctx.font = `900 ${Math.round(w * 0.24)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.accentColor;
      ctx.textAlign = 'left';
      ctx.fillText(distKm, margin, h * 0.37);

      ctx.font = `700 ${Math.round(w * 0.038)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('KILOMETERS', margin + 16, h * 0.395);

      // Route polyline: center
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          positions: {
            ...config.positions,
            routeMap: { xPercent: 50, yPercent: 52, scale: 0.85 },
          },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // Stats table
      const tableRows = [
        { label: 'AVG PACE', val: formatPace(activity.avgPaceSecPerKm) + '/km' },
        { label: 'MOVING TIME', val: formatDuration(activity.movingTimeSec) },
        { label: 'ELEV GAIN', val: `+${Math.round(activity.elevationGainMeters)} m` },
        { label: 'HEART RATE', val: activity.avgHeartRate ? `${activity.avgHeartRate} bpm` : '—' },
        { label: 'CADENCE', val: activity.avgCadence ? `${activity.avgCadence} spm` : '—' },
      ];

      const tableStartY = h * 0.69;
      const colWidth = (w - margin * 2 - 16) / 2;

      // Table header
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.textAlign = 'left';
      ctx.fillText('METRIC', margin + 16, tableStartY - h * 0.015);
      ctx.textAlign = 'right';
      ctx.fillText('VALUE', w - margin - 16, tableStartY - h * 0.015);

      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(margin + 16, tableStartY - h * 0.005, w - margin * 2 - 32, 1.5);

      tableRows.forEach((row, i) => {
        const rowY = tableStartY + i * h * 0.055;

        ctx.font = `600 ${Math.round(w * 0.026)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.52)';
        ctx.textAlign = 'left';
        ctx.fillText(row.label, margin + 16, rowY + h * 0.04);

        ctx.font = `800 ${Math.round(w * 0.03)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText(row.val, w - margin - 16, rowY + h * 0.04);

        if (i < tableRows.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(margin + 16, rowY + h * 0.05, w - margin * 2 - 32, 1);
        }
      });
    }

    if (config.showWatermark) {
      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h * 0.984);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 4: NEON CYBER
  // Dark mesh, amplified neon route glow, glowing stats pill
  // ============================================================
  private renderNeonCyber(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;

    // Draw photo with aggressive darkening
    this.drawBackground(w, h, { ...config, photoFilters: { ...config.photoFilters, brightness: config.photoFilters.brightness * 0.6 } });

    // Dark mesh overlay
    ctx.fillStyle = 'rgba(6, 8, 16, 0.55)';
    ctx.fillRect(0, 0, w, h);

    // Neon scan-line grid
    ctx.save();
    ctx.strokeStyle = `${config.accentColor}18`;
    ctx.lineWidth = 1;
    const gridStep = Math.round(w * 0.08);
    for (let x = 0; x < w; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();

    // Radial neon glow center
    const glow = ctx.createRadialGradient(w / 2, h * 0.42, 0, w / 2, h * 0.42, w * 0.55);
    glow.addColorStop(0, `${config.accentColor}22`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    // Route polyline: center
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        showGlow: true,
        glowIntensity: Math.min(1.0, (config.glowIntensity || 0.7) * 1.4),
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 42, scale: 0.9 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    // Top neon tag
    ctx.font = `700 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = config.accentColor;
    ctx.textAlign = 'center';
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 18;
    ctx.fillText(`/// ${activity.sportType.toUpperCase()} ///`, w / 2, h * 0.055);

    ctx.font = `500 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText(activity.date + (activity.startTime ? ' @ ' + activity.startTime : ''), w / 2, h * 0.08);

    // Title with neon glow
    ctx.font = `900 ${Math.round(w * 0.06)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 22;
    ctx.textAlign = 'center';
    const titleLines = this.wrapText(ctx, activity.title, w * 0.82);
    titleLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, w / 2, h * 0.13 + i * h * 0.065);
    });
    ctx.shadowBlur = 0;

    // Central neon stats panel
    const panelY = h * 0.72;
    const panelH = h * 0.22;
    const panelW = w * 0.92;
    const panelX = (w - panelW) / 2;

    // Glowing panel backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeStyle = config.accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 18;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner neon accent line
    ctx.fillStyle = config.accentColor;
    ctx.shadowColor = config.accentColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(panelX + 20, panelY + 1.5, panelW - 40, 2);
    ctx.shadowBlur = 0;

    // Metrics in panel
    const cyberMetrics = [
      { label: 'DIST', val: (activity.distanceMeters / 1000).toFixed(2), unit: 'KM' },
      { label: 'PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/KM' },
      { label: 'TIME', val: formatDuration(activity.movingTimeSec), unit: '' },
      { label: 'ELEV', val: `+${Math.round(activity.elevationGainMeters)}`, unit: 'M' },
    ];

    const colW = panelW / cyberMetrics.length;
    cyberMetrics.forEach((m, i) => {
      const cx = panelX + colW * i + colW / 2;

      ctx.font = `700 ${Math.round(w * 0.019)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText(m.label, cx, panelY + panelH * 0.28);

      let valFontSize = Math.min(Math.round(w * 0.052), Math.round(colW * 0.22));
      ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
      const valW = ctx.measureText(m.val).width;
      if (valW > colW * 0.84) {
        valFontSize = Math.max(12, Math.floor(valFontSize * ((colW * 0.84) / valW)));
        ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
      }
      ctx.fillStyle = config.accentColor;
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 12;
      ctx.fillText(m.val, cx, panelY + panelH * 0.68);

      if (m.unit) {
        ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.shadowBlur = 0;
        ctx.fillText(m.unit, cx, panelY + panelH * 0.88);
      }

      if (i < cyberMetrics.length - 1) {
        ctx.strokeStyle = `${config.accentColor}44`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(panelX + colW * (i + 1), panelY + panelH * 0.18);
        ctx.lineTo(panelX + colW * (i + 1), panelY + panelH * 0.82);
        ctx.stroke();
      }
    });

    // Secondary stats
    if (activity.avgHeartRate || activity.avgCadence || activity.calories) {
      const secParts: string[] = [];
      if (activity.avgHeartRate) secParts.push(`❤️  ${activity.avgHeartRate} BPM`);
      if (activity.avgCadence) secParts.push(`⚡ ${activity.avgCadence} SPM`);
      if (activity.calories) secParts.push(`🔥 ${activity.calories} KCAL`);

      ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      ctx.fillText(secParts.join('   '), w / 2, panelY + panelH + h * 0.024);
    }

    if (config.showWatermark) {
      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = `${config.accentColor}88`;
      ctx.textAlign = 'center';
      ctx.shadowColor = config.accentColor;
      ctx.shadowBlur = 6;
      ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h * 0.983);
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 5: SPLIT STORY (9:16 optimized)
  // Upper half: photo + route. Lower half: solid dark stats card.
  // ============================================================
  private renderSplitStory(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const splitY = h * 0.52; // where photo ends and stats begin

    // Draw photo in upper half only
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, splitY);
    ctx.clip();
    this.drawBackground(w, h * 0.8, config);
    ctx.restore();

    // Photo-side vignette
    const pgr = ctx.createLinearGradient(0, splitY * 0.5, 0, splitY);
    pgr.addColorStop(0, 'rgba(0,0,0,0)');
    pgr.addColorStop(1, 'rgba(8, 10, 20, 0.9)');
    ctx.fillStyle = pgr;
    ctx.fillRect(0, 0, w, splitY);

    // Dark stats panel (lower half)
    ctx.fillStyle = '#080a14';
    ctx.fillRect(0, splitY, w, h - splitY);

    // Accent stripe between halves
    ctx.fillStyle = config.accentColor;
    ctx.fillRect(0, splitY - 4, w, 4);

    // Route polyline in upper photo area
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 30, scale: 0.75 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    ctx.save();
    const margin = w * 0.06;

    // Title overlay on photo
    if (config.showTitleHeader) {
      ctx.font = `900 ${Math.round(w * 0.06)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.95)';
      ctx.shadowBlur = 20;
      const titleLines = this.wrapText(ctx, activity.title, w * 0.82);
      titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, margin, splitY - h * 0.185 + i * h * 0.07);
      });

      ctx.font = `600 ${Math.round(w * 0.025)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = config.accentColor;
      ctx.shadowBlur = 10;
      ctx.fillText(activity.sportType.toUpperCase() + ' • ' + activity.date, margin, splitY - h * 0.235);
      ctx.shadowBlur = 0;
    }

    // Stats panel content
    const statsTop = splitY + h * 0.03;

    // Primary hero stats - 2x2 grid
    const heroMetrics = [
      { label: 'DISTANCE', val: (activity.distanceMeters / 1000).toFixed(2), unit: 'km', color: config.accentColor },
      { label: 'AVG PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/km', color: '#ffffff' },
      { label: 'MOVING TIME', val: formatDuration(activity.movingTimeSec), unit: '', color: '#ffffff' },
      { label: 'ELEV GAIN', val: `+${Math.round(activity.elevationGainMeters)}`, unit: 'm', color: '#00f0ff' },
    ];

    const gridCols = 2;
    const gridRows = 2;
    const cellW = (w - margin * 2) / gridCols;
    const cellH = (h - splitY) * 0.37 / gridRows;

    heroMetrics.forEach((m, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const cx = margin + col * cellW + cellW / 2;
      const cy = statsTop + row * (cellH + h * 0.01) + cellH / 2;

      // Cell bg
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, margin + col * cellW, statsTop + row * (cellH + h * 0.01), cellW - 8, cellH, 12);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillText(m.label, cx - 4, cy - cellH * 0.18);

      ctx.font = `900 ${Math.round(w * 0.065)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = m.color;
      ctx.fillText(m.val, cx - 4, cy + cellH * 0.18);

      if (m.unit) {
        ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillText(m.unit, cx - 4, cy + cellH * 0.38);
      }
    });

    // Divider
    const dividerY = statsTop + gridRows * (cellH + h * 0.01) + h * 0.01;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(margin, dividerY, w - margin * 2, 1);

    // Secondary stats row
    const secParts: string[] = [];
    if (activity.avgHeartRate) secParts.push(`❤️ ${activity.avgHeartRate} bpm`);
    if (activity.avgCadence) secParts.push(`⚡ ${activity.avgCadence} spm`);
    if (activity.calories) secParts.push(`🔥 ${activity.calories} kcal`);

    if (secParts.length > 0) {
      ctx.font = `600 ${Math.round(w * 0.024)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.textAlign = 'center';
      ctx.fillText(secParts.join('   |   '), w / 2, dividerY + h * 0.035);
    }

    // HR zones bar
    if (config.showHrZones && activity.hrZones && activity.hrZones.length > 0) {
      const hrzY = dividerY + h * 0.06;
      const hrzW = w - margin * 2;
      const hrzH = h * 0.022;
      const zoneColors = ['#38bdf8', '#22c55e', '#eab308', '#f97316', '#ef4444'];
      let curX = margin;
      activity.hrZones.forEach((z, i) => {
        const segW = (z.percent / 100) * hrzW;
        if (segW <= 0) return;
        ctx.fillStyle = zoneColors[i % zoneColors.length];
        if (i === 0) this.roundRect(ctx, curX, hrzY, segW, hrzH, { tl: 8, bl: 8, tr: 0, br: 0 });
        else if (i === activity.hrZones.length - 1) this.roundRect(ctx, curX, hrzY, segW, hrzH, { tl: 0, bl: 0, tr: 8, br: 8 });
        else ctx.fillRect(curX, hrzY, segW, hrzH);
        ctx.fill();
        curX += segW;
      });

      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText('HEART RATE ZONES', margin, hrzY - h * 0.008);
    }

    // Location
    if (activity.locationCity) {
      ctx.font = `500 ${Math.round(w * 0.022)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'left';
      ctx.fillText(`📍 ${activity.locationCity}`, margin, h - h * 0.045);
    }

    if (config.showWatermark) {
      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'right';
      ctx.fillText(`⚡ ${config.watermarkText}`, w - margin, h - h * 0.045);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 6: POLAROID
  // White border frame, film grain aesthetic, handwritten-style text
  // ============================================================
  private renderPolaroid(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;

    // Off-white vintage paper background
    ctx.fillStyle = '#f0ece3';
    ctx.fillRect(0, 0, w, h);

    // Subtle paper texture grain
    ctx.save();
    for (let i = 0; i < 2400; i++) {
      const gx = Math.random() * w;
      const gy = Math.random() * h;
      const ga = Math.random() * 0.045;
      ctx.fillStyle = `rgba(0,0,0,${ga})`;
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
    ctx.restore();

    // Frame dimensions - polaroid style: equal margins on sides, bigger at bottom
    const frameL = w * 0.055;
    const frameR = w * 0.055;
    const frameT = w * 0.055;
    const frameB = h * 0.21; // big bottom caption area

    const photoX = frameL;
    const photoY = frameT;
    const photoW = w - frameL - frameR;
    const photoH = h - frameT - frameB;

    // Shadow under frame
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frameL - 4, frameT - 4, photoW + 8, photoH + frameB);
    ctx.restore();

    // White polaroid card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frameL - 4, frameT - 4, photoW + 8, photoH + frameB);

    // Photo inside the frame
    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();

    if (this.currentImage) {
      const img = this.currentImage;
      const imgRatio = img.width / img.height;
      const canvasRatio = photoW / photoH;
      let dw = photoW, dh = photoH, dx = photoX, dy = photoY;
      if (imgRatio > canvasRatio) {
        dh = photoH;
        dw = dh * imgRatio;
        dx = photoX - (dw - photoW) / 2;
      } else {
        dw = photoW;
        dh = dw / imgRatio;
        dy = photoY - (dh - photoH) / 2;
      }
      ctx.filter = `brightness(${config.photoFilters.brightness * 100}%) contrast(${config.photoFilters.contrast * 100}%) saturate(${config.photoFilters.saturation * 90}%) sepia(20%)`;
      ctx.drawImage(img, dx, dy, dw, dh);
    } else {
      const grad = ctx.createLinearGradient(photoX, photoY, photoX + photoW, photoY + photoH);
      grad.addColorStop(0, '#d4c5a0');
      grad.addColorStop(1, '#b8a880');
      ctx.fillStyle = grad;
      ctx.fillRect(photoX, photoY, photoW, photoH);
    }

    // Film vignette effect over photo
    const vig = ctx.createRadialGradient(
      photoX + photoW / 2, photoY + photoH / 2, photoH * 0.25,
      photoX + photoW / 2, photoY + photoH / 2, photoH * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.filter = 'none';
    ctx.fillStyle = vig;
    ctx.fillRect(photoX, photoY, photoW, photoH);

    ctx.restore();

    // Route overlay inside photo
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, photoW, photoH);
      ctx.clip();
      const routeConfig = {
        ...config,
        accentColor: config.accentColor === '#ffffff' ? '#ff4a36' : config.accentColor,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: (photoY + photoH * 0.42) / h * 100, scale: 0.7 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
      ctx.restore();
    }

    // Caption area (below photo, inside white frame)
    const captionY = photoY + photoH + h * 0.015;
    const captionCX = w / 2;
    const captionColor = '#2a2015';

    ctx.save();
    ctx.textAlign = 'center';

    // Activity title in a casual/rounded handwriting-like style
    ctx.font = `800 ${Math.round(w * 0.052)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = captionColor;
    const titleLines = this.wrapText(ctx, activity.title, photoW * 0.88);
    titleLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, captionCX, captionY + h * 0.042 + i * h * 0.05);
    });

    // Stat line
    const statLine = [
      (activity.distanceMeters / 1000).toFixed(1) + ' km',
      formatDuration(activity.movingTimeSec),
      formatPace(activity.avgPaceSecPerKm) + '/km',
    ].join('  ·  ');

    ctx.font = `600 ${Math.round(w * 0.028)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(42,32,21,0.62)';
    ctx.fillText(statLine, captionCX, captionY + h * 0.115);

    // Date / location
    const meta = [activity.date, activity.locationCity].filter(Boolean).join('  —  ');
    ctx.font = `500 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(42,32,21,0.42)';
    ctx.fillText(meta, captionCX, captionY + h * 0.152);

    // Accent color dot
    ctx.fillStyle = config.accentColor === '#ffffff' ? '#c8ff00' : config.accentColor;
    ctx.beginPath();
    ctx.arc(captionCX - w * 0.14, captionY + h * 0.152, 5, 0, Math.PI * 2);
    ctx.fill();

    if (config.showWatermark) {
      ctx.font = `400 ${Math.round(w * 0.016)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(42,32,21,0.25)';
      ctx.fillText(config.watermarkText, captionCX, captionY + h * 0.188);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 7: GENERATIVE / PROCEDURAL RANDOM LAYOUT
  // Generates unique, high-contrast layouts dynamically on the fly
  // ============================================================
  private renderGenerative(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const rng = new SeededRandom(config.generativeSeed || 12345);

    // Pick 1 of 6 procedural archetypes
    const archetypes = ['magazine', 'hud', 'stamp', 'brutalist', 'islands', 'minimal'] as const;
    const archetype = rng.pick(archetypes);

    const archetypeLabels: Record<string, string> = {
      magazine: 'Editorial Magazine',
      hud: 'Tactical Cyber HUD',
      stamp: 'Finisher Medal Badge',
      brutalist: 'Brutalist Street Poster',
      islands: 'Modular Glass Islands',
      minimal: 'Cinematic Ticker Tape',
    };
    this.lastGenerativeArchetype = archetypeLabels[archetype] || 'Procedural Layout';

    // Randomize accent color if user didn't explicitly pick one, or keep harmony
    const vibrantColors = ['#c8ff00', '#00f0ff', '#ff3366', '#ff7700', '#b55fe6', '#ffd700', '#00ff88'];
    const activeColor = rng.bool(0.3) ? rng.pick(vibrantColors) : config.accentColor;

    // Common activity formatted data
    const distKm = (activity.distanceMeters / 1000).toFixed(2);
    const paceStr = formatPace(activity.avgPaceSecPerKm);
    const timeStr = formatDuration(activity.movingTimeSec);

    let eleGain = activity.elevationGainMeters;
    if ((eleGain === undefined || eleGain === 0) && activity.points && activity.points.length > 1) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length >= 2) {
        eleGain = computeRobustElevationGain(altitudes);
        activity.elevationGainMeters = eleGain;
      }
    }
    const eleStr = eleGain > 0 ? `+${Math.round(eleGain)}` : '0';
    const hrStr = activity.avgHeartRate ? `${activity.avgHeartRate}` : '—';
    const subtitleText = activity.locationCity || `${activity.sportType.toUpperCase()} • ${activity.date}`;

    // GPS coordinate string
    let coordStr = '37.832°N  122.525°W';
    if (activity.points && activity.points.length > 0) {
      const p = activity.points[0];
      coordStr = `${Math.abs(p.lat).toFixed(3)}°${p.lat >= 0 ? 'N' : 'S'}  ${Math.abs(p.lon).toFixed(3)}°${p.lon >= 0 ? 'E' : 'W'}`;
    }

    const metricsList = [
      { label: 'PACE', val: paceStr, unit: '/km' },
      { label: 'TIME', val: timeStr, unit: '' },
      { label: 'ELEV', val: eleStr, unit: 'm' },
      { label: 'AVG HR', val: hrStr, unit: 'bpm' },
    ];

    // Helper: draw reusable glass dock with column dividers
    const drawGlassDock = (x: number, y: number, dockW: number, dockH: number) => {
      ctx.fillStyle = 'rgba(12, 16, 26, 0.65)';
      this.roundRect(ctx, x, y, dockW, dockH, 18);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const colW = dockW / metricsList.length;
      const minDim = Math.min(w, h);
      const labelFontSize = Math.max(11, Math.round(minDim * 0.015));
      const baseValFontSize = Math.min(Math.round(minDim * 0.036), Math.round(colW * 0.17));

      metricsList.forEach((m, i) => {
        const cx = x + colW * i + colW / 2;

        if (i < metricsList.length - 1) {
          const divX = x + colW * (i + 1);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(divX, y + dockH * 0.2);
          ctx.lineTo(divX, y + dockH * 0.8);
          ctx.stroke();
        }

        ctx.textAlign = 'center';
        ctx.font = `700 ${labelFontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillText(m.label, cx, y + dockH * 0.35);

        let curValSize = baseValFontSize;
        let curUnitSize = Math.max(10, Math.round(curValSize * 0.52));
        const unitText = m.unit ? ' ' + m.unit : '';

        ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
        let valW = ctx.measureText(m.val).width;
        ctx.font = `600 ${curUnitSize}px "JetBrains Mono", monospace`;
        let unitW = unitText ? ctx.measureText(unitText).width : 0;
        let totalW = valW + unitW;

        if (totalW > colW * 0.82) {
          const scale = (colW * 0.82) / totalW;
          curValSize = Math.max(12, Math.floor(curValSize * scale));
          curUnitSize = Math.max(9, Math.floor(curUnitSize * scale));
          ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
          valW = ctx.measureText(m.val).width;
        }

        const startX = cx - (valW + unitW) / 2;
        const valY = y + dockH * 0.76;

        ctx.textAlign = 'left';
        ctx.font = `800 ${curValSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(m.val, startX, valY);

        if (unitText) {
          ctx.font = `600 ${curUnitSize}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
          ctx.fillText(unitText, startX + valW, valY);
        }
      });
    };

    // Helper: draw crosshairs
    const drawCrosshair = (cx: number, cy: number, size = 12) => {
      ctx.save();
      ctx.strokeStyle = `${activeColor}88`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - size, cy);
      ctx.lineTo(cx + size, cy);
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx, cy + size);
      ctx.stroke();
      ctx.restore();
    };

    // ----------------------------------------------------
    // ARCHETYPE 1: EDITORIAL MAGAZINE
    // ----------------------------------------------------
    if (archetype === 'magazine') {
      this.drawBackground(w, h, config);

      // Deep atmospheric gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(10, 14, 24, 0.85)');
      grad.addColorStop(0.35, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(1, 'rgba(10, 14, 24, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      const margin = w * 0.06;

      // Top Publication Header
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.textAlign = 'left';
      ctx.fillText(`ATHLETIC JOURNAL • ISSUE #${Math.floor(rng.range(10, 99))}`, margin, h * 0.065);

      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText(coordStr, w - margin, h * 0.065);

      // Big Title
      ctx.font = `900 ${Math.round(w * 0.068)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 18;
      ctx.fillText(activity.title, margin, h * 0.125);
      ctx.shadowBlur = 0;

      // Subtitle (City / Gear / Shoe)
      ctx.font = `500 ${Math.round(w * 0.026)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(subtitleText, margin, h * 0.158);

      // Left Big Distance Hero
      ctx.font = `900 ${Math.round(w * 0.22)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 35;
      ctx.globalAlpha = 0.15;
      ctx.fillText(distKm, margin - 10, h * 0.58);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      ctx.font = `900 ${Math.round(w * 0.18)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 24;
      ctx.fillText(distKm, margin, h * 0.68);

      ctx.font = `700 ${Math.round(w * 0.034)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.shadowBlur = 0;
      ctx.fillText('KILOMETERS', margin, h * 0.72);

      // Right Side Route in Radar Ring
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          positions: { ...config.positions, routeMap: { xPercent: 74, yPercent: 44, scale: 0.65 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);

        // Circular fine-line radar ring
        ctx.strokeStyle = `${activeColor}44`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(w * 0.74, h * 0.44, w * 0.18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Bottom Glass Dock
      const dockH = Math.max(Math.round(h * 0.088), Math.round(w * 0.09));
      drawGlassDock(margin, h * 0.84, w - margin * 2, dockH);

      ctx.restore();
    }

    // ----------------------------------------------------
    // ARCHETYPE 2: TACTICAL CYBER HUD
    // ----------------------------------------------------
    else if (archetype === 'hud') {
      this.drawBackground(w, h, { ...config, photoFilters: { ...config.photoFilters, brightness: config.photoFilters.brightness * 0.65 } });

      // Dark tactical mesh
      ctx.fillStyle = 'rgba(5, 8, 16, 0.68)';
      ctx.fillRect(0, 0, w, h);

      // Radial glow center
      const glow = ctx.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, w * 0.6);
      glow.addColorStop(0, `${activeColor}24`);
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      const margin = w * 0.055;

      // 4 Corner Crosshairs
      drawCrosshair(margin, margin, 14);
      drawCrosshair(w - margin, margin, 14);
      drawCrosshair(margin, h - margin, 14);
      drawCrosshair(w - margin, h - margin, 14);

      // Top Telemetry Header
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.textAlign = 'center';
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 12;
      ctx.fillText(`[ TELEMETRY // ${activity.sportType.toUpperCase()} ]`, w / 2, h * 0.065);
      ctx.shadowBlur = 0;

      ctx.font = `500 ${Math.round(w * 0.016)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(`POS: ${coordStr}  •  ${activity.date}`, w / 2, h * 0.09);

      // Title
      ctx.font = `900 ${Math.round(w * 0.056)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 16;
      ctx.fillText(activity.title, w / 2, h * 0.145);
      ctx.shadowBlur = 0;

      if (activity.locationCity) {
        ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(activity.locationCity, w / 2, h * 0.175);
      }

      // Center Glowing Route Map
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          showGlow: true,
          glowIntensity: 1.0,
          positions: { ...config.positions, routeMap: { xPercent: 50, yPercent: 44, scale: 0.85 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // Tactical Distance Box in Center Lower
      const hudBoxW = w * 0.88;
      const hudBoxH = h * 0.13;
      const hudBoxX = (w - hudBoxW) / 2;
      const hudBoxY = h * 0.69;

      ctx.fillStyle = 'rgba(10, 15, 26, 0.82)';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 14;
      this.roundRect(ctx, hudBoxX, hudBoxY, hudBoxW, hudBoxH, 14);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inside Distance Box
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillText('TARGET DISTANCE', w / 2, hudBoxY + hudBoxH * 0.28);

      ctx.font = `900 ${Math.round(w * 0.088)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 18;
      ctx.fillText(`${distKm} KM`, w / 2, hudBoxY + hudBoxH * 0.84);
      ctx.shadowBlur = 0;

      // Bottom Row of 3 Tech Chips
      const subCols = [
        { label: 'PACE', val: paceStr + '/km' },
        { label: 'TIME', val: timeStr },
        { label: 'ELEV', val: eleStr + ' m' },
      ];
      const chipW = (hudBoxW - 16) / subCols.length;
      subCols.forEach((sc, i) => {
        const cx = hudBoxX + i * (chipW + 8);
        const cy = h * 0.84;
        const chH = h * 0.075;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1;
        this.roundRect(ctx, cx, cy, chipW, chH, 10);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.round(w * 0.016)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(sc.label, cx + chipW / 2, cy + chH * 0.36);

        ctx.font = `800 ${Math.round(w * 0.034)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(sc.val, cx + chipW / 2, cy + chH * 0.82);
      });

      ctx.restore();
    }

    // ----------------------------------------------------
    // ARCHETYPE 3: FINISHER MEDAL BADGE
    // ----------------------------------------------------
    else if (archetype === 'stamp') {
      this.drawBackground(w, h, config);

      // Vignette
      const vig = ctx.createRadialGradient(w / 2, h * 0.46, w * 0.15, w / 2, h * 0.46, w * 0.65);
      vig.addColorStop(0, 'rgba(0,0,0,0.2)');
      vig.addColorStop(1, 'rgba(6, 10, 18, 0.88)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.save();

      // Top Title Lockup
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText(`★ OFFICIAL FINISHER • ${activity.date} ★`, w / 2, h * 0.07);

      ctx.font = `900 ${Math.round(w * 0.062)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 18;
      ctx.fillText(activity.title, w / 2, h * 0.125);
      ctx.shadowBlur = 0;

      if (activity.locationCity) {
        ctx.font = `500 ${Math.round(w * 0.024)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(activity.locationCity, w / 2, h * 0.158);
      }

      // Center Circular Finisher Emblem Badge
      const badgeCX = w / 2;
      const badgeCY = h * 0.46;
      const badgeR = Math.min(w, h) * 0.22;

      // Dark translucent circular backdrop
      ctx.fillStyle = 'rgba(10, 14, 26, 0.82)';
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner dashed ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR - 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inside Medal: Distance & Sport
      ctx.font = `800 ${Math.round(w * 0.024)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText(activity.sportType.toUpperCase(), badgeCX, badgeCY - badgeR * 0.4);

      ctx.font = `900 ${Math.round(w * 0.14)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.fillText(distKm, badgeCX, badgeCY + badgeR * 0.12);
      ctx.shadowBlur = 0;

      ctx.font = `700 ${Math.round(w * 0.03)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('KILOMETERS', badgeCX, badgeCY + badgeR * 0.42);

      ctx.font = `600 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillText('✦ ✦ ✦', badgeCX, badgeCY + badgeR * 0.65);

      // Route polyline centered behind or above medal
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          positions: { ...config.positions, routeMap: { xPercent: 50, yPercent: 46, scale: 0.95 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // Bottom Glass Dock
      const dockH = Math.max(Math.round(h * 0.088), Math.round(w * 0.09));
      drawGlassDock(w * 0.06, h * 0.84, w * 0.88, dockH);

      ctx.restore();
    }

    // ----------------------------------------------------
    // ARCHETYPE 4: BRUTALIST STREET POSTER
    // ----------------------------------------------------
    else if (archetype === 'brutalist') {
      this.drawBackground(w, h, { ...config, photoFilters: { ...config.photoFilters, contrast: 1.25, saturation: 1.1 } });

      ctx.save();
      const margin = w * 0.06;

      // Giant Translucent Distance Watermark in background
      ctx.font = `900 ${Math.round(w * 0.32)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.08;
      ctx.textAlign = 'left';
      ctx.fillText(distKm, -10, h * 0.48);
      ctx.globalAlpha = 1;

      // Solid High-Energy Block for Title Tag
      const tagW = Math.min(w * 0.82, 540);
      const tagH = Math.round(h * 0.05);
      ctx.fillStyle = activeColor;
      ctx.fillRect(margin, h * 0.07, tagW, tagH);

      ctx.font = `800 ${Math.round(w * 0.024)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(`/// ${activity.sportType.toUpperCase()} • ${activity.date} ///`, margin + 14, h * 0.07 + tagH * 0.68);

      // Giant Title
      ctx.font = `900 ${Math.round(w * 0.07)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 24;
      ctx.fillText(activity.title, margin, h * 0.17);
      ctx.shadowBlur = 0;

      // Thick Rule
      ctx.fillStyle = activeColor;
      ctx.fillRect(margin, h * 0.19, w * 0.88, 4);

      // Huge Bold Inverted Distance Block
      const heroBlockW = w * 0.54;
      const heroBlockH = h * 0.14;
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, h * 0.22, heroBlockW, heroBlockH);
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(margin, h * 0.22, heroBlockW, heroBlockH);

      ctx.font = `900 ${Math.round(w * 0.092)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = activeColor;
      ctx.fillText(`${distKm}`, margin + 18, h * 0.22 + heroBlockH * 0.62);

      ctx.font = `700 ${Math.round(w * 0.026)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('KILOMETERS', margin + 18, h * 0.22 + heroBlockH * 0.88);

      // Route on Right Side
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          positions: { ...config.positions, routeMap: { xPercent: 74, yPercent: 48, scale: 0.8 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // City / Gear / Shoe Bar
      if (activity.locationCity) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(margin, h * 0.74, w * 0.88, h * 0.05);
        ctx.font = `700 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText(`📍 ${activity.locationCity}`, margin + 14, h * 0.74 + h * 0.034);
      }

      // Bottom Metrics Grid
      const dockH = Math.max(Math.round(h * 0.088), Math.round(w * 0.09));
      drawGlassDock(margin, h * 0.82, w - margin * 2, dockH);

      ctx.restore();
    }

    // ----------------------------------------------------
    // ARCHETYPE 5: MODULAR GLASS ISLANDS
    // ----------------------------------------------------
    else if (archetype === 'islands') {
      this.drawBackground(w, h, config);

      ctx.save();
      const margin = w * 0.06;

      // Island 1: Top-Left Title Card
      const card1W = w * 0.52;
      const card1H = h * 0.16;
      ctx.fillStyle = 'rgba(12, 16, 28, 0.68)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, margin, h * 0.06, card1W, card1H, 18);
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText(`${activity.sportType.toUpperCase()} • ${activity.date}`, margin + 18, h * 0.06 + card1H * 0.28);

      ctx.font = `900 ${Math.round(w * 0.046)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      const lines = this.wrapText(ctx, activity.title, card1W - 36);
      lines.slice(0, 2).forEach((l, idx) => {
        ctx.fillText(l, margin + 18, h * 0.06 + card1H * 0.62 + idx * h * 0.035);
      });

      // Island 2: Top-Right Route Mini-Map Card
      const card2W = w * 0.32;
      const card2H = h * 0.16;
      const card2X = w - margin - card2W;
      ctx.fillStyle = 'rgba(12, 16, 28, 0.68)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, card2X, h * 0.06, card2W, card2H, 18);
      ctx.fill();
      ctx.stroke();

      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          positions: { ...config.positions, routeMap: { xPercent: (card2X + card2W / 2) / w * 100, yPercent: (h * 0.06 + card2H / 2) / h * 100, scale: 0.55 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // Island 3: Giant Distance Hero Chip (Lower Left)
      const card3W = w * 0.88;
      const card3H = h * 0.14;
      ctx.fillStyle = 'rgba(12, 16, 28, 0.72)';
      ctx.strokeStyle = `${activeColor}66`;
      ctx.lineWidth = 2;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 18;
      this.roundRect(ctx, margin, h * 0.66, card3W, card3H, 20);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inside Distance Chip: Left Distance, Right City/Gear
      ctx.textAlign = 'left';
      ctx.font = `900 ${Math.round(w * 0.09)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${distKm} `, margin + 24, h * 0.66 + card3H * 0.68);

      const dValW = ctx.measureText(`${distKm} `).width;
      ctx.font = `700 ${Math.round(w * 0.032)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('KM', margin + 24 + dValW, h * 0.66 + card3H * 0.68);

      if (activity.locationCity) {
        ctx.textAlign = 'right';
        ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(activity.locationCity, w - margin - 24, h * 0.66 + card3H * 0.64);
      }

      // Island 4: Bottom 4-Column Metric Dock
      const dockH = Math.max(Math.round(h * 0.088), Math.round(w * 0.09));
      drawGlassDock(margin, h * 0.83, w * 0.88, dockH);

      ctx.restore();
    }

    // ----------------------------------------------------
    // ARCHETYPE 6: CINEMATIC TICKER TAPE
    // ----------------------------------------------------
    else {
      this.drawBackground(w, h, config);

      // Deep Top & Bottom Widescreen Letterbox Bars
      const topBarH = h * 0.14;
      const btmBarH = h * 0.16;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.94)';
      ctx.fillRect(0, 0, w, topBarH);
      ctx.fillRect(0, h - btmBarH, w, btmBarH);

      // Glowing Accent Border on Top and Bottom Bars
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 8;
      ctx.fillRect(0, topBarH - 2, w, 2);
      ctx.fillRect(0, h - btmBarH, w, 2);
      ctx.shadowBlur = 0;

      ctx.save();
      const margin = w * 0.06;

      // Top Bar Text
      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText(`${activity.sportType.toUpperCase()} • ${activity.date}`, margin, topBarH * 0.42);

      ctx.font = `900 ${Math.round(w * 0.046)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(activity.title, margin, topBarH * 0.82);

      if (activity.locationCity) {
        ctx.textAlign = 'right';
        ctx.font = `500 ${Math.round(w * 0.022)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(activity.locationCity, w - margin, topBarH * 0.62);
      }

      // Center Route Polyline
      if (config.showPolyline && activity.points && activity.points.length > 1) {
        const routeConfig = {
          ...config,
          accentColor: activeColor,
          positions: { ...config.positions, routeMap: { xPercent: 50, yPercent: 50, scale: 0.9 } },
        };
        this.drawRoutePolyline(activity.points, w, h, routeConfig);
      }

      // Bottom Bar Horizontal Single-Line Ticker
      const tickerY = h - btmBarH * 0.52;
      const tickerParts = [
        `${distKm} KM`,
        `${paceStr} /km`,
        `${timeStr}`,
        `${eleStr} m`,
        ...(activity.avgHeartRate ? [`${activity.avgHeartRate} bpm`] : []),
      ];

      ctx.textAlign = 'center';
      ctx.font = `800 ${Math.round(w * 0.038)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tickerParts.join('   •   '), w / 2, tickerY);

      // Watermark
      if (config.showWatermark) {
        ctx.font = `500 ${Math.round(w * 0.016)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h - btmBarH * 0.18);
      }

      ctx.restore();
    }

    // Common Watermark for non-ticker layouts
    if (archetype !== 'minimal' && config.showWatermark) {
      ctx.save();
      ctx.font = `600 ${Math.round(w * 0.018)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${config.watermarkText}`, w / 2, h * 0.982);
      ctx.restore();
    }
  }


  // ============================================================
  // SHARED PRIMITIVES (used by classic & other layouts)
  // ============================================================

  private drawBackground(w: number, h: number, config: OverlayConfig) {
    const ctx = this.ctx;
    const filters = config.photoFilters;

    if (this.currentImage) {
      ctx.save();
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

    // Preserve geographic aspect ratio
    const scaleX = mapW / lonSpanRaw;
    const scaleY = mapH / latSpanRaw;
    const fitScale = Math.min(scaleX, scaleY);

    const actualMapW = lonSpanRaw * fitScale;
    const actualMapH = latSpanRaw * fitScale;

    // Map coordinates to pixel space
    const project = (p: GeoPoint) => {
      const normX = ((p.lon - minLon) * Math.cos(midLatRad)) / lonSpanRaw;
      const normY = 1 - (p.lat - minLat) / latSpanRaw;
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

    // 1. Dark contrast underlay
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

    // 2. Luminous Ambient Glow
    if (config.showGlow) {
      const intensity = config.glowIntensity ?? 0.70;

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

    // 3. Crisp Fore-Route Polyline
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4.6 * pos.scale;

    if (config.routeColorMode === 'elevation' && maxEle > minEle) {
      for (let i = 0; i < points.length - 1; i++) {
        const pt1 = projected[i];
        const pt2 = projected[i + 1];
        const ele = points[i].ele !== undefined ? points[i].ele : minEle;
        const eleRatio = Math.max(0, Math.min(1, (ele! - minEle) / (maxEle - minEle)));

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

    ctx.fillStyle = `rgba(18, 24, 36, ${config.cardOpacity})`;
    this.roundRect(ctx, cx - pillW / 2, cy - pillH / 2, pillW, pillH, 24);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = config.accentColor;
    ctx.fillText(pillText, cx, cy + 8);

    ctx.font = `800 ${48 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 14;
    ctx.fillText(activity.title, cx, cy + 92 * pos.scale);

    const subParts: string[] = [];
    if (activity.locationCity) subParts.push(activity.locationCity);
    if (activity.weatherTempC !== undefined) subParts.push(`${activity.weatherTempC}°C ${activity.weatherCondition || ''}`);
    if (activity.gearName && !activity.locationCity?.includes(activity.gearName)) subParts.push(activity.gearName);

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
    const cardX = cx - cardW / 2;

    ctx.save();

    // Ensure accurate elevation gain
    let eleGain = activity.elevationGainMeters;
    if ((eleGain === undefined || eleGain === 0) && activity.points && activity.points.length > 1) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length >= 2) {
        eleGain = computeRobustElevationGain(altitudes);
        activity.elevationGainMeters = eleGain;
      }
    }

    const metricsConfig = config.metrics || {
      distance: true, time: true, pace: true, elevation: true,
      heartRate: true, cadence: true, calories: true, power: true,
    };

    const distanceKm = (activity.distanceMeters / 1000).toFixed(2);
    const paceStr = formatPace(activity.avgPaceSecPerKm);
    const timeStr = formatDuration(activity.movingTimeSec);
    const eleStr = eleGain > 0 ? `+${eleGain}` : `${eleGain || 0}`;

    const allHeroCols = [
      { key: 'distance', label: 'DISTANCE', val: distanceKm, unit: 'km', color: config.accentColor },
      { key: 'pace', label: 'AVG PACE', val: paceStr, unit: '/km', color: '#ffffff' },
      { key: 'time', label: 'TIME', val: timeStr, unit: '', color: '#ffffff' },
      { key: 'elevation', label: 'ELEV GAIN', val: eleStr, unit: 'm', color: '#00f0ff' },
    ];

    const cols = allHeroCols.filter((col) => metricsConfig[col.key as keyof typeof metricsConfig]);

    const secMetrics: string[] = [];
    if (config.showSecondaryStats) {
      if (metricsConfig.heartRate && activity.avgHeartRate) secMetrics.push(`❤️ ${activity.avgHeartRate} bpm`);
      if (metricsConfig.cadence && activity.avgCadence) secMetrics.push(`⚡ ${activity.avgCadence} spm`);
      if (metricsConfig.calories && activity.calories) secMetrics.push(`🔥 ${activity.calories} kcal`);
      if (metricsConfig.power && activity.avgPowerWatts) secMetrics.push(`⚡ ${activity.avgPowerWatts} W`);

      if (metricsConfig.elevation && activity.points && activity.points.length > 0) {
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
    }

    if (cols.length === 0 && secMetrics.length === 0) {
      ctx.restore();
      return;
    }

    const hasHero = cols.length > 0;
    const hasSec = secMetrics.length > 0;
    const cardH = (!hasHero && hasSec ? 90 : !hasSec && hasHero ? 184 : 224) * pos.scale;
    const cardY = cy - cardH / 2;

    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity})`;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 28 * pos.scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2 * pos.scale;
    ctx.stroke();

    if (hasHero) {
      const colW = cardW / cols.length;
      const heroFontSize = (cols.length <= 2 ? 60 : cols.length === 3 ? 54 : 48) * pos.scale;
      const topY = cardY + (hasSec ? 44 : 48) * pos.scale;

      cols.forEach((col, i) => {
        const colX = cardX + colW * i + colW / 2;

        ctx.textAlign = 'center';
        ctx.font = `700 ${17 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillText(col.label, colX, topY);

        let curHeroFontSize = heroFontSize;
        ctx.font = `800 ${curHeroFontSize}px "Plus Jakarta Sans", sans-serif`;
        const textW = ctx.measureText(col.val).width;
        if (textW > colW * 0.85) {
          curHeroFontSize = Math.max(24 * pos.scale, Math.floor(curHeroFontSize * ((colW * 0.85) / textW)));
          ctx.font = `800 ${curHeroFontSize}px "Plus Jakarta Sans", sans-serif`;
        }

        ctx.fillStyle = col.color;
        ctx.fillText(col.val, colX, topY + (hasSec ? 54 : 56) * pos.scale);

        if (col.unit) {
          ctx.font = `600 ${19 * pos.scale}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.fillText(col.unit, colX, topY + (hasSec ? 88 : 92) * pos.scale);
        }

        if (i < cols.length - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cardX + colW * (i + 1), cardY + 24 * pos.scale);
          ctx.lineTo(cardX + colW * (i + 1), cardY + (hasSec ? 146 : cardH - 24) * pos.scale);
          ctx.stroke();
        }
      });

      // Subtle horizontal divider between hero stats and secondary stats bar
      if (hasSec) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cardX + 24 * pos.scale, cardY + 158 * pos.scale);
        ctx.lineTo(cardX + cardW - 24 * pos.scale, cardY + 158 * pos.scale);
        ctx.stroke();
      }
    }

    if (hasSec) {
      const secY = hasHero ? cardY + cardH - 24 * pos.scale : cy + 6 * pos.scale;
      ctx.textAlign = 'center';
      ctx.font = `600 ${18 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillText(secMetrics.join('   |   '), cx, secY);
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

    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity * 0.92})`;
    this.roundRect(ctx, startX, startY, cardW, cardH, 20 * pos.scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5 * pos.scale;
    ctx.stroke();

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

    const barX = startX + 22 * pos.scale;
    const barW = cardW - 44 * pos.scale;
    const barY = startY + 40 * pos.scale;
    const barH = 22 * pos.scale;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.roundRect(ctx, barX, barY, barW, barH, 11 * pos.scale);
    ctx.fill();

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

    const legendY = startY + 95 * pos.scale;
    const colW = barW / 5;

    zones.slice(0, 5).forEach((z, i) => {
      const lx = barX + colW * i + colW / 2;
      const color = zoneColors[i % zoneColors.length];

      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(lx - 26 * pos.scale, legendY - 5 * pos.scale, 5 * pos.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `800 ${14 * pos.scale}px "JetBrains Mono", monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Z${z.zone}`, lx - 6 * pos.scale, legendY);

      ctx.font = `700 ${14 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = z.percent > 0 ? color : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(`${z.percent}%`, lx + 26 * pos.scale, legendY);

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

    const displaySplits = splits;
    const N = displaySplits.length;

    let fastestIdx = 0;
    let minPace = Infinity;
    displaySplits.forEach((sp, idx) => {
      if (sp.paceSecPerKm > 0 && sp.paceSecPerKm < minPace) {
        minPace = sp.paceSecPerKm;
        fastestIdx = idx;
      }
    });

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

    ctx.fillStyle = `rgba(15, 23, 42, ${config.cardOpacity * 0.92})`;
    this.roundRect(ctx, startX, startY, cardW, cardH, 20 * pos.scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 1.5 * pos.scale;
    ctx.stroke();

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

    const gridY = startY + headerH + padY;
    const gridW = cardW - padX * 2;
    const pillW = (gridW - (cols - 1) * colGap) / cols;

    displaySplits.forEach((sp, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = startX + padX + col * (pillW + colGap);
      const py = gridY + row * (pillH + rowGap);
      const isFastest = i === fastestIdx && N > 1;

      if (isFastest) {
        ctx.fillStyle = 'rgba(200, 255, 0, 0.14)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      }
      this.roundRect(ctx, px, py, pillW, pillH, 10 * pos.scale);
      ctx.fill();

      ctx.strokeStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = isFastest ? 1.5 * pos.scale : 1 * pos.scale;
      ctx.stroke();

      if (pillH >= 60 * pos.scale) {
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
        ctx.textAlign = 'center';
        ctx.font = `800 ${11 * pos.scale}px "JetBrains Mono", monospace`;
        ctx.fillStyle = isFastest ? config.accentColor : 'rgba(255, 255, 255, 0.55)';
        ctx.fillText(`KM ${sp.splitIndex}`, px + pillW / 2, py + 18 * pos.scale);

        ctx.font = `800 ${17 * pos.scale}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = isFastest ? '#ffffff' : config.accentColor;
        ctx.fillText(formatPace(sp.paceSecPerKm), px + pillW / 2, py + 38 * pos.scale);
      } else {
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

  /** Utility: wrap text to fit within maxWidth, returns array of lines */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + ' ' + words[i];
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
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
