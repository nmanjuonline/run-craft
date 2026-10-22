/**
 * RunCraft Storage Contracts
 * Edge-First Serverless Application Architecture
 */

import type { WorkoutActivity } from '../types.js';

export interface StateStore {
  get<T = string>(key: string): Promise<T | null>;
  getMany<T = string>(keys: string[]): Promise<Record<string, T | null>>;
  set<T = string>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  setMany<T = string>(entries: Record<string, T>, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface EntityStore<T> {
  ensureSchema(): Promise<void>;
  getById(id: string): Promise<T | null>;
  getRecent(limit?: number, offset?: number): Promise<T[]>;
  save(entity: T): Promise<void>;
  saveBatch(entities: T[]): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface StorageAdapter {
  state: StateStore;
  activities: EntityStore<WorkoutActivity>;
}
