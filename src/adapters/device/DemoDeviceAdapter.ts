import type { BiometricVerification, DeviceCapabilityAdapter, SimBinding, SimCard } from "./DeviceCapabilityAdapter";

export type DemoDeviceOptions = {
  /** `unavailable`, or available with a fixed outcome for every challenge. Default: `verifies`. */
  biometric?: "verifies" | "rejects" | "unavailable";
  /** How many SIM slots the device offers: 0, 1 or 2. Default: 2. */
  simCount?: 0 | 1 | 2;
  /** Fixed outcome of binding a known SIM. Default: `binds`. */
  simBinding?: "binds" | "fails";
};

const DEMO_SIMS: readonly SimCard[] = [
  { id: "sim-1", slot: 1 },
  { id: "sim-2", slot: 2 },
];

/**
 * Deterministic simulation for development and tests. A browser cannot read SIMs or run a
 * native biometric prompt, so nothing here touches hardware, storage or the network: it only
 * returns the configured outcomes.
 */
export class DemoDeviceAdapter implements DeviceCapabilityAdapter {
  private readonly biometric: NonNullable<DemoDeviceOptions["biometric"]>;
  private readonly sims: readonly SimCard[];
  private readonly simBinding: NonNullable<DemoDeviceOptions["simBinding"]>;

  constructor(options: DemoDeviceOptions = {}) {
    this.biometric = options.biometric ?? "verifies";
    this.sims = DEMO_SIMS.slice(0, options.simCount ?? 2);
    this.simBinding = options.simBinding ?? "binds";
  }

  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric !== "unavailable";
  }

  async verifyBiometric(): Promise<BiometricVerification> {
    return this.biometric === "verifies" ? "verified" : "not_verified";
  }

  async getSimCards(): Promise<SimCard[]> {
    return this.sims.map((sim) => ({ ...sim }));
  }

  async bindSim(simId: string): Promise<SimBinding> {
    const known = this.sims.some((sim) => sim.id === simId);
    return known && this.simBinding === "binds" ? "bound" : "not_bound";
  }
}
