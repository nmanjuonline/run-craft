/**
 * RunCraft Storage Factory with WeakMap Instance Memoization
 */

import type { Env } from '../types.js';
import type { StorageAdapter } from './adapter.js';
import { MemoryStorageAdapter } from './memory.js';
import { D1StorageAdapter } from './d1.js';
import { getStorageConfig } from '../config.js';

// Memoize storage adapters per Env reference to avoid recreating pools
const storageCache = new WeakMap<object, StorageAdapter>();
let defaultMemoryAdapter: MemoryStorageAdapter | null = null;

export function getStorage(env?: Env): StorageAdapter {
  if (!env || typeof env !== 'object') {
    if (!defaultMemoryAdapter) {
      defaultMemoryAdapter = new MemoryStorageAdapter();
    }
    return defaultMemoryAdapter;
  }

  const cached = storageCache.get(env);
  if (cached) return cached;

  const storageConfig = getStorageConfig(env);
  let adapter: StorageAdapter;

  if (storageConfig.engine === 'd1' && env.DB) {
    adapter = new D1StorageAdapter(env.DB);
  } else {
    adapter = new MemoryStorageAdapter();
  }

  storageCache.set(env, adapter);
  return adapter;
}
