import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useBiometricLoginPreference } from "../../app/BiometricLoginPreferenceContext";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ListRow } from "../../components/semantic/ListRow";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { useMessages } from "../../localization/LocalizationContext";

/**
 * SET-03 Enable / Disable Biometric Login: toggles the app preference (D-33, D-35), the same one
 * AUTH-06 commits and AUTH-01 reads. The device only says whether biometrics are possible (D-14);
 * no biometric check is needed to change the setting. The device is never changed here.
 */
export function BiometricSettingsScreen() {
  const device = useDeviceCapability();
  const { biometricLoginEnabled, setBiometricLoginEnabled } = useBiometricLoginPreference();
  const navigate = useNavigate();
  const t = useMessages();
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    device
      .isBiometricAvailable()
      .catch(() => false)
      .then((result) => {
        if (active) setAvailable(result);
      });
    return () => {
      active = false;
    };
  }, [device]);

  if (available === null) {
    return <AppShell variant="main" header={<AppHeader title={t.biometricSettings.title} onBack={() => navigate(paths.settings)} />} />;
  }

  return (
    <AppShell variant="main" header={<AppHeader title={t.biometricSettings.title} onBack={() => navigate(paths.settings)} />}>
      <ListRow
        variant="toggle"
        title={t.biometricSettings.toggle}
        disabled={!available}
        // D-33: without device support biometric login is off, whatever was stored.
        checked={available && biometricLoginEnabled}
        onToggle={setBiometricLoginEnabled}
      />
      {!available && (
        <StatusMessage
          kind="unavailable"
          title={t.biometricSettings.unavailable}
          description={t.biometricSettings.unsupported}
        />
      )}
    </AppShell>
  );
}
