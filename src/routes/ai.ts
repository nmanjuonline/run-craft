/**
 * RunCraft Edge AI Scene Analyzer
 * Multimodal Gemini Vision route for intelligent workout photo composition
 */

import { Router } from './router.js';
import type { Env } from '../types.js';

export const aiRouter = new Router();

interface AnalyzeSceneRequest {
  imageBase64?: string;
  sportType?: string;
  userApiKey?: string;
}

aiRouter.post('/analyze-scene', async (req, env: Env) => {
  try {
    const body = (await req.json().catch(() => null)) as AnalyzeSceneRequest | null;
    if (!body || !body.imageBase64) {
      return Router.json({ error: 'Missing imageBase64 payload' }, { status: 400 });
    }

    const apiKey =
      body.userApiKey ||
      (env as any)?.GEMINI_API_KEY ||
      (globalThis as any).process?.env?.GEMINI_API_KEY ||
      '';

    if (!apiKey) {
      return Router.json({
        fallback: true,
        message: 'No Gemini API key configured. Use client-side CV or provide an API key.',
      });
    }

    // Clean base64 string
    let mimeType = 'image/jpeg';
    let rawBase64 = body.imageBase64;
    const match = body.imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      rawBase64 = match[2];
    }

    const systemPrompt = `You are an elite sports art director and visual graphic designer for Nike, Strava, and Tracksmith.
Analyze the provided athlete photo to determine the ideal placement for workout telemetry statistics (Distance, Pace, Time, Elevation, Route Map).

Your goal:
1. Identify where the athlete/focal point is (runner, cyclist, face, body, barbell, trail).
2. Identify the cleanest "negative space" (sky, calm water, shadow, empty road) so stats DO NOT block or crowd the athlete.
3. Recommend layoutStyle:
   - "top-masthead": Athlete in lower-half/road, open sky at top. Stats float horizontally in upper third.
   - "bottom-dock": Athlete in upper-half/summit, open road/ground at bottom. Stats dock along bottom.
   - "left-pillar": Athlete is on the right side. Stats stack in a sleek vertical column on the left.
   - "right-pillar": Athlete is on the left side. Stats stack in a sleek vertical column on the right.
   - "floating-minimal": Athlete centered or filling frame. Minimalist floating HUD badges in open corners.
4. Extract a vibrant accent color from the image (e.g. runner's kit, shoes, sunrise glow) in hex format (#rrggbb).

Return strictly JSON matching this structure:
{
  "subjectRegion": "bottom-center" | "bottom-left" | "bottom-right" | "center" | "top-center" | "left" | "right",
  "negativeSpaceRegion": "top" | "bottom" | "left" | "right" | "top-left" | "top-right",
  "backdropLuminance": "light" | "dark" | "mid",
  "recommendedTheme": "glass-dark" | "glass-light",
  "recommendedAccentColor": "#10b981",
  "layoutStyle": "top-masthead" | "bottom-dock" | "left-pillar" | "right-pillar" | "floating-minimal",
  "statsPlacement": {
    "heroX": 50,
    "heroY": 23,
    "headerX": 50,
    "headerY": 9,
    "routeX": 75,
    "routeY": 42,
    "cardAlign": "center"
  },
  "summary": "1 concise sentence describing where the athlete is and why the stats were placed there."
}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: rawBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini API request failed:', response.status, errText);
      return Router.json(
        {
          fallback: true,
          error: `Gemini API returned status ${response.status}`,
          details: errText,
        },
        { status: 200 }
      );
    }

    const data: any = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return Router.json({ fallback: true, error: 'Empty response from Gemini' });
    }

    const parsed = JSON.parse(candidateText);
    parsed.source = 'gemini-vision';
    parsed.confidenceScore = 0.98;

    return Router.json({
      success: true,
      profile: parsed,
    });
  } catch (err: any) {
    console.error('Error in /api/ai/analyze-scene:', err);
    return Router.json({ fallback: true, error: err.message }, { status: 500 });
  }
});
