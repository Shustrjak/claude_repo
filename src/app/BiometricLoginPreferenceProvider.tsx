import { useMemo, useState, type ReactNode } from "react";
import {
  defaultPreferenceStorage,
  loadAppPreferences,
  saveAppPreferences,
  type PreferenceStorage,
} from "./appPreferencesStorage";
import { BiometricLoginPreferenceContext, type BiometricLoginPreference } from "./BiometricLoginPreferenceContext";

type Props = { children: ReactNode; storage?: PreferenceStorage };

export function BiometricLoginPreferenceProvider({ children, storage: given }: Props) {
  const [storage] = useState(() => given ?? defaultPreferenceStorage());
  const [biometricLoginEnabled, setEnabled] = useState(() => loadAppPreferences(storage).biometricLoginEnabled);
  const preference = useMemo<BiometricLoginPreference>(
    () => ({
      biometricLoginEnabled,
      setBiometricLoginEnabled: (enabled) => {
        saveAppPreferences(storage, { biometricLoginEnabled: enabled });
        setEnabled(enabled);
      },
    }),
    [biometricLoginEnabled, storage],
  );
  return (
    <BiometricLoginPreferenceContext.Provider value={preference}>{children}</BiometricLoginPreferenceContext.Provider>
  );
}
