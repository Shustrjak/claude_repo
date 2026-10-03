import { createContext, useContext } from "react";

/**
 * The user's choice to log in with biometrics in this app (D-33). An application preference,
 * not a device capability: AUTH-06 sets it at registration, SET-03 will toggle it, AUTH-01 reads
 * it. Off by default and kept across reloads in its own storage record (D-35).
 */
export type BiometricLoginPreference = {
  biometricLoginEnabled: boolean;
  setBiometricLoginEnabled: (enabled: boolean) => void;
};

export const BiometricLoginPreferenceContext = createContext<BiometricLoginPreference | null>(null);

export function useBiometricLoginPreference(): BiometricLoginPreference {
  const preference = useContext(BiometricLoginPreferenceContext);
  if (!preference) {
    throw new Error("useBiometricLoginPreference must be used inside <BiometricLoginPreferenceProvider>");
  }
  return preference;
}
