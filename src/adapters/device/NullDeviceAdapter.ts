import type { BiometricVerification, DeviceCapabilityAdapter } from "./DeviceCapabilityAdapter";

/** No device capabilities: biometrics are unavailable and never verify. */
export class NullDeviceAdapter implements DeviceCapabilityAdapter {
  async isBiometricAvailable(): Promise<boolean> {
    return false;
  }
  async verifyBiometric(): Promise<BiometricVerification> {
    return "not_verified";
  }
}
