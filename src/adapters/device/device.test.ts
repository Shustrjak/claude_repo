import { afterEach, describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../banking/BankingAdapter";
import { BANKING_ADAPTER_METHODS } from "../banking/testing/fixtures";
import { DemoDeviceAdapter } from "./DemoDeviceAdapter";
import type { DeviceCapabilityAdapter } from "./DeviceCapabilityAdapter";
import { NullDeviceAdapter } from "./NullDeviceAdapter";

/** All device operations; `satisfies` fails to compile if one is missing or extra. */
const DEVICE_METHODS = {
  isBiometricAvailable: true,
  verifyBiometric: true,
} as const satisfies Record<keyof DeviceCapabilityAdapter, true>;

// Compile-time: the two boundaries share no operation.
const disjoint: [Extract<keyof BankingAdapter, keyof DeviceCapabilityAdapter>] extends [never] ? true : false = true;

const subjects: [string, () => DeviceCapabilityAdapter][] = [
  ["NullDeviceAdapter", () => new NullDeviceAdapter()],
  ["DemoDeviceAdapter (verifies)", () => new DemoDeviceAdapter({ biometric: "verifies" })],
  ["DemoDeviceAdapter (rejects)", () => new DemoDeviceAdapter({ biometric: "rejects" })],
  ["DemoDeviceAdapter (unavailable)", () => new DemoDeviceAdapter({ biometric: "unavailable" })],
];

function stubHardwareAndStorage() {
  const credentials = { get: vi.fn(), create: vi.fn() };
  const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
  const fetch = vi.fn();
  vi.stubGlobal("navigator", { credentials });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  vi.stubGlobal("fetch", fetch);
  return () => {
    expect(credentials.get).not.toHaveBeenCalled();
    expect(credentials.create).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

for (const [name, create] of subjects) {
  describe(`DeviceCapabilityAdapter contract: ${name}`, () => {
    it("exposes exactly the device operations and no banking operation", () => {
      expect(disjoint).toBe(true);
      const device = create();
      for (const method of Object.keys(DEVICE_METHODS)) {
        expect(typeof Reflect.get(device, method)).toBe("function");
      }
      for (const method of Object.keys(BANKING_ADAPTER_METHODS)) {
        expect(method in device).toBe(false);
      }
    });

    it("answers with the device result shapes and never throws", async () => {
      const device = create();
      expect(typeof (await device.isBiometricAvailable())).toBe("boolean");
      expect(["verified", "not_verified"]).toContain(await device.verifyBiometric());
    });

    it("never verifies biometrics it reports as unavailable", async () => {
      const device = create();
      if (!(await device.isBiometricAvailable())) {
        expect(await device.verifyBiometric()).toBe("not_verified");
      }
    });

    it("touches no hardware API, storage or network", async () => {
      const verifyUntouched = stubHardwareAndStorage();
      const device = create();
      await device.isBiometricAvailable();
      await device.verifyBiometric();
      verifyUntouched();
    });
  });
}

describe("DemoDeviceAdapter", () => {
  it("simulates each configured outcome deterministically", async () => {
    const cases = [
      ["verifies", true, "verified"],
      ["rejects", true, "not_verified"],
      ["unavailable", false, "not_verified"],
    ] as const;
    for (const [biometric, available, verification] of cases) {
      const device = new DemoDeviceAdapter({ biometric });
      for (let i = 0; i < 3; i += 1) {
        expect(await device.isBiometricAvailable()).toBe(available);
        expect(await device.verifyBiometric()).toBe(verification);
      }
    }
  });

  it("defaults to available biometrics that verify", async () => {
    const device = new DemoDeviceAdapter();
    expect(await device.isBiometricAvailable()).toBe(true);
    expect(await device.verifyBiometric()).toBe("verified");
  });
});

describe("NullDeviceAdapter", () => {
  it("reports biometrics unavailable and cannot fabricate a verification", async () => {
    const device = new NullDeviceAdapter();
    expect(await device.isBiometricAvailable()).toBe(false);
    expect(await device.verifyBiometric()).toBe("not_verified");
  });
});
