/**
 * RunCraft In-Memory Storage Adapter
 * For local dev, offline simulation, and testing
 */

import type { StorageAdapter, StateStore, EntityStore } from './adapter.js';
import type { WorkoutActivity } from '../types.js';

export class MemoryStateStore implements StateStore {
  private map = new Map<string, { value: any; expiresAt?: number }>();

  async get<T = string>(key: string): Promise<T | null> {
    const item = this.map.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.map.delete(key);
      return null;
    }
    return item.value as T;
  }

  async getMany<T = string>(keys: string[]): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    for (const key of keys) {
      results[key] = await this.get<T>(key);
    }
    return results;
  }

  async set<T = string>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.map.set(key, { value, expiresAt });
  }

  async setMany<T = string>(entries: Record<string, T>, ttlSeconds?: number): Promise<void> {
    for (const [key, val] of Object.entries(entries)) {
      await this.set(key, val, ttlSeconds);
    }
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

export class MemoryActivityStore implements EntityStore<WorkoutActivity> {
  private activities = new Map<string, WorkoutActivity>();

  async ensureSchema(): Promise<void> {
    // No-op for in-memory
  }

  async getById(id: string): Promise<WorkoutActivity | null> {
    return this.activities.get(id) || null;
  }

  async getRecent(limit = 20, offset = 0): Promise<WorkoutActivity[]> {
    const all = Array.from(this.activities.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return all.slice(offset, offset + limit);
  }

  async save(activity: WorkoutActivity): Promise<void> {
    this.activities.set(activity.id, activity);
  }

  async saveBatch(activities: WorkoutActivity[]): Promise<void> {
    for (const act of activities) {
      this.activities.set(act.id, act);
    }
  }

  async delete(id: string): Promise<void> {
    this.activities.delete(id);
  }
}

export class MemoryStorageAdapter implements StorageAdapter {
  public state: StateStore;
  public activities: EntityStore<WorkoutActivity>;

  constructor() {
    this.state = new MemoryStateStore();
    this.activities = new MemoryActivityStore();
  }
}
