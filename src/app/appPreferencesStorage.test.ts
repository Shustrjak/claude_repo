import { describe, expect, it } from "vitest";
import { DEMO_STORAGE_KEY } from "../adapters/banking/demo/storage";
import { APP_PREFERENCES_KEY, loadAppPreferences, saveAppPreferences, type PreferenceStorage } from "./appPreferencesStorage";

function memory(initial?: string): PreferenceStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  if (initial !== undefined) items.set(APP_PREFERENCES_KEY, initial);
  return { items, getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
}

describe("app preferences storage (D-35)", () => {
  it("defaults biometric login to off", () => {
    expect(loadAppPreferences(memory())).toEqual({ biometricLoginEnabled: false });
  });

  it("round-trips true and false in one versioned record", () => {
    const storage = memory();
    saveAppPreferences(storage, { biometricLoginEnabled: true });
    expect(JSON.parse(storage.items.get(APP_PREFERENCES_KEY) ?? "null")).toEqual({ version: 1, biometricLoginEnabled: true });
    expect(loadAppPreferences(storage)).toEqual({ biometricLoginEnabled: true });
    saveAppPreferences(storage, { biometricLoginEnabled: false });
    expect(loadAppPreferences(storage)).toEqual({ biometricLoginEnabled: false });
  });

  it.each([
    ["malformed JSON", "{oops"],
    ["a wrong shape", JSON.stringify({ version: 1, biometricLoginEnabled: "yes" })],
    ["another version", JSON.stringify({ version: 2, biometricLoginEnabled: true })],
  ])("reads %s as off", (_label, raw) => {
    expect(loadAppPreferences(memory(raw))).toEqual({ biometricLoginEnabled: false });
  });

  it("survives a storage that throws", () => {
    const broken: PreferenceStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
    };
    expect(loadAppPreferences(broken)).toEqual({ biometricLoginEnabled: false });
    expect(() => saveAppPreferences(broken, { biometricLoginEnabled: true })).not.toThrow();
  });

  it("is a different record from the DemoAdapter state", () => {
    expect(APP_PREFERENCES_KEY).not.toBe(DEMO_STORAGE_KEY);
  });
});
