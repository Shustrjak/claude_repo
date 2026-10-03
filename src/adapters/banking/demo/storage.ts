import { isDemoState, type DemoState } from "./state";

/** The part of the Web Storage API DemoAdapter needs. `localStorage` satisfies it. */
export type DemoStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const DEMO_STORAGE_KEY = "banking-shell:demo-adapter:v1";
export const DEMO_STATE_VERSION = 1;

type Envelope = { version: number; state: DemoState };

/** Browser `localStorage`; in-memory storage where it does not exist (tests, Node). */
export function defaultDemoStorage(): DemoStorage {
  try {
    const storage: DemoStorage | undefined = globalThis.localStorage;
    if (storage) {
      return storage;
    }
  } catch {
    // Access can throw when storage is disabled; fall back to memory.
  }
  return createMemoryStorage();
}

export function createMemoryStorage(): DemoStorage {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

/** Returns the stored state, or null when it is missing, malformed or from another version. */
export function loadDemoState(storage: DemoStorage): DemoState | null {
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== DEMO_STATE_VERSION ||
      !("state" in parsed) ||
      !isDemoState(parsed.state)
    ) {
      return null;
    }
    return parsed.state;
  } catch {
    return null;
  }
}

export function saveDemoState(storage: DemoStorage, state: DemoState): void {
  const envelope: Envelope = { version: DEMO_STATE_VERSION, state };
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Quota or private mode: the demo keeps working in memory for this page.
  }
}
