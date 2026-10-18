/**
 * Phase-1 mock database.
 *
 * A single in-memory store, persisted to localStorage so edits survive a
 * reload inside Telegram. Nothing outside `lib/api/*` should import this —
 * when the NestJS backend lands, only those service modules change.
 */

import type { Certificate, CropCycle, Farmer, Order, Plot } from "./types";
import {
  SEED_CERTIFICATES,
  SEED_CROP_CYCLES,
  SEED_FARMERS,
  SEED_ORDERS,
  SEED_PLOTS,
} from "./mock/seed";

export interface DbShape {
  farmers: Farmer[];
  certificates: Certificate[];
  plots: Plot[];
  cropCycles: CropCycle[];
  orders: Order[];
}

// Bump this whenever DbShape's contents change shape (fields added/removed,
// renamed, or restructured on Farmer/Plot/CropCycle/Order/etc). Old data
// saved under a previous key is simply ignored — it does NOT get migrated —
// so a device with stale data always falls back to a fresh, correctly-shaped
// seed instead of the app rendering half-shaped records and breaking.
const STORAGE_KEY = "argtech.field-agent.v11";

function seed(): DbShape {
  return {
    farmers: structuredClone(SEED_FARMERS),
    certificates: structuredClone(SEED_CERTIFICATES),
    plots: structuredClone(SEED_PLOTS),
    cropCycles: structuredClone(SEED_CROP_CYCLES),
    orders: structuredClone(SEED_ORDERS),
  };
}

let state: DbShape | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

function load(): DbShape {
  if (state) return state;
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DbShape>;
        const fresh = seed();
        state = {
          farmers: parsed.farmers ?? fresh.farmers,
          certificates: parsed.certificates ?? fresh.certificates,
          plots: parsed.plots ?? fresh.plots,
          cropCycles: parsed.cropCycles ?? fresh.cropCycles,
          orders: parsed.orders ?? fresh.orders,
        };
        return state;
      }
    } catch {
      // Corrupt payload — fall through to a clean seed.
    }
  }
  state = seed();
  return state;
}

function persist() {
  if (!isBrowser() || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked — the in-memory copy still works for this session.
  }
}

export function getState(): DbShape {
  return load();
}

/** Applies a change, persists it, and wakes every subscribed screen. */
export function mutate<T>(fn: (db: DbShape) => T): T {
  const db = load();
  const result = fn(db);
  persist();
  listeners.forEach((l) => l());
  return result;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Wipes local edits and restores the demo dataset. */
export function resetDatabase() {
  state = seed();
  persist();
  listeners.forEach((l) => l());
}

/** Small artificial latency so loading states are exercised like a real API. */
export function delay<T>(value: T, ms = 90): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = "NotFoundError";
  }
}

/**
 * A change that is well-formed but would leave the data inconsistent (selling
 * more than was picked, deleting produce that already shipped…). The message is
 * written for the agent and is shown as-is.
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
