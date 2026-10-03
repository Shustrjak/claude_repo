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
  getSimCards: true,
  bindSim: true,
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

    it("lists SIM slots as { id, slot } only and binds only listed ones", async () => {
      const device = create();
      const sims = await device.getSimCards();
      expect(new Set(sims.map((sim) => sim.id)).size).toBe(sims.length);
      for (const sim of sims) {
        expect(Object.keys(sim).sort()).toEqual(["id", "slot"]);
        expect(["bound", "not_bound"]).toContain(await device.bindSim(sim.id));
      }
      expect(await device.bindSim("sim-unknown")).toBe("not_bound");
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
      for (const sim of await device.getSimCards()) {
        await device.bindSim(sim.id);
      }
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

describe("DemoDeviceAdapter SIM", () => {
  it("offers no, one or two SIM slots as configured, the same on every call", async () => {
    const expected = {
      0: [],
      1: [{ id: "sim-1", slot: 1 }],
      2: [
        { id: "sim-1", slot: 1 },
        { id: "sim-2", slot: 2 },
      ],
    } as const;
    for (const simCount of [0, 1, 2] as const) {
      const device = new DemoDeviceAdapter({ simCount });
      expect(await device.getSimCards()).toEqual(expected[simCount]);
      expect(await device.getSimCards()).toEqual(expected[simCount]);
    }
  });

  it("defaults to two SIM slots that bind", async () => {
    const device = new DemoDeviceAdapter();
    expect(await device.getSimCards()).toHaveLength(2);
    expect(await device.bindSim("sim-2")).toBe("bound");
  });

  it("binds a listed SIM per configuration and never an unlisted one", async () => {
    expect(await new DemoDeviceAdapter({ simBinding: "fails" }).bindSim("sim-1")).toBe("not_bound");
    expect(await new DemoDeviceAdapter({ simCount: 1 }).bindSim("sim-2")).toBe("not_bound");
    expect(await new DemoDeviceAdapter({ simCount: 0 }).bindSim("sim-1")).toBe("not_bound");
  });

  it("hands out copies, so callers cannot change its SIM list", async () => {
    const device = new DemoDeviceAdapter({ simCount: 1 });
    const [first] = await device.getSimCards();
    if (first) first.slot = 9;
    expect(await device.getSimCards()).toEqual([{ id: "sim-1", slot: 1 }]);
  });
});

describe("NullDeviceAdapter", () => {
  it("reports biometrics unavailable and cannot fabricate a verification", async () => {
    const device = new NullDeviceAdapter();
    expect(await device.isBiometricAvailable()).toBe(false);
    expect(await device.verifyBiometric()).toBe("not_verified");
  });

  it("offers no SIM and binds nothing", async () => {
    const device: DeviceCapabilityAdapter = new NullDeviceAdapter();
    expect(await device.getSimCards()).toEqual([]);
    expect(await device.bindSim("sim-1")).toBe("not_bound");
  });
});
