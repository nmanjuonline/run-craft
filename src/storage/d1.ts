/**
 * RunCraft Cloudflare D1 Storage Adapter
 * Strictly respects the D1 90-statement batch execution limit
 */

import type { StorageAdapter, StateStore, EntityStore } from './adapter.js';
import type { WorkoutActivity } from '../types.js';
import { CONFIG } from '../config.js';

export class D1StateStore implements StateStore {
  constructor(private db: any) {}

  async get<T = string>(key: string): Promise<T | null> {
    const res = await this.db
      .prepare('SELECT value, expires_at FROM rc_state WHERE key = ?')
      .bind(key)
      .first();

    if (!res) return null;
    if (res.expires_at && Date.now() > res.expires_at) {
      await this.delete(key);
      return null;
    }
    try {
      return JSON.parse(res.value) as T;
    } catch {
      return res.value as T;
    }
  }

  async getMany<T = string>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    for (const key of keys) {
      results[key] = await this.get<T>(key);
    }
    return results;
  }

  async set<T = string>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    await this.db
      .prepare('INSERT OR REPLACE INTO rc_state (key, value, expires_at) VALUES (?, ?, ?)')
      .bind(key, strVal, expiresAt)
      .run();
  }

  async setMany<T = string>(entries: Record<string, T>, ttlSeconds?: number): Promise<void> {
    const stmts: any[] = [];
    const entriesList = Object.entries(entries);

    // Slice into chunks <= 90 statements per D1 limit
    for (let i = 0; i < entriesList.length; i += CONFIG.LIMITS.D1_BATCH_MAX_STATEMENTS) {
      const chunk = entriesList.slice(i, i + CONFIG.LIMITS.D1_BATCH_MAX_STATEMENTS);
      const batch = chunk.map(([key, val]) => {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        const strVal = typeof val === 'string' ? val : JSON.stringify(val);
        return this.db
          .prepare('INSERT OR REPLACE INTO rc_state (key, value, expires_at) VALUES (?, ?, ?)')
          .bind(key, strVal, expiresAt);
      });
      await this.db.batch(batch);
    }
  }

  async delete(key: string): Promise<void> {
    await this.db.prepare('DELETE FROM rc_state WHERE key = ?').bind(key).run();
  }
}

export class D1ActivityStore implements EntityStore<WorkoutActivity> {
  constructor(private db: any) {}

  async ensureSchema(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS rc_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS rc_activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        sport_type TEXT NOT NULL,
        date TEXT NOT NULL,
        data_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
  }

  async getById(id: string): Promise<WorkoutActivity | null> {
    const res = await this.db
      .prepare('SELECT data_json FROM rc_activities WHERE id = ?')
      .bind(id)
      .first();
    if (!res) return null;
    return JSON.parse(res.data_json);
  }

  async getRecent(limit = 20, offset = 0): Promise<WorkoutActivity[]> {
    const res = await this.db
      .prepare('SELECT data_json FROM rc_activities ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .bind(limit, offset)
      .all();
    if (!res?.results) return [];
    return res.results.map((r: any) => JSON.parse(r.data_json));
  }

  async save(activity: WorkoutActivity): Promise<void> {
    const json = JSON.stringify(activity);
    await this.db
      .prepare(
        'INSERT OR REPLACE INTO rc_activities (id, title, sport_type, date, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(
        activity.id,
        activity.title,
        activity.sportType,
        activity.date,
        json,
        Date.now()
      )
      .run();
  }

  async saveBatch(activities: WorkoutActivity[]): Promise<void> {
    for (let i = 0; i < activities.length; i += CONFIG.LIMITS.D1_BATCH_MAX_STATEMENTS) {
      const chunk = activities.slice(i, i + CONFIG.LIMITS.D1_BATCH_MAX_STATEMENTS);
      const batch = chunk.map((act) => {
        const json = JSON.stringify(act);
        return this.db
          .prepare(
            'INSERT OR REPLACE INTO rc_activities (id, title, sport_type, date, data_json, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(act.id, act.title, act.sportType, act.date, json, Date.now());
      });
      await this.db.batch(batch);
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM rc_activities WHERE id = ?').bind(id).run();
  }
}

export class D1StorageAdapter implements StorageAdapter {
  public state: StateStore;
  public activities: EntityStore<WorkoutActivity>;

  constructor(db: any) {
    this.state = new D1StateStore(db);
    this.activities = new D1ActivityStore(db);
  }
}
