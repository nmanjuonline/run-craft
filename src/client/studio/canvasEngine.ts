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
    this.imageZoom = Math.max(0.5, Math.min(4.0, zoom));
  }

  getImageTransform() {
    return {
      offset: { ...this.imageOffset },
      zoom: this.imageZoom,
    };
  }

  resetImageTransform() {
    this.imageOffset = { x: 0, y: 0 };
    this.imageZoom = 1.0;
  }

  hasImage(): boolean {
    return this.currentImage !== null;
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
      case 'editorial-heritage':
        this.renderEditorialHeritage(activity, config, dim.width, dim.height);
        break;
      case 'summit-topo':
        this.renderSummitTopo(activity, config, dim.width, dim.height);
        break;
      case 'nordic-minimal':
        this.renderNordicMinimal(activity, config, dim.width, dim.height);
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
    // 5. Hero & Secondary Metrics Card
    if (config.showHeroStats !== false || config.showSecondaryStats !== false) {
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

    if (!config.transparentBackground) {
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
    }

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

    const metricsConfig = config.metrics || {
      distance: true, time: true, pace: true, elevation: true,
      heartRate: true, cadence: true, calories: true, power: true,
    };
    const showHero = config.showHeroStats !== false && metricsConfig.distance !== false;

    if (showHero) {
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
    }

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
    const showSecondary = config.showSecondaryStats !== false;
    const metricsToShow: Array<{ label: string; val: string; unit: string }> = [];
    if (showSecondary) {
      if (!showHero && metricsConfig.distance !== false && activity.distanceMeters > 0) {
        metricsToShow.push({ label: 'DIST', val: (activity.distanceMeters / 1000).toFixed(2), unit: 'km' });
      }
      if (metricsConfig.pace !== false) {
        metricsToShow.push({ label: 'PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/km' });
      }
      if (metricsConfig.time !== false) {
        metricsToShow.push({ label: 'TIME', val: formatDuration(activity.movingTimeSec), unit: '' });
      }
      if (metricsConfig.elevation !== false && eleGain > 0) {
        metricsToShow.push({ label: 'ELEV', val: `+${Math.round(eleGain)}`, unit: 'm' });
      }
      if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
        metricsToShow.push({ label: 'AVG HR', val: `${activity.avgHeartRate}`, unit: 'bpm' });
      }
      if (metricsConfig.cadence && activity.avgCadence) {
        metricsToShow.push({ label: 'CADENCE', val: `${activity.avgCadence}`, unit: 'spm' });
      }
      if (metricsConfig.calories && activity.calories) {
        metricsToShow.push({ label: 'CALORIES', val: `${activity.calories}`, unit: 'kcal' });
      }
      if (metricsConfig.power && activity.avgPowerWatts) {
        metricsToShow.push({ label: 'POWER', val: `${activity.avgPowerWatts}`, unit: 'W' });
      }
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
      this.drawWatermark(w, h, config);
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

    if (!config.transparentBackground) {
      // Left-side semi-transparent panel
      const panelGrad = ctx.createLinearGradient(0, 0, w * 0.55, 0);
      panelGrad.addColorStop(0, 'rgba(8, 10, 18, 0.92)');
      panelGrad.addColorStop(0.8, 'rgba(8, 10, 18, 0.72)');
      panelGrad.addColorStop(1, 'rgba(8, 10, 18, 0)');
      ctx.fillStyle = panelGrad;
      ctx.fillRect(0, 0, w, h);
    }

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

      const metricsConfig = config.metrics || {
        distance: true, time: true, pace: true, elevation: true,
        heartRate: true, cadence: true, calories: true, power: true,
      };
      const showHero = config.showHeroStats !== false && metricsConfig.distance !== false;
      const showSecondary = config.showSecondaryStats !== false;

      // Big distance
      if (showHero) {
        const distKm = (activity.distanceMeters / 1000).toFixed(2);
        ctx.font = `900 ${Math.round(w * 0.115)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = config.accentColor;
        ctx.textAlign = 'left';
        ctx.fillText(distKm, margin + 12, h * 0.34);

        ctx.font = `700 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText('KILOMETERS', margin + 12, h * 0.375);
      }

      // Metric grid
      const rows: Array<{ label: string; val: string }> = [];
      if (showSecondary) {
        if (!showHero && metricsConfig.distance !== false && activity.distanceMeters > 0) {
          rows.push({ label: 'DISTANCE', val: `${(activity.distanceMeters / 1000).toFixed(2)} km` });
        }
        if (metricsConfig.pace !== false) {
          rows.push({ label: 'PACE', val: `${formatPace(activity.avgPaceSecPerKm)}/km` });
        }
        if (metricsConfig.time !== false) {
          rows.push({ label: 'TIME', val: formatDuration(activity.movingTimeSec) });
        }
        if (metricsConfig.elevation !== false && activity.elevationGainMeters > 0) {
          rows.push({ label: 'ELEV', val: `+${Math.round(activity.elevationGainMeters)}m` });
        }
        if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
          rows.push({ label: 'HEART RATE', val: `${activity.avgHeartRate} bpm` });
        }
        if (metricsConfig.cadence && activity.avgCadence) {
          rows.push({ label: 'CADENCE', val: `${activity.avgCadence} spm` });
        }
        if (metricsConfig.calories && activity.calories) {
          rows.push({ label: 'CALORIES', val: `${activity.calories} kcal` });
        }
        if (metricsConfig.power && activity.avgPowerWatts) {
          rows.push({ label: 'POWER', val: `${activity.avgPowerWatts} W` });
        }
      }

      const startGridY = showHero ? h * 0.44 : h * 0.22;
      const rowStep = Math.min(h * 0.09, (h * 0.50) / Math.max(rows.length, 1));

      rows.forEach((row, i) => {
        const rowY = startGridY + i * rowStep;
        ctx.textAlign = 'left';
        ctx.font = `700 ${Math.round(w * 0.012)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.42)';
        ctx.fillText(row.label, margin + 12, rowY);

        ctx.font = `800 ${Math.round(w * 0.026)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(row.val, margin + 12, rowY + rowStep * 0.5);

        // divider
        if (i < rows.length - 1) {
          ctx.fillStyle = 'rgba(255,255,255,0.09)';
          ctx.fillRect(margin + 12, rowY + rowStep * 0.72, leftW - margin * 2, 1);
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

      const metricsConfig = config.metrics || {
        distance: true, time: true, pace: true, elevation: true,
        heartRate: true, cadence: true, calories: true, power: true,
      };
      const showHero = config.showHeroStats !== false && metricsConfig.distance !== false;
      const showSecondary = config.showSecondaryStats !== false;

      // Giant distance number
      if (showHero) {
        const distKm = (activity.distanceMeters / 1000).toFixed(2);
        ctx.font = `900 ${Math.round(w * 0.24)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = config.accentColor;
        ctx.textAlign = 'left';
        ctx.fillText(distKm, margin, h * 0.37);

        ctx.font = `700 ${Math.round(w * 0.038)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('KILOMETERS', margin + 16, h * 0.395);
      }

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
      const tableRows: Array<{ label: string; val: string }> = [];
      if (showSecondary) {
        if (!showHero && metricsConfig.distance !== false && activity.distanceMeters > 0) {
          tableRows.push({ label: 'DISTANCE', val: `${(activity.distanceMeters / 1000).toFixed(2)} km` });
        }
        if (metricsConfig.pace !== false) {
          tableRows.push({ label: 'AVG PACE', val: formatPace(activity.avgPaceSecPerKm) + '/km' });
        }
        if (metricsConfig.time !== false) {
          tableRows.push({ label: 'MOVING TIME', val: formatDuration(activity.movingTimeSec) });
        }
        if (metricsConfig.elevation !== false && activity.elevationGainMeters > 0) {
          tableRows.push({ label: 'ELEV GAIN', val: `+${Math.round(activity.elevationGainMeters)} m` });
        }
        if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
          tableRows.push({ label: 'HEART RATE', val: `${activity.avgHeartRate} bpm` });
        }
        if (metricsConfig.cadence && activity.avgCadence) {
          tableRows.push({ label: 'CADENCE', val: `${activity.avgCadence} spm` });
        }
        if (metricsConfig.calories && activity.calories) {
          tableRows.push({ label: 'CALORIES', val: `${activity.calories} kcal` });
        }
        if (metricsConfig.power && activity.avgPowerWatts) {
          tableRows.push({ label: 'POWER', val: `${activity.avgPowerWatts} W` });
        }
      }

      if (tableRows.length > 0) {
        const tableStartY = showHero ? h * 0.69 : h * 0.52;
        const maxDisplay = Math.min(tableRows.length, 6);
        const rowStep = Math.min(h * 0.052, (h * 0.28) / maxDisplay);

        // Table header
        ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.textAlign = 'left';
        ctx.fillText('METRIC', margin + 16, tableStartY - h * 0.015);
        ctx.textAlign = 'right';
        ctx.fillText('VALUE', w - margin - 16, tableStartY - h * 0.015);

        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(margin + 16, tableStartY - h * 0.005, w - margin * 2 - 32, 1.5);

        tableRows.slice(0, 6).forEach((row, i) => {
          const rowY = tableStartY + i * rowStep;

          ctx.font = `600 ${Math.round(w * 0.024)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255,255,255,0.52)';
          ctx.textAlign = 'left';
          ctx.fillText(row.label, margin + 16, rowY + rowStep * 0.65);

          ctx.font = `800 ${Math.round(w * 0.028)}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'right';
          ctx.fillText(row.val, w - margin - 16, rowY + rowStep * 0.65);

          if (i < maxDisplay - 1) {
            ctx.fillStyle = 'rgba(255,255,255,0.07)';
            ctx.fillRect(margin + 16, rowY + rowStep * 0.85, w - margin * 2 - 32, 1);
          }
        });
      }
    }

    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
    }

    ctx.restore();
  }

  /** Helper: draw chamfered (cut-corner) cyber polygon */
  private drawChamferCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    chamfer = 14
  ) {
    ctx.beginPath();
    ctx.moveTo(x + chamfer, y);
    ctx.lineTo(x + w - chamfer, y);
    ctx.lineTo(x + w, y + chamfer);
    ctx.lineTo(x + w, y + h - chamfer);
    ctx.lineTo(x + w - chamfer, y + h);
    ctx.lineTo(x + chamfer, y + h);
    ctx.lineTo(x, y + h - chamfer);
    ctx.lineTo(x, y + chamfer);
    ctx.closePath();
  }

  // ============================================================
  // LAYOUT 4: NEON CYBER (REIMAGINED)
  // High-voltage cyberpunk cockpit: CRT scanlines, dual-neon glow,
  // chamfered telemetry cards, corner HUD brackets, dynamic metrics
  // ============================================================
  private renderNeonCyber(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const { distKm, coordStr, showHero, metricsList, showSecondary, cardAlpha } = this.getMetricsToShow(activity, config);
    const activeColor = config.accentColor || '#00f0ff';
    const secondaryNeon = activeColor === '#c8ff00' ? '#00f0ff' : (activeColor === '#00f0ff' ? '#ff007f' : '#00f0ff');
    const margin = w * 0.055;

    // 1. Draw photo with atmospheric cyberpunk color grading
    this.drawBackground(w, h, {
      ...config,
      photoFilters: {
        ...config.photoFilters,
        brightness: config.photoFilters.brightness * 0.65,
        contrast: config.photoFilters.contrast * 1.25,
        saturation: config.photoFilters.saturation * 1.15,
      },
    });

    if (!config.transparentBackground) {
      // 2. Deep synthwave backdrop gradient (midnight navy to deep purple)
      const synthGrad = ctx.createLinearGradient(0, 0, 0, h);
      synthGrad.addColorStop(0, 'rgba(5, 7, 18, 0.88)');
      synthGrad.addColorStop(0.35, 'rgba(6, 12, 28, 0.45)');
      synthGrad.addColorStop(0.65, 'rgba(18, 8, 32, 0.60)');
      synthGrad.addColorStop(1, 'rgba(4, 5, 14, 0.94)');
      ctx.fillStyle = synthGrad;
      ctx.fillRect(0, 0, w, h);

      // 3. Subtle CRT phosphor horizontal scanlines (gentle 1.5px lines, not harsh graph paper)
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      for (let y = 0; y < h; y += 4) {
        ctx.fillRect(0, y, w, 1.5);
      }
      ctx.restore();
    }

    // 4. Central neon energy halo
    const glow = ctx.createRadialGradient(w / 2, h * 0.44, 0, w / 2, h * 0.44, w * 0.55);
    glow.addColorStop(0, `${activeColor}22`);
    glow.addColorStop(0.6, `${secondaryNeon}12`);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();

    // 5. Corner Cyber HUD Brackets [ ┌ ┐ └ ┘ ]
    const bracketSize = Math.max(14, Math.round(w * 0.026));
    const drawBracket = (bx: number, by: number, dirX: 1 | -1, dirY: 1 | -1) => {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(bx + dirX * bracketSize, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + dirY * bracketSize);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    drawBracket(margin, margin, 1, 1);
    drawBracket(w - margin, margin, -1, 1);
    drawBracket(margin, h - margin, 1, -1);
    drawBracket(w - margin, h - margin, -1, -1);

    // 6. Top Cyber Header Lockup
    if (config.showTitleHeader !== false) {
      // System tag & coordinates
      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.round(w * 0.02)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 10;
      ctx.fillText(`SYS.ONLINE // ${activity.sportType.toUpperCase()}`, margin + 8, h * 0.065);
      ctx.shadowBlur = 0;

      ctx.textAlign = 'right';
      ctx.font = `500 ${Math.round(w * 0.017)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(coordStr, w - margin - 8, h * 0.065);

      // Neon glowing title
      ctx.font = `900 ${Math.round(w * 0.062)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 18;
      ctx.fillText(activity.title, margin + 8, h * 0.125);
      ctx.shadowBlur = 0;

      // City / Gear / Shoe tag pill
      const subtitleText = activity.locationCity
        ? `📍 ${activity.locationCity}  •  ${activity.date}`
        : `⚡ ${activity.sportType.toUpperCase()} SECTOR  •  ${activity.date}`;

      ctx.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = secondaryNeon;
      ctx.shadowColor = secondaryNeon;
      ctx.shadowBlur = 8;
      ctx.fillText(subtitleText, margin + 8, h * 0.158);
      ctx.shadowBlur = 0;
    }

    // 7. Center Neon Route Polyline
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        accentColor: activeColor,
        showGlow: true,
        glowIntensity: Math.min(1.0, (config.glowIntensity || 0.7) * 1.5),
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 43, scale: 0.88 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);

      // Subtle targeting reticle around route
      ctx.strokeStyle = `${activeColor}28`;
      ctx.lineWidth = 1;
      ctx.strokeRect(w * 0.18, h * 0.28, w * 0.64, h * 0.30);
    }

    // 8. Cyber Telemetry Console (Unified Non-Overlapping Cockpit Deck)
    const hasHrZones = Boolean(config.showHrZones && activity.hrZones && activity.hrZones.length > 0);
    const showConsole = showHero || (showSecondary && metricsList.length > 0);
    const consoleW = w * 0.90;
    const consoleX = (w - consoleW) / 2;
    const minDim = Math.min(w, h);

    // Height and Y position adapt dynamically to ensure zero overlap with HR zones or Watermark
    let consoleH: number;
    let consoleY: number;

    if (hasHrZones) {
      consoleH = Math.max(Math.round(h * 0.13), Math.round(w * 0.135));
      consoleY = h * 0.66;
    } else {
      consoleH = Math.max(Math.round(h * 0.155), Math.round(w * 0.16));
      consoleY = h * 0.72;
    }

    if (showConsole) {
      // Chamfered Cyber Console Plate
      ctx.fillStyle = `rgba(10, 14, 28, ${0.85 * cardAlpha})`;
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 16;
      this.drawChamferCard(ctx, consoleX, consoleY, consoleW, consoleH, 16);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Glowing accent laser strip on top edge
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 10;
      ctx.fillRect(consoleX + 24, consoleY, consoleW - 48, 2.5);
      ctx.shadowBlur = 0;

      if (showHero && showSecondary && metricsList.length > 0) {
        // -------------------------------------------------------------
        // COMBINED LAYOUT: Hero Distance Left (46%) | Metrics Grid Right (54%)
        // -------------------------------------------------------------
        const heroW = Math.round(consoleW * 0.46);
        const gridW = consoleW - heroW;
        const gridX = consoleX + heroW;

        // Vertical divider line between hero and secondary metrics
        ctx.strokeStyle = `${activeColor}33`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gridX, consoleY + consoleH * 0.15);
        ctx.lineTo(gridX, consoleY + consoleH * 0.85);
        ctx.stroke();

        // Neon decorative dots along the divider
        ctx.fillStyle = activeColor;
        ctx.fillRect(gridX - 1.5, consoleY + consoleH * 0.18, 3, 3);
        ctx.fillRect(gridX - 1.5, consoleY + consoleH * 0.82, 3, 3);

        // Left Side: Hero Distance Readout
        const heroPadX = 24;
        const heroStartX = consoleX + heroPadX;
        const maxHeroW = heroW - heroPadX - 24; // Strict clearance before divider

        ctx.textAlign = 'left';
        ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.015))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillText('// TELEMETRY: DISTANCE //', heroStartX, consoleY + consoleH * 0.28);

        // Prominent, bold hero distance font
        let heroFontSize = Math.min(Math.round(consoleH * 0.54), Math.round(minDim * 0.086));
        let unitFontSize = Math.max(13, Math.round(heroFontSize * 0.36));
        const heroGap = Math.round(heroFontSize * 0.10);

        // Measure both distKm and KM and scale down only if wider than available card area
        ctx.font = `900 ${heroFontSize}px "Plus Jakarta Sans", sans-serif`;
        let numW = ctx.measureText(distKm).width;
        ctx.font = `800 ${unitFontSize}px "JetBrains Mono", monospace`;
        let unitW = ctx.measureText('KM').width;

        if (numW + heroGap + unitW > maxHeroW) {
          const scale = maxHeroW / (numW + heroGap + unitW);
          heroFontSize = Math.max(28, Math.floor(heroFontSize * scale));
          unitFontSize = Math.max(12, Math.floor(unitFontSize * scale));
        }

        // Ensure font is set to hero font and measure numW with final heroFontSize
        ctx.font = `900 ${heroFontSize}px "Plus Jakarta Sans", sans-serif`;
        numW = ctx.measureText(distKm).width;

        const heroValY = consoleY + consoleH * 0.78;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 14;
        ctx.fillText(distKm, heroStartX, heroValY);
        ctx.shadowBlur = 0;

        ctx.font = `800 ${unitFontSize}px "JetBrains Mono", monospace`;
        ctx.fillStyle = activeColor;
        ctx.fillText('KM', heroStartX + numW + heroGap, heroValY);

        // Right Side: Secondary Metrics Micro-Grid (2 rows x 2 cols or 1 row)
        const cellCount = Math.min(metricsList.length, 4);
        const cols = cellCount <= 2 ? cellCount : 2;
        const rows = Math.ceil(cellCount / cols);
        const gridPadLeft = 32;
        const gridPadRight = 20;
        const colW = (gridW - gridPadLeft - gridPadRight) / cols;
        const startGridY = consoleY + consoleH * 0.14;
        const gridAvailH = consoleH * 0.74;
        const rowH = gridAvailH / rows;

        metricsList.slice(0, 4).forEach((m, idx) => {
          const colIdx = idx % cols;
          const rowIdx = Math.floor(idx / cols);
          const cellX = gridX + gridPadLeft + colIdx * colW;
          const cellY = startGridY + rowIdx * rowH;

          // Label
          ctx.textAlign = 'left';
          ctx.font = `700 ${Math.max(9, Math.round(minDim * 0.0125))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
          ctx.fillText(m.label, cellX, cellY + rowH * 0.28);

          // Value + Unit
          const valText = m.val;
          const cellValY = cellY + rowH * 0.72;
          let valFontSize = Math.min(Math.round(rowH * 0.44), Math.round(colW * 0.20), Math.round(minDim * 0.034));
          let valUnitSize = Math.max(9, Math.round(valFontSize * 0.54));

          ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
          let valW = ctx.measureText(valText).width;
          let uW = 0;
          if (m.unit) {
            ctx.font = `600 ${valUnitSize}px "JetBrains Mono", monospace`;
            uW = ctx.measureText(' ' + m.unit).width;
          }

          const maxCellW = colW - 8;
          if (valW + uW > maxCellW) {
            const scale = maxCellW / (valW + uW);
            valFontSize = Math.max(10, Math.floor(valFontSize * scale));
            valUnitSize = Math.max(8, Math.floor(valUnitSize * scale));
            ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
            valW = ctx.measureText(valText).width;
          }

          ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = '#ffffff';
          ctx.fillText(valText, cellX, cellValY);

          if (m.unit) {
            ctx.font = `600 ${valUnitSize}px "JetBrains Mono", monospace`;
            ctx.fillStyle = activeColor;
            ctx.fillText(m.unit, cellX + valW + 4, cellValY);
          }
        });

      } else if (showHero) {
        // -------------------------------------------------------------
        // ONLY HERO DISTANCE: Centered with cyber brackets & audio bars
        // -------------------------------------------------------------
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.016))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillText('// PRIMARY TELEMETRY: DISTANCE //', w / 2, consoleY + consoleH * 0.28);

        const heroFontSize = Math.min(Math.round(consoleH * 0.52), Math.round(consoleW * 0.22));
        ctx.font = `900 ${heroFontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 18;
        const heroValY = consoleY + consoleH * 0.78;
        ctx.fillText(`${distKm} KM`, w / 2, heroValY);
        ctx.shadowBlur = 0;

        // Flanking cyber bars on left and right
        const drawBars = (startX: number, step: number) => {
          for (let b = 0; b < 4; b++) {
            ctx.fillStyle = b === 3 ? `${activeColor}44` : activeColor;
            ctx.fillRect(startX + b * step, consoleY + consoleH * 0.38, 4, consoleH * 0.38);
          }
        };
        drawBars(consoleX + 24, 10);
        drawBars(consoleX + consoleW - 54, 10);

      } else if (showSecondary && metricsList.length > 0) {
        // -------------------------------------------------------------
        // ONLY SECONDARY METRICS: Full-width columns across console
        // -------------------------------------------------------------
        const colCount = Math.min(metricsList.length, 5);
        const colW = (consoleW - 32) / colCount;

        metricsList.slice(0, colCount).forEach((m, idx) => {
          const cx = consoleX + 16 + idx * colW + colW / 2;

          if (idx > 0) {
            ctx.strokeStyle = `${activeColor}22`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(consoleX + 16 + idx * colW, consoleY + consoleH * 0.2);
            ctx.lineTo(consoleX + 16 + idx * colW, consoleY + consoleH * 0.8);
            ctx.stroke();
          }

          ctx.textAlign = 'center';
          ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.015))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.fillText(m.label, cx, consoleY + consoleH * 0.35);

          const valFontSize = Math.min(Math.round(consoleH * 0.38), Math.round(colW * 0.24));
          ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
          ctx.fillStyle = '#ffffff';
          const unitText = m.unit ? ' ' + m.unit : '';
          const fullText = m.val + unitText;
          ctx.fillText(fullText, cx, consoleY + consoleH * 0.78);
        });
      }
    }

    // 9. Dedicated Cyber Heart Rate Zones Card (Zero Overlap Guaranteed!)
    if (hasHrZones) {
      const hrCardW = consoleW;
      const hrCardX = consoleX;
      const hrCardY = showConsole
        ? consoleY + consoleH + Math.max(12, Math.round(h * 0.016))
        : h * 0.76;
      const hrCardH = Math.max(Math.round(h * 0.082), Math.round(w * 0.085));

      // Chamfered Cyber HR Card
      ctx.fillStyle = `rgba(10, 14, 28, ${0.82 * cardAlpha})`;
      ctx.strokeStyle = `${secondaryNeon}66`;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = secondaryNeon;
      ctx.shadowBlur = 10;
      this.drawChamferCard(ctx, hrCardX, hrCardY, hrCardW, hrCardH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // HR Header line
      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.014))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = secondaryNeon;
      ctx.fillText('// BIOMETRICS: HEART RATE ZONES //', hrCardX + 18, hrCardY + hrCardH * 0.28);

      if (activity.avgHeartRate) {
        ctx.textAlign = 'right';
        ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.014))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#ffffff';
        const hrSummary = `AVG: ${activity.avgHeartRate} BPM${activity.maxHeartRate ? ` • MAX: ${activity.maxHeartRate} BPM` : ''}`;
        ctx.fillText(hrSummary, hrCardX + hrCardW - 18, hrCardY + hrCardH * 0.28);
      }

      // 5-Zone Colored Bar
      const barX = hrCardX + 18;
      const barW = hrCardW - 36;
      const barY = hrCardY + hrCardH * 0.44;
      const barH = Math.max(12, Math.round(hrCardH * 0.18));
      const zones = activity.hrZones || [];

      // Background trough
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      this.roundRect(ctx, barX, barY, barW, barH, barH / 2);
      ctx.fill();

      // Cyber zone colors: cyan -> green -> yellow -> orange -> neon red/magenta
      const cyberZoneColors = ['#00f0ff', '#00ff88', '#ffe600', '#ff7700', '#ff0055'];
      let curSegX = barX;

      zones.forEach((z, i) => {
        const segW = Math.max(0, (z.percent / 100) * barW);
        if (segW <= 0) return;

        ctx.fillStyle = cyberZoneColors[i % cyberZoneColors.length];
        if (i === 0 && zones.every((_, idx) => idx === 0 || zones[idx].percent === 0)) {
          this.roundRect(ctx, curSegX, barY, segW, barH, barH / 2);
        } else if (i === 0) {
          this.roundRect(ctx, curSegX, barY, segW, barH, { tl: barH / 2, bl: barH / 2, tr: 0, br: 0 });
        } else if (i === zones.length - 1) {
          this.roundRect(ctx, curSegX, barY, segW, barH, { tl: 0, bl: 0, tr: barH / 2, br: barH / 2 });
        } else {
          ctx.fillRect(curSegX, barY, segW, barH);
        }
        ctx.fill();
        curSegX += segW;
      });

      // Bottom Zone Percentage Readouts (Z1 → Z5)
      const colSegW = barW / Math.min(zones.length, 5);
      zones.slice(0, 5).forEach((z, i) => {
        const lx = barX + colSegW * i + colSegW / 2;
        ctx.textAlign = 'center';
        ctx.font = `600 ${Math.max(9, Math.round(minDim * 0.013))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = cyberZoneColors[i % cyberZoneColors.length];
        ctx.fillText(`Z${z.zone} ${Math.round(z.percent)}%`, lx, hrCardY + hrCardH * 0.86);
      });
    }

    // 10. Watermark Branding Badge
    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
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

    if (!config.transparentBackground) {
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
    }

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

    const metricsConfig = config.metrics || {
      distance: true, time: true, pace: true, elevation: true,
      heartRate: true, cadence: true, calories: true, power: true,
    };
    const showHero = config.showHeroStats !== false;
    const showSecondary = config.showSecondaryStats !== false;

    // Primary hero stats
    const heroMetrics: Array<{ label: string; val: string; unit: string; color: string }> = [];
    if (showHero) {
      if (metricsConfig.distance !== false) {
        heroMetrics.push({ label: 'DISTANCE', val: (activity.distanceMeters / 1000).toFixed(2), unit: 'km', color: config.accentColor });
      }
      if (metricsConfig.pace !== false) {
        heroMetrics.push({ label: 'AVG PACE', val: formatPace(activity.avgPaceSecPerKm), unit: '/km', color: '#ffffff' });
      }
      if (metricsConfig.time !== false) {
        heroMetrics.push({ label: 'MOVING TIME', val: formatDuration(activity.movingTimeSec), unit: '', color: '#ffffff' });
      }
      if (metricsConfig.elevation !== false && activity.elevationGainMeters > 0) {
        heroMetrics.push({ label: 'ELEV GAIN', val: `+${Math.round(activity.elevationGainMeters)}`, unit: 'm', color: '#00f0ff' });
      }
    }

    const gridCols = heroMetrics.length === 1 ? 1 : 2;
    const gridRows = Math.ceil(heroMetrics.length / gridCols);
    const cellW = (w - margin * 2) / gridCols;
    const cellH = heroMetrics.length > 0 ? (h - splitY) * 0.37 / Math.max(gridRows, 1) : 0;

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
    const dividerY = heroMetrics.length > 0
      ? statsTop + gridRows * (cellH + h * 0.01) + h * 0.01
      : statsTop + h * 0.02;

    // Secondary stats row
    const secParts: string[] = [];
    if (showSecondary) {
      if (!showHero && metricsConfig.distance !== false && activity.distanceMeters > 0) {
        secParts.push(`📏 ${(activity.distanceMeters / 1000).toFixed(2)} km`);
      }
      if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
        secParts.push(`❤️ ${activity.avgHeartRate} bpm`);
      }
      if (metricsConfig.cadence && activity.avgCadence) {
        secParts.push(`👟 ${activity.avgCadence} spm`);
      }
      if (metricsConfig.calories && activity.calories) {
        secParts.push(`🔥 ${activity.calories} kcal`);
      }
      if (metricsConfig.power && activity.avgPowerWatts) {
        secParts.push(`⚡ ${activity.avgPowerWatts} W`);
      }
    }

    if (secParts.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(margin, dividerY, w - margin * 2, 1);

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
      this.drawWatermark(w, h, config);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 6: POLAROID
  // White border frame, film grain aesthetic, handwritten-style text
  // ============================================================
  private renderPolaroid(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const margin = w * 0.08;
    const frameL = margin;
    const frameT = h * 0.06;
    const photoW = w - margin * 2;
    const photoH = photoW;
    const frameB = h * 0.28;
    const photoX = frameL;
    const photoY = frameT;

    if (!config.transparentBackground) {
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

      // Shadow under frame
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 8;
      ctx.shadowOffsetY = 12;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(frameL - 4, frameT - 4, photoW + 8, photoH + frameB);
      ctx.restore();
    }

    // White polaroid card
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(frameL - 4, frameT - 4, photoW + 8, photoH + frameB);

    if (config.transparentBackground) {
      // Clear out photo aperture to make it a transparent window
      ctx.clearRect(photoX, photoY, photoW, photoH);
    } else {
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
    }

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
    const metricsConfig = config.metrics || {
      distance: true, time: true, pace: true, elevation: true,
      heartRate: true, cadence: true, calories: true, power: true,
    };
    const showHero = config.showHeroStats !== false;
    const showSecondary = config.showSecondaryStats !== false;

    const statItems: string[] = [];
    if (showHero && metricsConfig.distance !== false) {
      statItems.push(`${(activity.distanceMeters / 1000).toFixed(1)} km`);
    }
    if (metricsConfig.time !== false) {
      statItems.push(formatDuration(activity.movingTimeSec));
    }
    if (metricsConfig.pace !== false) {
      statItems.push(`${formatPace(activity.avgPaceSecPerKm)}/km`);
    }
    if (showSecondary) {
      if (metricsConfig.elevation !== false && activity.elevationGainMeters > 0) {
        statItems.push(`+${Math.round(activity.elevationGainMeters)}m`);
      }
      if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
        statItems.push(`${activity.avgHeartRate} bpm`);
      }
      if (metricsConfig.cadence && activity.avgCadence) {
        statItems.push(`${activity.avgCadence} spm`);
      }
      if (metricsConfig.calories && activity.calories) {
        statItems.push(`${activity.calories} kcal`);
      }
      if (metricsConfig.power && activity.avgPowerWatts) {
        statItems.push(`${activity.avgPowerWatts}W`);
      }
    }

    if (statItems.length > 0) {
      const statLine = statItems.slice(0, 5).join('  ·  ');
      ctx.font = `600 ${Math.round(w * 0.026)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(42,32,21,0.62)';
      ctx.fillText(statLine, captionCX, captionY + h * 0.115);
    }

    // Date / location
    const meta = [activity.date, activity.locationCity].filter(Boolean).join('  —  ');
    ctx.font = `500 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = 'rgba(42,32,21,0.42)';
    ctx.fillText(meta, captionCX, captionY + h * 0.138);

    // Accent color dot
    ctx.fillStyle = config.accentColor === '#ffffff' ? '#c8ff00' : config.accentColor;
    ctx.beginPath();
    ctx.arc(captionCX - w * 0.14, captionY + h * 0.138, 5, 0, Math.PI * 2);
    ctx.fill();

    if (config.showWatermark) {
      const pWatermarkY = Math.round(captionY + h * 0.165);
      this.drawWatermark(w, h, config, pWatermarkY);
    }

    ctx.restore();
  }

  // ============================================================
  // SHARED METRICS HELPER (used by neon-cyber & metrics calculations)
  // ============================================================
  private getMetricsToShow(activity: WorkoutActivity, config: OverlayConfig) {
    const metricsConfig = config.metrics || {
      distance: true,
      time: true,
      pace: true,
      elevation: true,
      heartRate: true,
      cadence: true,
      calories: true,
      power: true,
    };

    let eleGain = activity.elevationGainMeters;
    if ((eleGain === undefined || eleGain === 0) && activity.points && activity.points.length > 1) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length >= 2) {
        eleGain = computeRobustElevationGain(altitudes);
        activity.elevationGainMeters = eleGain;
      }
    }

    const distKm = (activity.distanceMeters / 1000).toFixed(2);
    const paceStr = formatPace(activity.avgPaceSecPerKm);
    const timeStr = formatDuration(activity.movingTimeSec);
    const eleStr = eleGain > 0 ? `+${Math.round(eleGain)}` : '0';
    const hrStr = activity.avgHeartRate ? `${activity.avgHeartRate}` : '—';

    const showHero = config.showHeroStats !== false && metricsConfig.distance !== false;

    const metricsList: Array<{ label: string; val: string; unit: string }> = [];
    if (!showHero && metricsConfig.distance !== false && activity.distanceMeters > 0) {
      metricsList.push({ label: 'DIST', val: distKm, unit: 'km' });
    }
    if (metricsConfig.pace !== false) {
      metricsList.push({ label: 'PACE', val: paceStr, unit: '/km' });
    }
    if (metricsConfig.time !== false) {
      metricsList.push({ label: 'TIME', val: timeStr, unit: '' });
    }
    if (metricsConfig.elevation !== false && eleGain > 0) {
      metricsList.push({ label: 'ELEV', val: eleStr, unit: 'm' });
    }
    if (metricsConfig.heartRate !== false && activity.avgHeartRate) {
      metricsList.push({ label: 'AVG HR', val: `${activity.avgHeartRate}`, unit: 'bpm' });
    }
    if (metricsConfig.cadence && activity.avgCadence) {
      metricsList.push({ label: 'CADENCE', val: `${activity.avgCadence}`, unit: 'spm' });
    }
    if (metricsConfig.calories && activity.calories) {
      metricsList.push({ label: 'CALORIES', val: `${activity.calories}`, unit: 'kcal' });
    }
    if (metricsConfig.power && activity.avgPowerWatts) {
      metricsList.push({ label: 'POWER', val: `${activity.avgPowerWatts}`, unit: 'W' });
    }

    let coordStr = '37.832°N  122.525°W';
    if (activity.points && activity.points.length > 0) {
      const p = activity.points[0];
      coordStr = `${Math.abs(p.lat).toFixed(3)}°${p.lat >= 0 ? 'N' : 'S'}  ${Math.abs(p.lon).toFixed(3)}°${p.lon >= 0 ? 'E' : 'W'}`;
    }

    const showSecondary = config.showSecondaryStats !== false && metricsList.length > 0;
    const cardAlpha = Math.max(0.15, config.cardOpacity ?? 0.75);

    return {
      distKm,
      paceStr,
      timeStr,
      eleStr,
      hrStr,
      coordStr,
      showHero,
      metricsList,
      showSecondary,
      cardAlpha,
    };
  }

  // ============================================================
  // SHARED PRIMITIVES (used by classic & other layouts)
  // ============================================================

  private drawBackground(w: number, h: number, config: OverlayConfig) {
    if (config.transparentBackground) return;
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
    if (config.transparentBackground) return;
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

    const cols = config.showHeroStats !== false
      ? allHeroCols.filter((col) => metricsConfig[col.key as keyof typeof metricsConfig] !== false)
      : [];

    const secMetrics: string[] = [];
    if (config.showSecondaryStats !== false) {
      if (metricsConfig.heartRate !== false && activity.avgHeartRate) secMetrics.push(`❤️ ${activity.avgHeartRate} bpm`);
      if (metricsConfig.cadence && activity.avgCadence) secMetrics.push(`👟 ${activity.avgCadence} spm`);
      if (metricsConfig.calories && activity.calories) secMetrics.push(`🔥 ${activity.calories} kcal`);
      if (metricsConfig.power && activity.avgPowerWatts) secMetrics.push(`⚡ ${activity.avgPowerWatts} W`);

      if (metricsConfig.elevation !== false && activity.points && activity.points.length > 0) {
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

  private drawWatermark(w: number, h: number, config: OverlayConfig, customY?: number) {
    const ctx = this.ctx;
    ctx.save();

    const activeColor = config.accentColor || '#c8ff00';
    const minDim = Math.min(w, h);
    // Proportionally scaled font size: crisp, prominent, legible across all aspect ratios
    const fontSize = Math.max(14, Math.round(minDim * 0.022));

    ctx.font = `800 ${fontSize}px "JetBrains Mono", monospace`;

    const rawText = (config.watermarkText || 'Crafted with RunCraft').trim();
    const isDefaultBrand =
      !rawText ||
      rawText === 'Crafted with RunCraft' ||
      rawText.toUpperCase() === 'RUNCRAFT' ||
      rawText.toUpperCase() === 'RUN·CRAFT' ||
      rawText.toUpperCase() === 'RUN CRAFT';

    const part1 = isDefaultBrand ? 'RUN' : rawText;
    const dot = isDefaultBrand ? ' · ' : '';
    const part2 = isDefaultBrand ? 'CRAFT' : '';

    const part1Width = ctx.measureText(part1).width;
    const dotWidth = isDefaultBrand ? ctx.measureText(dot).width : 0;
    const part2Width = isDefaultBrand ? ctx.measureText(part2).width : 0;
    const totalTextWidth = part1Width + dotWidth + part2Width;

    const padX = Math.round(fontSize * 1.15);
    const padY = Math.round(fontSize * 0.44);
    const pillW = Math.round(totalTextWidth + padX * 2);
    const pillH = Math.round(fontSize + padY * 2);
    const pillX = Math.round((w - pillW) / 2);
    const pillY = customY !== undefined
      ? Math.round(customY - pillH / 2)
      : Math.round(h - pillH - Math.max(18, Math.round(h * 0.024)));

    // 1. Frosted Glass Capsule Fill with soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
    grad.addColorStop(0, 'rgba(14, 18, 28, 0.88)');
    grad.addColorStop(1, 'rgba(6, 9, 16, 0.94)');
    ctx.fillStyle = grad;
    this.roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();

    // 2. Luminous Accent Border with subtle glow
    ctx.shadowColor = activeColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = `${activeColor}77`;
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.stroke();

    // 3. Crisp Dual-Tone Typography
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const textY = pillY + pillH / 2 + 1;
    let curX = pillX + padX;

    // RUN (or custom text) in 100% crisp pure white
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 3;
    ctx.fillText(part1, curX, textY);
    curX += part1Width;

    if (isDefaultBrand) {
      // Dot separator
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.shadowBlur = 0;
      ctx.fillText(dot, curX, textY);
      curX += dotWidth;

      // CRAFT in glowing accent color
      ctx.fillStyle = activeColor;
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 6;
      ctx.fillText(part2, curX, textY);
    }

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

  // ============================================================
  // LAYOUT 7: EDITORIAL HERITAGE (Tracksmith / Ivy League Varsity)
  // Timeless print journalism, double fine-line borders, classical serif
  // numbers, heraldic runner emblem, structured editorial grid
  // ============================================================
  private renderEditorialHeritage(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const { distKm, coordStr, showHero, metricsList, showSecondary } = this.getMetricsToShow(activity, config);
    const activeColor = config.accentColor || '#c8ff00';
    const minDim = Math.min(w, h);

    // 1. Photo with warm film grade
    this.drawBackground(w, h, {
      ...config,
      photoFilters: {
        ...config.photoFilters,
        brightness: config.photoFilters.brightness * 0.95,
        contrast: config.photoFilters.contrast * 1.08,
      },
    });

    if (!config.transparentBackground) {
      // 2. Subtle top and bottom vignettes for editorial contrast
      const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.32);
      topGrad.addColorStop(0, 'rgba(10, 12, 18, 0.78)');
      topGrad.addColorStop(1, 'rgba(10, 12, 18, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.32);

      const btmGrad = ctx.createLinearGradient(0, h * 0.60, 0, h);
      btmGrad.addColorStop(0, 'rgba(10, 12, 18, 0)');
      btmGrad.addColorStop(1, 'rgba(10, 12, 18, 0.88)');
      ctx.fillStyle = btmGrad;
      ctx.fillRect(0, h * 0.60, w, h * 0.40);
    }

    ctx.save();

    // 3. Classical double fine-line inset border
    const borderInset = Math.round(w * 0.045);
    const innerInset = borderInset + 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(borderInset, borderInset, w - borderInset * 2, h - borderInset * 2);

    ctx.strokeStyle = `${activeColor}44`;
    ctx.lineWidth = 0.75;
    ctx.strokeRect(innerInset, innerInset, w - innerInset * 2, h - innerInset * 2);

    // Corner diamond ornaments
    const drawDiamond = (cx: number, cy: number, size = 4) => {
      ctx.fillStyle = activeColor;
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fill();
    };
    drawDiamond(borderInset, borderInset);
    drawDiamond(w - borderInset, borderInset);
    drawDiamond(borderInset, h - borderInset);
    drawDiamond(w - borderInset, h - borderInset);

    // 4. Header: Classical track & field category kicker
    const headY = borderInset + Math.round(h * 0.035);
    if (config.showTitleHeader) {
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.015))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      const kicker = `✦  TRACK & FIELD ARCHIVE  •  N° ${activity.date || '2026'}  ✦`;
      ctx.fillText(kicker, w / 2, headY);

      // Title in elegant serif typography
      ctx.font = `700 ${Math.max(18, Math.round(w * 0.048))}px "Playfair Display", "Georgia", serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 12;
      const titleLines = this.wrapText(ctx, activity.title.toUpperCase(), w * 0.80);
      titleLines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, w / 2, headY + h * 0.045 + i * h * 0.05);
      });
      ctx.shadowBlur = 0;

      // Subtitle / Location
      if (activity.locationCity) {
        ctx.font = `italic 500 ${Math.max(11, Math.round(minDim * 0.018))}px "Georgia", serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.fillText(`Recorded in ${activity.locationCity}  •  ${coordStr}`, w / 2, headY + h * 0.10);
      }
    }

    // 5. GPS Route Polyline: centered
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 44, scale: 0.82 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    // 6. Classical Laurel / Rule-Flanked Hero Distance Readout
    const btmAreaY = h * 0.70;
    if (showHero) {
      const heroNumSize = Math.max(26, Math.min(Math.round(h * 0.088), Math.round(w * 0.11)));
      ctx.textAlign = 'center';

      // Horizontal classical flanking rules
      const heroY = btmAreaY;
      ctx.font = `700 ${heroNumSize}px "Playfair Display", "Georgia", serif`;
      const distNumText = `${distKm} KM`;
      const numW = ctx.measureText(distNumText).width;

      const ruleW = Math.max(24, Math.round((w * 0.75 - numW) / 2));
      const leftRuleX = w / 2 - numW / 2 - ruleW - 12;
      const rightRuleX = w / 2 + numW / 2 + 12;

      ctx.strokeStyle = `${activeColor}88`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftRuleX, heroY - heroNumSize * 0.3);
      ctx.lineTo(leftRuleX + ruleW, heroY - heroNumSize * 0.3);
      ctx.moveTo(rightRuleX, heroY - heroNumSize * 0.3);
      ctx.lineTo(rightRuleX + ruleW, heroY - heroNumSize * 0.3);
      ctx.stroke();

      drawDiamond(leftRuleX, heroY - heroNumSize * 0.3, 3);
      drawDiamond(rightRuleX + ruleW, heroY - heroNumSize * 0.3, 3);

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(distNumText, w / 2, heroY);
      ctx.shadowBlur = 0;

      ctx.font = `600 ${Math.max(9, Math.round(minDim * 0.013))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('OFFICIAL DISTANCE', w / 2, heroY + heroNumSize * 0.32);
    }

    // 7. Secondary Metrics: Classical Rule-Divided Table
    if (showSecondary && metricsList.length > 0) {
      const tableStartY = showHero ? btmAreaY + Math.round(h * 0.08) : btmAreaY - Math.round(h * 0.04);
      const cellCount = Math.min(metricsList.length, 5);
      const colW = (w - borderInset * 2 - 32) / cellCount;
      const startX = borderInset + 16;

      // Top rule
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, tableStartY);
      ctx.lineTo(startX + colW * cellCount, tableStartY);
      ctx.stroke();

      metricsList.slice(0, cellCount).forEach((m, idx) => {
        const cx = startX + idx * colW + colW / 2;

        // Label
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.max(9, Math.round(minDim * 0.0125))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.fillText(m.label, cx, tableStartY + Math.round(h * 0.024));

        // Value
        const valFontSize = Math.max(12, Math.round(minDim * 0.024));
        ctx.font = `700 ${valFontSize}px "Playfair Display", "Georgia", serif`;
        ctx.fillStyle = '#ffffff';
        const valStr = m.unit ? `${m.val} ${m.unit}` : m.val;
        ctx.fillText(valStr, cx, tableStartY + Math.round(h * 0.056));

        // Vertical column dividers
        if (idx < cellCount - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.beginPath();
          ctx.moveTo(startX + (idx + 1) * colW, tableStartY + 4);
          ctx.lineTo(startX + (idx + 1) * colW, tableStartY + Math.round(h * 0.065));
          ctx.stroke();
        }
      });

      // Bottom rule
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(startX, tableStartY + Math.round(h * 0.072));
      ctx.lineTo(startX + colW * cellCount, tableStartY + Math.round(h * 0.072));
      ctx.stroke();
    }

    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 8: SUMMIT TOPO (Alpine Mountain Trail & Ultra Peak)
  // Rugged trail runner aesthetic: elevation profile sparkline graph,
  // summit crest badge, technical coordinates, compass bearing
  // ============================================================
  private renderSummitTopo(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const { distKm, coordStr, showHero, metricsList, showSecondary } = this.getMetricsToShow(activity, config);
    const activeColor = config.accentColor || '#ff6b00';
    const minDim = Math.min(w, h);
    const margin = w * 0.055;

    // 1. Photo with deep mountain contrast
    this.drawBackground(w, h, {
      ...config,
      photoFilters: {
        ...config.photoFilters,
        brightness: config.photoFilters.brightness * 0.90,
        contrast: config.photoFilters.contrast * 1.18,
      },
    });

    if (!config.transparentBackground) {
      // 2. High-contrast alpine top and bottom letterbox scrims
      const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.28);
      topGrad.addColorStop(0, 'rgba(8, 12, 18, 0.85)');
      topGrad.addColorStop(1, 'rgba(8, 12, 18, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.28);

      const btmGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
      btmGrad.addColorStop(0, 'rgba(8, 12, 18, 0)');
      btmGrad.addColorStop(0.4, 'rgba(8, 12, 18, 0.75)');
      btmGrad.addColorStop(1, 'rgba(8, 12, 18, 0.95)');
      ctx.fillStyle = btmGrad;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
    }

    ctx.save();

    // 3. Technical Trail Summit Header
    if (config.showTitleHeader) {
      ctx.textAlign = 'left';
      ctx.font = `800 ${Math.max(10, Math.round(minDim * 0.015))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('▲ ALPINE TRAIL SERIES  //  SUMMIT ARCHIVE', margin, h * 0.065);

      ctx.font = `900 ${Math.max(18, Math.round(w * 0.055))}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 16;
      ctx.fillText(activity.title.toUpperCase(), margin, h * 0.115);
      ctx.shadowBlur = 0;

      // Compass bearing & altitude tag
      ctx.font = `600 ${Math.max(10, Math.round(minDim * 0.014))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      const elevMeters = Math.round(activity.elevationGainMeters || 0);
      const trailMeta = `BEARING 284° WNW  •  ▲ +${elevMeters}M VERTICAL  •  ${activity.date}`;
      ctx.fillText(trailMeta, margin, h * 0.145);
    }

    // 4. GPS Route Polyline
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 38, scale: 0.84 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    // 5. Elevation Profile Mini Sparkline graph (Under Route)
    if (activity.points && activity.points.length > 5) {
      const altitudes = activity.points.map((p) => p.ele).filter((e): e is number => e !== undefined);
      if (altitudes.length > 5) {
        const minAlt = Math.min(...altitudes);
        const maxAlt = Math.max(...altitudes);
        const altRange = Math.max(10, maxAlt - minAlt);

        const graphX = margin;
        const graphW = w - margin * 2;
        const graphY = h * 0.54;
        const graphH = Math.round(h * 0.075);

        ctx.beginPath();
        altitudes.forEach((alt, idx) => {
          const gx = graphX + (idx / (altitudes.length - 1)) * graphW;
          const gy = graphY + graphH - ((alt - minAlt) / altRange) * graphH;
          if (idx === 0) ctx.moveTo(gx, gy);
          else ctx.lineTo(gx, gy);
        });

        // Glowing profile line
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = activeColor;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Translucent fill under graph
        ctx.lineTo(graphX + graphW, graphY + graphH);
        ctx.lineTo(graphX, graphY + graphH);
        ctx.closePath();
        const altGrad = ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
        altGrad.addColorStop(0, `${activeColor}44`);
        altGrad.addColorStop(1, `${activeColor}00`);
        ctx.fillStyle = altGrad;
        ctx.fill();

        // Min & Max altitude tags
        ctx.textAlign = 'left';
        ctx.font = `700 10px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(`MIN: ${Math.round(minAlt)}m`, graphX, graphY + graphH + 12);
        ctx.textAlign = 'right';
        ctx.fillText(`MAX: ${Math.round(maxAlt)}m ▲`, graphX + graphW, graphY + graphH + 12);
      }
    }

    // 6. Rugged Summit Telemetry Card
    const cardY = h * 0.68;
    const cardW = w - margin * 2;
    const cardH = Math.max(Math.round(h * 0.155), Math.round(minDim * 0.16));

    // Dark rugged cockpit capsule
    ctx.fillStyle = 'rgba(14, 18, 28, 0.88)';
    ctx.strokeStyle = `${activeColor}55`;
    ctx.lineWidth = 1.5;
    this.drawChamferCard(ctx, margin, cardY, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();

    // Top laser accent edge
    ctx.fillStyle = activeColor;
    ctx.fillRect(margin + 20, cardY, cardW - 40, 2);

    if (showHero && showSecondary && metricsList.length > 0) {
      // Left: Hero Stat (Distance or Elevation)
      const heroW = Math.round(cardW * 0.44);
      const gridX = margin + heroW;

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gridX, cardY + cardH * 0.18);
      ctx.lineTo(gridX, cardY + cardH * 0.82);
      ctx.stroke();

      // Hero readout
      ctx.textAlign = 'left';
      ctx.font = `700 ${Math.max(9, Math.round(minDim * 0.013))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('// TRAIL DISTANCE //', margin + 18, cardY + cardH * 0.28);

      const heroFontSize = Math.min(Math.round(cardH * 0.52), Math.round(heroW * 0.28));
      ctx.font = `900 ${heroFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      const heroY = cardY + cardH * 0.78;
      ctx.fillText(distKm, margin + 18, heroY);
      const nW = ctx.measureText(distKm).width;

      ctx.font = `800 ${Math.round(heroFontSize * 0.42)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('KM', margin + 22 + nW, heroY);

      // Right: 2x2 micro grid
      const cellCount = Math.min(metricsList.length, 4);
      const cols = cellCount <= 2 ? cellCount : 2;
      const rows = Math.ceil(cellCount / cols);
      const colW = (cardW - heroW - 32) / cols;
      const rowH = (cardH * 0.74) / rows;
      const startGridY = cardY + cardH * 0.14;

      metricsList.slice(0, 4).forEach((m, idx) => {
        const colIdx = idx % cols;
        const rowIdx = Math.floor(idx / cols);
        const cellX = gridX + 20 + colIdx * colW;
        const cellY = startGridY + rowIdx * rowH;

        ctx.textAlign = 'left';
        ctx.font = `700 ${Math.max(9, Math.round(minDim * 0.0125))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(m.label, cellX, cellY + rowH * 0.28);

        const valFontSize = Math.min(Math.round(rowH * 0.46), Math.round(colW * 0.22));
        ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        const valText = m.val;
        ctx.fillText(valText, cellX, cellY + rowH * 0.74);

        if (m.unit) {
          const vW = ctx.measureText(valText).width;
          ctx.font = `600 ${Math.round(valFontSize * 0.54)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = activeColor;
          ctx.fillText(m.unit, cellX + vW + 4, cellY + rowH * 0.74);
        }
      });

    } else if (showHero) {
      ctx.textAlign = 'center';
      ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.014))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('▲ PRIMARY TRAIL TELEMETRY ▲', w / 2, cardY + cardH * 0.28);

      const heroFontSize = Math.min(Math.round(cardH * 0.52), Math.round(cardW * 0.2));
      ctx.font = `900 ${heroFontSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`${distKm} KM`, w / 2, cardY + cardH * 0.78);

    } else if (showSecondary && metricsList.length > 0) {
      const colCount = Math.min(metricsList.length, 4);
      const colW = (cardW - 32) / colCount;
      metricsList.slice(0, colCount).forEach((m, idx) => {
        const cx = margin + 16 + idx * colW + colW / 2;
        ctx.textAlign = 'center';
        ctx.font = `700 ${Math.max(9, Math.round(minDim * 0.013))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillText(m.label, cx, cardY + cardH * 0.35);

        const valFontSize = Math.min(Math.round(cardH * 0.36), Math.round(colW * 0.22));
        ctx.font = `800 ${valFontSize}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = '#ffffff';
        const unitText = m.unit ? ' ' + m.unit : '';
        ctx.fillText(m.val + unitText, cx, cardY + cardH * 0.76);
      });
    }

    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
    }

    ctx.restore();
  }

  // ============================================================
  // LAYOUT 9: NORDIC MINIMAL (District Vision / Scandinavian Chic)
  // Ultra-clean high-fashion running: razor-thin hairline borders,
  // generous negative space, floating telemetry ticker, modern geometry
  // ============================================================
  private renderNordicMinimal(activity: WorkoutActivity, config: OverlayConfig, w: number, h: number) {
    const ctx = this.ctx;
    const { distKm, coordStr, showHero, metricsList, showSecondary } = this.getMetricsToShow(activity, config);
    const activeColor = config.accentColor || '#ffffff';
    const minDim = Math.min(w, h);
    const margin = w * 0.06;

    // 1. Photo with pristine, high-clarity natural grading
    this.drawBackground(w, h, {
      ...config,
      photoFilters: {
        ...config.photoFilters,
        brightness: config.photoFilters.brightness * 0.96,
        contrast: config.photoFilters.contrast * 1.05,
      },
    });

    if (!config.transparentBackground) {
      // 2. Feather-light top and bottom scrims
      const topGrad = ctx.createLinearGradient(0, 0, 0, h * 0.22);
      topGrad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
      topGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, w, h * 0.22);

      const btmGrad = ctx.createLinearGradient(0, h * 0.65, 0, h);
      btmGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      btmGrad.addColorStop(1, 'rgba(0, 0, 0, 0.82)');
      ctx.fillStyle = btmGrad;
      ctx.fillRect(0, h * 0.65, w, h * 0.35);
    }

    ctx.save();

    // 3. Top Header: Clean asymmetric metadata pill
    if (config.showTitleHeader) {
      // Sleek top-left coordinates badge
      ctx.textAlign = 'left';
      ctx.font = `600 ${Math.max(9, Math.round(minDim * 0.0135))}px "JetBrains Mono", monospace`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.fillText(`[ ${coordStr} ]  //  ${activity.date}`, margin, h * 0.065);

      // Stark modern title
      ctx.font = `800 ${Math.max(18, Math.round(w * 0.052))}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 14;
      ctx.fillText(activity.title.toUpperCase(), margin, h * 0.115);
      ctx.shadowBlur = 0;

      if (activity.locationCity) {
        ctx.font = `500 ${Math.max(10, Math.round(minDim * 0.015))}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = activeColor;
        ctx.fillText(activity.locationCity.toUpperCase(), margin, h * 0.145);
      }
    }

    // 4. GPS Route Polyline: delicate hairline route
    if (config.showPolyline && activity.points && activity.points.length > 1) {
      const routeConfig = {
        ...config,
        positions: {
          ...config.positions,
          routeMap: { xPercent: 50, yPercent: 43, scale: 0.82 },
        },
      };
      this.drawRoutePolyline(activity.points, w, h, routeConfig);
    }

    // 5. Hero Distance Numeral (Modernist stark typography)
    const btmY = h * 0.72;
    if (showHero) {
      const heroSize = Math.max(28, Math.min(Math.round(h * 0.11), Math.round(w * 0.18)));
      ctx.textAlign = 'left';
      ctx.font = `900 ${heroSize}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 18;
      ctx.fillText(distKm, margin, btmY);
      ctx.shadowBlur = 0;

      const numW = ctx.measureText(distKm).width;
      ctx.font = `700 ${Math.round(heroSize * 0.28)}px "JetBrains Mono", monospace`;
      ctx.fillStyle = activeColor;
      ctx.fillText('KM', margin + numW + 10, btmY);

      // Subtle hairline underline
      ctx.strokeStyle = `${activeColor}44`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(margin, btmY + 8);
      ctx.lineTo(margin + numW + 48, btmY + 8);
      ctx.stroke();
    }

    // 6. Floating Minimalist Telemetry Ticker
    if (showSecondary && metricsList.length > 0) {
      const tickerY = showHero ? btmY + Math.round(h * 0.045) : btmY;
      const tickerW = w - margin * 2;
      const tickerH = Math.max(38, Math.round(minDim * 0.065));

      // Frosted hairline capsule
      ctx.fillStyle = 'rgba(12, 16, 24, 0.55)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, margin, tickerY, tickerW, tickerH, 12);
      ctx.fill();
      ctx.stroke();

      const cellCount = Math.min(metricsList.length, 5);
      const colW = tickerW / cellCount;

      metricsList.slice(0, cellCount).forEach((m, idx) => {
        const cx = margin + idx * colW + colW / 2;
        const cy = tickerY + tickerH / 2 + 1;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.max(10, Math.round(minDim * 0.015))}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#ffffff';

        const unitPart = m.unit ? ` ${m.unit}` : '';
        ctx.fillText(`${m.label}: ${m.val}${unitPart}`, cx, cy);

        // Hairline column separators
        if (idx < cellCount - 1) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.moveTo(margin + (idx + 1) * colW, tickerY + tickerH * 0.2);
          ctx.lineTo(margin + (idx + 1) * colW, tickerY + tickerH * 0.8);
          ctx.stroke();
        }
      });
      ctx.textBaseline = 'alphabetic';
    }

    if (config.showWatermark) {
      this.drawWatermark(w, h, config);
    }

    ctx.restore();
  }
}
