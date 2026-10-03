import type { BiometricVerification, DeviceCapabilityAdapter, SimBinding, SimCard } from "./DeviceCapabilityAdapter";

/** No device capabilities: no biometrics, no SIM. Nothing ever verifies or binds. */
export class NullDeviceAdapter implements DeviceCapabilityAdapter {
  async isBiometricAvailable(): Promise<boolean> {
    return false;
  }
  async verifyBiometric(): Promise<BiometricVerification> {
    return "not_verified";
  }
  async getSimCards(): Promise<SimCard[]> {
    return [];
  }
  async bindSim(): Promise<SimBinding> {
    return "not_bound";
  }
}
