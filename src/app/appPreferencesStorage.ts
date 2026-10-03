/** The part of the Web Storage API the app preferences need. `localStorage` satisfies it. */
export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

/** One versioned record for app preferences (D-35); separate from the DemoAdapter state key. */
export const APP_PREFERENCES_KEY = "banking-shell:app-preferences:v1";
const VERSION = 1;

export type AppPreferences = { biometricLoginEnabled: boolean };
const DEFAULTS: AppPreferences = { biometricLoginEnabled: false };

/** Browser `localStorage`; in-memory storage where it does not exist or is blocked. */
export function defaultPreferenceStorage(): PreferenceStorage {
  try {
    const storage: PreferenceStorage | undefined = globalThis.localStorage;
    if (storage) {
      return storage;
    }
  } catch {
    // Access can throw when storage is disabled; fall back to memory.
  }
  const items = new Map<string, string>();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
}

/** Missing, malformed or other-version data reads as the defaults: biometric login off. */
export function loadAppPreferences(storage: PreferenceStorage): AppPreferences {
  try {
    const raw = storage.getItem(APP_PREFERENCES_KEY);
    const parsed: unknown = raw === null ? null : JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      parsed.version === VERSION &&
      "biometricLoginEnabled" in parsed &&
      typeof parsed.biometricLoginEnabled === "boolean"
    ) {
      return { biometricLoginEnabled: parsed.biometricLoginEnabled };
    }
  } catch {
    // fall through to defaults
  }
  return { ...DEFAULTS };
}

export function saveAppPreferences(storage: PreferenceStorage, preferences: AppPreferences): void {
  try {
    storage.setItem(APP_PREFERENCES_KEY, JSON.stringify({ version: VERSION, ...preferences }));
  } catch {
    // Quota or private mode: the preference still applies for this page.
  }
}
