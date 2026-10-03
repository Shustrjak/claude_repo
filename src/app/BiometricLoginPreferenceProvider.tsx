import { useMemo, useState, type ReactNode } from "react";
import { BiometricLoginPreferenceContext, type BiometricLoginPreference } from "./BiometricLoginPreferenceContext";

type Props = { children: ReactNode; initiallyEnabled?: boolean };

export function BiometricLoginPreferenceProvider({ children, initiallyEnabled = false }: Props) {
  const [biometricLoginEnabled, setBiometricLoginEnabled] = useState(initiallyEnabled);
  const preference = useMemo<BiometricLoginPreference>(
    () => ({ biometricLoginEnabled, setBiometricLoginEnabled }),
    [biometricLoginEnabled],
  );
  return (
    <BiometricLoginPreferenceContext.Provider value={preference}>{children}</BiometricLoginPreferenceContext.Provider>
  );
}
