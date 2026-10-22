/**
 * System & Telemetry Routes
 */

import { Router } from './router.js';
import { CONFIG, getSiteBaseUrl, getExecutionLimits } from '../config.js';

export const systemRouter = new Router();

systemRouter.get('/health', (_req, env) => {
  return Router.json({
    status: 'ok',
    app: CONFIG.APP.NAME,
    version: CONFIG.APP.VERSION,
    timestamp: new Date().toISOString(),
    environment: env.ENVIRONMENT || 'development',
    siteUrl: getSiteBaseUrl(env),
  });
});

systemRouter.get('/telemetry', (_req, env) => {
  const limits = getExecutionLimits(env);
  return Router.json({
    app: CONFIG.APP.NAME,
    version: CONFIG.APP.VERSION,
    limits,
    supportedAspectRatios: ['9:16', '4:5', '1:1', '16:9'],
    themes: ['glass-dark', 'glass-light', 'neon-cyber', 'swiss-minimal', 'retro-lcd'],
  });
});
