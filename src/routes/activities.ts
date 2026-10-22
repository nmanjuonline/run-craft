/**
 * Activities Domain Sub-Router
 * Handles presets, saving activities, and querying stored workouts
 */

import { Router } from './router.js';
import { getStorage } from '../storage/index.js';
import { MOCK_ACTIVITIES } from '../sources/mockData.js';
import type { WorkoutActivity } from '../types.js';

export const activitiesRouter = new Router();

/**
 * Get preset/sample workouts
 */
activitiesRouter.get('/presets', () => {
  return Router.json({ presets: MOCK_ACTIVITIES });
});

/**
 * List recent stored workouts
 */
activitiesRouter.get('/', async (_req, env, _params, url) => {
  const storage = getStorage(env);
  const limit = parseInt(url.searchParams.get('limit') || '20', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const stored = await storage.activities.getRecent(limit, offset);
  if (stored.length === 0) {
    // Return sample presets if storage is empty
    return Router.json({ activities: MOCK_ACTIVITIES });
  }
  return Router.json({ activities: stored });
});

/**
 * Get workout by ID
 */
activitiesRouter.get('/:id', async (_req, env, params) => {
  const storage = getStorage(env);
  const activity = await storage.activities.getById(params.id);
  if (activity) {
    return Router.json({ activity });
  }
  // Check mock presets
  const mock = MOCK_ACTIVITIES.find((a) => a.id === params.id);
  if (mock) {
    return Router.json({ activity: mock });
  }
  return Router.json({ error: 'Activity not found' }, { status: 404 });
});

/**
 * Save workout activity to storage
 */
activitiesRouter.post('/', async (req, env) => {
  const body = (await req.json().catch(() => null)) as WorkoutActivity;
  if (!body || !body.id || !body.title) {
    return Router.json({ error: 'Invalid workout activity payload' }, { status: 400 });
  }

  const storage = getStorage(env);
  await storage.activities.save(body);
  return Router.json({ success: true, activity: body });
});
