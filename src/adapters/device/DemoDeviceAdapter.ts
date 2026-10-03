import type { BiometricVerification, DeviceCapabilityAdapter } from "./DeviceCapabilityAdapter";

export type DemoDeviceOptions = {
  /** `unavailable`, or available with a fixed outcome for every challenge. Default: `verifies`. */
  biometric?: "verifies" | "rejects" | "unavailable";
};

/**
 * Deterministic simulation for development and tests. It touches no hardware, keeps no
 * biometric data and stores nothing: it only returns the configured challenge outcome.
 */
export class DemoDeviceAdapter implements DeviceCapabilityAdapter {
  private readonly biometric: NonNullable<DemoDeviceOptions["biometric"]>;

  constructor(options: DemoDeviceOptions = {}) {
    this.biometric = options.biometric ?? "verifies";
  }

  async isBiometricAvailable(): Promise<boolean> {
    return this.biometric !== "unavailable";
  }

  async verifyBiometric(): Promise<BiometricVerification> {
    return this.biometric === "verifies" ? "verified" : "not_verified";
  }
}
