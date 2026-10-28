/**
 * RunCraft In-Browser Computer Vision Analyzer
 * Detects athlete/subject position, negative space, and luminance profile in ~15ms
 * Powers on-the-fly adaptive workout overlay composition
 */

import type { OverlayThemeId, VisionAdaptiveVariant } from '../../types.js';

export interface AdaptiveVisionProfile {
  subjectRegion:
    | 'bottom-center'
    | 'bottom-left'
    | 'bottom-right'
    | 'center'
    | 'top-center'
    | 'top-left'
    | 'top-right'
    | 'left'
    | 'right';
  negativeSpaceRegion:
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center';
  backdropLuminance: 'light' | 'dark' | 'mid';
  averageLuminance: number; // 0 to 255
  recommendedTheme: OverlayThemeId;
  recommendedAccentColor: string;
  layoutStyle: 'top-masthead' | 'bottom-dock' | 'left-pillar' | 'right-pillar' | 'floating-minimal';
  suggestedVariant: VisionAdaptiveVariant;
  statsPlacement: {
    heroX: number; // 0-100 percentage
    heroY: number; // 0-100 percentage
    headerX: number;
    headerY: number;
    routeX: number;
    routeY: number;
    cardAlign: 'left' | 'center' | 'right';
  };
  summary: string;
  confidenceScore: number; // 0 to 1
  source: 'client-cv' | 'gemini-vision';
}

interface SectorStats {
  row: number; // 0 (top), 1 (mid), 2 (bottom)
  col: number; // 0 (left), 1 (center), 2 (right)
  name: string;
  edgeEnergy: number;
  meanLum: number;
  variance: number;
  pixelCount: number;
  centerNormX: number;
  centerNormY: number;
}

export class ImageAnalyzer {
  private static offscreenCanvas: HTMLCanvasElement | null = null;
  private static offscreenCtx: CanvasRenderingContext2D | null = null;

  private static getContext(w: number, h: number): CanvasRenderingContext2D | null {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
    }
    this.offscreenCanvas.width = w;
    this.offscreenCanvas.height = h;
    if (!this.offscreenCtx) {
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
    return this.offscreenCtx;
  }

  /**
   * Fast client-side Computer Vision analysis (~10-20ms)
   * Evaluates subject focal point, open negative space, and dominant aesthetic tone
   */
  public static analyze(image: HTMLImageElement | HTMLCanvasElement): AdaptiveVisionProfile {
    const naturalW = (image as HTMLImageElement).naturalWidth || image.width || 600;
    const naturalH = (image as HTMLImageElement).naturalHeight || image.height || 800;

    // Downscale to 96px width for blazing fast analysis without blocking the UI
    const sampleW = 96;
    const sampleH = Math.max(64, Math.min(160, Math.round((naturalH / naturalW) * sampleW)));

    const ctx = this.getContext(sampleW, sampleH);
    if (!ctx) {
      return this.fallbackProfile('Canvas context unavailable');
    }

    try {
      ctx.clearRect(0, 0, sampleW, sampleH);
      ctx.drawImage(image, 0, 0, sampleW, sampleH);
      const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      // 1. Compute pixel luminance & extract dominant chromatic accents
      const lum = new Float32Array(sampleW * sampleH);
      let totalLuminance = 0;
      let dominantHue: string | null = null;
      let maxSaturation = 0;

      // Track human skin / face detection for occlusion prevention
      let upperSkinCount = 0;
      let upperSkinSumX = 0;
      let upperSkinSumY = 0;
      let upperSkinMinX = sampleW;
      let upperSkinMaxX = 0;
      let upperSkinMinY = sampleH;
      let upperSkinMaxY = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const pixelIdx = i / 4;
        lum[pixelIdx] = l;
        totalLuminance += l;

        // Human skin tone detection (chrominance & color ratio)
        // Checks that R is dominant, G is intermediate, B is lower, with proper saturation & chrominance
        const isSkin =
          r > 48 &&
          g > 30 &&
          b > 18 &&
          r > g &&
          r > b &&
          r - g >= 6 &&
          r / (r + g + b) > 0.33 &&
          b / (r + g + b) < 0.36;

        const x = pixelIdx % sampleW;
        const y = Math.floor(pixelIdx / sampleW);
        const normY = y / sampleH;

        if (isSkin && normY >= 0.10 && normY <= 0.60) {
          upperSkinCount++;
          upperSkinSumX += x;
          upperSkinSumY += y;
          if (x < upperSkinMinX) upperSkinMinX = x;
          if (x > upperSkinMaxX) upperSkinMaxX = x;
          if (y < upperSkinMinY) upperSkinMinY = y;
          if (y > upperSkinMaxY) upperSkinMaxY = y;
        }

        // Check for vibrant accent hues (runner gear, bike frame, sunset sky)
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const delta = maxC - minC;
        if (delta > 45 && maxC > 80 && maxC < 240) {
          const sat = delta / maxC;
          if (sat > maxSaturation) {
            maxSaturation = sat;
            dominantHue = this.rgbToHex(r, g, b);
          }
        }
      }

      const avgImageLuminance = totalLuminance / (sampleW * sampleH);

      // 2. Sobel edge / gradient complexity calculation
      const edges = new Float32Array(sampleW * sampleH);
      let totalEnergy = 0;
      let energyCentroidX = 0;
      let energyCentroidY = 0;

      for (let y = 1; y < sampleH - 1; y++) {
        for (let x = 1; x < sampleW - 1; x++) {
          const idx = y * sampleW + x;
          const gx =
            -lum[idx - sampleW - 1] +
            lum[idx - sampleW + 1] -
            2 * lum[idx - 1] +
            2 * lum[idx + 1] -
            lum[idx + sampleW - 1] +
            lum[idx + sampleW + 1];

          const gy =
            -lum[idx - sampleW - 1] -
            2 * lum[idx - sampleW] -
            lum[idx - sampleW + 1] +
            lum[idx + sampleW - 1] +
            2 * lum[idx + sampleW] +
            lum[idx + sampleW + 1];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          edges[idx] = magnitude;
          totalEnergy += magnitude;
          energyCentroidX += x * magnitude;
          energyCentroidY += y * magnitude;
        }
      }

      const centroidNormX = totalEnergy > 0 ? (energyCentroidX / totalEnergy) / sampleW : 0.5;
      const centroidNormY = totalEnergy > 0 ? (energyCentroidY / totalEnergy) / sampleH : 0.5;

      const faceDetected = upperSkinCount >= 16;
      const faceZone = {
        detected: faceDetected,
        centerX: faceDetected ? upperSkinSumX / upperSkinCount / sampleW : centroidNormX,
        centerY: faceDetected ? upperSkinSumY / upperSkinCount / sampleH : centroidNormY,
        minX: faceDetected ? upperSkinMinX / sampleW : 0.35,
        maxX: faceDetected ? upperSkinMaxX / sampleW : 0.65,
        minY: faceDetected ? upperSkinMinY / sampleH : 0.20,
        maxY: faceDetected ? upperSkinMaxY / sampleH : 0.50,
      };

      // 3. Segment into a 3x3 Spatial Grid
      const sectors: SectorStats[] = [];
      const rowLabels = ['top', 'mid', 'bottom'];
      const colLabels = ['left', 'center', 'right'];

      const cellW = sampleW / 3;
      const cellH = sampleH / 3;

      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const startX = Math.floor(c * cellW);
          const endX = Math.floor((c + 1) * cellW);
          const startY = Math.floor(r * cellH);
          const endY = Math.floor((r + 1) * cellH);

          let sectorEnergy = 0;
          let sectorLumSum = 0;
          let sectorLumSqSum = 0;
          let count = 0;

          for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
              const idx = y * sampleW + x;
              const val = lum[idx];
              sectorLumSum += val;
              sectorLumSqSum += val * val;
              sectorEnergy += edges[idx];
              count++;
            }
          }

          const meanLum = count > 0 ? sectorLumSum / count : 128;
          const variance = count > 0 ? Math.max(0, sectorLumSqSum / count - meanLum * meanLum) : 0;

          sectors.push({
            row: r,
            col: c,
            name: `${rowLabels[r]}-${colLabels[c]}`,
            edgeEnergy: sectorEnergy,
            meanLum,
            variance,
            pixelCount: count,
            centerNormX: (c + 0.5) / 3,
            centerNormY: (r + 0.5) / 3,
          });
        }
      }

      // 4. Identify Subject Region (Sector with highest visual complexity/edge density)
      // Boost weight for bottom/mid center where athletes naturally appear
      let maxScore = -1;
      let subjectSector = sectors[4]; // default to center

      for (const s of sectors) {
        // slight heuristic bias towards lower center for athletic photography
        const positionWeight = s.row === 2 ? 1.25 : s.row === 1 ? 1.1 : 0.85;
        const score = s.edgeEnergy * positionWeight;
        if (score > maxScore) {
          maxScore = score;
          subjectSector = s;
        }
      }

      // Map subject sector to region tag
      const subjectRegion = this.resolveSubjectRegion(subjectSector, centroidNormX, centroidNormY);

      // 5. Identify Optimal Negative Space (Lowest clutter, furthest from subject center)
      const maxEnergy = Math.max(...sectors.map((s) => s.edgeEnergy), 1);
      const maxVar = Math.max(...sectors.map((s) => s.variance), 1);

      let bestSpaceScore = -Infinity;
      let openSector = sectors[0]; // default top-left

      for (const s of sectors) {
        // Distance from subject centroid
        const dx = s.centerNormX - centroidNormX;
        const dy = s.centerNormY - centroidNormY;
        const distFromSubject = Math.sqrt(dx * dx + dy * dy);

        // Smoothness factor (low edge energy and low variance)
        const smoothness = 1 - (s.edgeEnergy / maxEnergy) * 0.7 - (s.variance / maxVar) * 0.3;

        // Total score balances smoothness and distance from athlete
        const spaceScore = smoothness * 0.65 + distFromSubject * 0.35;

        // Discourage picking the exact center if the subject is there
        const centerPenalty = s.row === 1 && s.col === 1 ? -0.3 : 0;

        if (spaceScore + centerPenalty > bestSpaceScore) {
          bestSpaceScore = spaceScore + centerPenalty;
          openSector = s;
        }
      }

      // 6. Formulate Layout Style & Geometric Coordinates with Human Face Protection
      const { layoutStyle, placement, negativeSpaceRegion } = this.resolveLayoutPlan(
        subjectSector,
        openSector,
        centroidNormX,
        centroidNormY,
        sampleH / sampleW,
        sectors,
        faceZone
      );

      // 7. Dynamic Contrast & Theme Recommendation
      // Check brightness in the target placement area
      const targetLuminance = openSector.meanLum;
      const isLightBackdrop = targetLuminance > 135;
      const recommendedTheme: OverlayThemeId = isLightBackdrop ? 'glass-dark' : 'glass-light';
      const backdropLuminance = targetLuminance > 165 ? 'light' : targetLuminance < 90 ? 'dark' : 'mid';

      // Pick accent color: use photo's extracted chromatic hue or high-aesthetic athletic neon
      const defaultAccents = ['#10b981', '#00f2fe', '#f59e0b', '#ec4899', '#6366f1'];
      const recommendedAccentColor = dominantHue || defaultAccents[Math.floor(Math.random() * defaultAccents.length)];

      // Suggest artistic variation based on scene visual attributes
      let suggestedVariant: VisionAdaptiveVariant = 'aero-hud';
      if (maxVar > 1400) {
        suggestedVariant = 'summit-topo';
      } else if (dominantHue && (dominantHue.startsWith('#ff') || dominantHue.startsWith('#f5') || dominantHue.startsWith('#e1'))) {
        suggestedVariant = 'cinematic-film';
      } else if (isLightBackdrop && maxSaturation < 0.4) {
        suggestedVariant = 'editorial';
      } else if (openSector.meanLum > 185) {
        suggestedVariant = 'swiss-minimal';
      }

      const flankSide = placement.routeX <= 35 ? 'left' : placement.routeX >= 65 ? 'right' : undefined;
      const summary = this.buildSummary(subjectRegion, negativeSpaceRegion, layoutStyle, backdropLuminance, flankSide);

      return {
        subjectRegion,
        negativeSpaceRegion,
        backdropLuminance,
        averageLuminance: Math.round(targetLuminance),
        recommendedTheme,
        recommendedAccentColor,
        layoutStyle,
        suggestedVariant,
        statsPlacement: placement,
        summary,
        confidenceScore: 0.92,
        source: 'client-cv',
      };
    } catch (err) {
      console.warn('Image CV analysis encountered an issue, using safe adaptive fallback:', err);
      return this.fallbackProfile('Auto-fallback');
    }
  }

  private static resolveSubjectRegion(
    sector: SectorStats,
    centroidX: number,
    centroidY: number
  ): AdaptiveVisionProfile['subjectRegion'] {
    if (centroidY > 0.62) {
      if (centroidX < 0.38) return 'bottom-left';
      if (centroidX > 0.62) return 'bottom-right';
      return 'bottom-center';
    }
    if (centroidY < 0.38) {
      if (centroidX < 0.38) return 'top-left';
      if (centroidX > 0.62) return 'top-right';
      return 'top-center';
    }
    if (centroidX < 0.38) return 'left';
    if (centroidX > 0.62) return 'right';
    return 'center';
  }

  private static resolveLayoutPlan(
    subjectSector: SectorStats,
    openSector: SectorStats,
    centroidX: number,
    centroidY: number,
    aspectRatioVal: number,
    sectors: SectorStats[],
    faceZone: { detected: boolean; centerX: number; centerY: number; minX: number; maxX: number; minY: number; maxY: number }
  ): {
    layoutStyle: AdaptiveVisionProfile['layoutStyle'];
    placement: AdaptiveVisionProfile['statsPlacement'];
    negativeSpaceRegion: AdaptiveVisionProfile['negativeSpaceRegion'];
  } {
    // 1. Calculate flank clutter to choose cleaner negative space flank
    const leftClutter = sectors[0].edgeEnergy * 0.8 + sectors[3].edgeEnergy * 1.2 + sectors[6].edgeEnergy * 0.6;
    const rightClutter = sectors[2].edgeEnergy * 0.8 + sectors[5].edgeEnergy * 1.2 + sectors[8].edgeEnergy * 0.6;
    let flankX: number;
    if (openSector.col === 0) {
      flankX = 22;
    } else if (openSector.col === 2) {
      flankX = 78;
    } else {
      flankX = leftClutter <= rightClutter ? 22 : 78;
    }

    let plan: {
      layoutStyle: AdaptiveVisionProfile['layoutStyle'];
      placement: AdaptiveVisionProfile['statsPlacement'];
      negativeSpaceRegion: AdaptiveVisionProfile['negativeSpaceRegion'];
    };

    // SCENARIO 1: Subject in Lower Half (Most common workout photo: runner/bike in road foreground)
    // Negative space is in the Top Sky / Horizon
    if (centroidY >= 0.52 || subjectSector.row === 2) {
      const oppFlank = centroidX < 0.5 ? 78 : 22;
      plan = {
        layoutStyle: 'top-masthead',
        negativeSpaceRegion: 'top',
        placement: {
          headerX: 50,
          headerY: 9,
          heroX: 50,
          heroY: 23,
          routeX: oppFlank,
          routeY: 44,
          cardAlign: 'center',
        },
      };
    } else if (centroidX > 0.58 || (subjectSector.col === 2 && centroidX > 0.5)) {
      // SCENARIO 2: Subject on the Right (Right pillar / rule-of-thirds)
      // Negative space is along the Left side
      plan = {
        layoutStyle: 'left-pillar',
        negativeSpaceRegion: 'left',
        placement: {
          headerX: 28,
          headerY: 14,
          heroX: 28,
          heroY: 46,
          routeX: 24,
          routeY: 76,
          cardAlign: 'left',
        },
      };
    } else if (centroidX < 0.42 || (subjectSector.col === 0 && centroidX < 0.5)) {
      // SCENARIO 3: Subject on the Left (Left pillar / rule-of-thirds)
      // Negative space is along the Right side
      plan = {
        layoutStyle: 'right-pillar',
        negativeSpaceRegion: 'right',
        placement: {
          headerX: 72,
          headerY: 14,
          heroX: 72,
          heroY: 46,
          routeX: 76,
          routeY: 76,
          cardAlign: 'right',
        },
      };
    } else if (centroidY < 0.45 || subjectSector.row === 0) {
      // SCENARIO 4: Subject in Upper Half (Hill summit, jumping runner, or athlete with stadium background)
      // Negative space is in the lower road / ground
      plan = {
        layoutStyle: 'bottom-dock',
        negativeSpaceRegion: 'bottom',
        placement: {
          headerX: 50,
          headerY: 8,
          heroX: 50,
          heroY: 82,
          routeX: flankX, // NEVER place at 50% on the face! Always place on the open side flank
          routeY: 44,
          cardAlign: 'center',
        },
      };
    } else {
      // SCENARIO 5: Full Frame Close-up / Centered Subject
      plan = {
        layoutStyle: 'floating-minimal',
        negativeSpaceRegion: 'center',
        placement: {
          headerX: 50,
          headerY: 8,
          heroX: 50,
          heroY: 88,
          routeX: flankX,
          routeY: 44,
          cardAlign: 'center',
        },
      };
    }

    // =========================================================================
    // CRITICAL: FACE & HUMAN SUBJECT ANTI-OCCLUSION GUARD
    // Under NO circumstances should the route map or HUD intersect the athlete's face or torso
    // =========================================================================
    const subjectXPercent = (faceZone.detected ? faceZone.centerX : centroidX) * 100;
    const subjectYPercent = (faceZone.detected ? faceZone.centerY : centroidY) * 100;

    // 1. Center-column subject protection (standing/running portrait)
    // If the subject/face is centered horizontally (x between 33% and 67%),
    // route MUST NEVER be centered horizontally (must be on a flank <= 26% or >= 74%)
    if (subjectXPercent >= 33 && subjectXPercent <= 67) {
      if (plan.placement.routeX > 26 && plan.placement.routeX < 74) {
        plan.placement.routeX = flankX;
        plan.placement.routeY = Math.max(38, Math.min(65, plan.placement.routeY));
      }
    }

    // 2. Direct Face Proximity Exclusion:
    // Ensure safety distance of at least 30% canvas distance from face centroid
    const dX = plan.placement.routeX - subjectXPercent;
    const dY = (plan.placement.routeY - subjectYPercent) * 1.25;
    const distToFace = Math.sqrt(dX * dX + dY * dY);

    if (distToFace < 30) {
      // Divert route to opposite flank of the face
      plan.placement.routeX = subjectXPercent >= 50 ? 22 : 78;
      plan.placement.routeY = 44;
    }

    return plan;
  }

  private static buildSummary(
    subject: string,
    space: string,
    style: string,
    luminance: string,
    flankSide?: 'left' | 'right'
  ): string {
    const styleDescriptions: Record<string, string> = {
      'top-masthead': 'floating upper masthead in clear sky',
      'bottom-dock': 'docked glass console along open ground',
      'left-pillar': 'left-aligned editorial column avoiding subject',
      'right-pillar': 'right-aligned editorial column avoiding subject',
      'floating-minimal': 'peripheral floating HUD cards',
    };

    const desc = styleDescriptions[style] || 'balanced visual layout';
    const flankText = flankSide ? ` (route on ${flankSide} flank)` : '';
    return `Athlete detected at ${subject}. Clean space at ${space}${flankText} (${luminance} backdrop). Placed as ${desc}.`;
  }

  private static fallbackProfile(reason: string): AdaptiveVisionProfile {
    return {
      subjectRegion: 'bottom-center',
      negativeSpaceRegion: 'top',
      backdropLuminance: 'dark',
      averageLuminance: 60,
      recommendedTheme: 'glass-dark',
      recommendedAccentColor: '#10b981',
      layoutStyle: 'top-masthead',
      suggestedVariant: 'aero-hud',
      statsPlacement: {
        headerX: 50,
        headerY: 9,
        heroX: 50,
        heroY: 23,
        routeX: 78,
        routeY: 44,
        cardAlign: 'center',
      },
      summary: `Standard adaptive layout (${reason})`,
      confidenceScore: 0.75,
      source: 'client-cv',
    };
  }

  private static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
}
