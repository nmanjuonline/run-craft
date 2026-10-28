/**
 * RunCraft Edge Application Entrypoint
 * Under 60 lines, delegates fetch handling to modular appRouter
 * Edge-First Serverless Application Architecture
 */

import { Router } from './routes/router.js';
import { systemRouter } from './routes/system.js';
import { stravaRouter } from './routes/strava.js';
import { activitiesRouter } from './routes/activities.js';
import { parserRouter } from './routes/parser.js';
import { intervalsRouter } from './routes/intervals.js';
import { aiRouter } from './routes/ai.js';
import type { Env } from './types.js';

export const appRouter = new Router();

// Mount Domain Sub-Routers
appRouter.mount('/api/system', systemRouter);
appRouter.mount('/api/strava', stravaRouter);
appRouter.mount('/api/activities', activitiesRouter);
appRouter.mount('/api/parser', parserRouter);
appRouter.mount('/api/intervals', intervalsRouter);
appRouter.mount('/api/ai', aiRouter);

// Fallback Edge Worker Handler
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return appRouter.handle(request, env);
  },
};
