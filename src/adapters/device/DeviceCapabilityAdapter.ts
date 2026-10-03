/**
 * Outcome of one local biometric challenge. Device-side only: it is not a ContractError and
 * opens no banking session. Cancellation and a failed match are both "not_verified".
 */
export type BiometricVerification = "verified" | "not_verified";

/**
 * A SIM slot the device offers for binding (AUTH-03). `id` is opaque to the app and only
 * names the slot for `bindSim`; it is not a hardware identifier (no ICCID, IMSI or IMEI).
 */
export type SimCard = { id: string; slot: number };

/** Outcome of binding the app to a SIM on this device (AUTH-04). Device-side only. */
export type SimBinding = "bound" | "not_bound";

/**
 * Device capability boundary (D-14): what the device can do, separate from the banking core.
 * It isolates platform capabilities: the web demo simulates them, a native build could supply
 * a real implementation without changing screens. Biometric login (D-31) and SIM selection and
 * binding (D-34) exist so far; the QR camera arrives with PAY-03. User preferences, such as
 * whether biometric login is enabled, are not device capabilities (D-33).
 * Implementations never throw and never call the banking core.
 */
export interface DeviceCapabilityAdapter {
  /** Whether the device can perform biometric authentication right now. */
  isBiometricAvailable(): Promise<boolean>;
  /** Runs one local biometric challenge. Says nothing to the bank. */
  verifyBiometric(): Promise<BiometricVerification>;
  /** SIM slots available for binding; empty when there is none (AUTH-03). */
  getSimCards(): Promise<SimCard[]>;
  /** Binds the app to the given SIM on this device (AUTH-04). Unknown ids do not bind. */
  bindSim(simId: string): Promise<SimBinding>;
}
