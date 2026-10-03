/**
 * Outcome of one local biometric challenge. Device-side only: it is not a ContractError and
 * opens no banking session. Cancellation and a failed match are both "not_verified".
 */
export type BiometricVerification = "verified" | "not_verified";

/**
 * Device capability boundary (D-14): what the device can do, separate from the banking core.
 * Only the biometric login capability exists so far (D-31); SIM, QR camera and the biometric
 * login setting are added with AUTH-03/04, PAY-03 and AUTH-06/SET-03.
 * Implementations never throw and never call the banking core.
 */
export interface DeviceCapabilityAdapter {
  /** Whether biometric authentication can be offered on this device right now. */
  isBiometricAvailable(): Promise<boolean>;
  /** Runs one local biometric challenge. Says nothing to the bank. */
  verifyBiometric(): Promise<BiometricVerification>;
}
