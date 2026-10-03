import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { ListRow } from "../../components/semantic/ListRow";
import { MPINInput } from "../../components/semantic/MPINInput";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import type { ContractError } from "../../adapters/banking/types";
import { useMessages } from "../../localization/LocalizationContext";
import { statusFor } from "./registrationStatus";

/**
 * AUTH-06 Set MPIN & Enable Biometric: a new 4-digit MPIN entered twice (the screen checks they
 * match, the adapter stores it) and the user's choice of biometric login. The choice is an app
 * preference (D-33), offered only if the device can do biometrics, and applied once registration
 * completes. The MPIN lives in this screen's state only.
 */
export function SetMpinScreen() {
  const adapter = useBankingAdapter();
  const device = useDeviceCapability();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const t = useMessages();
  const [first, setFirst] = useState<string | null>(null);
  const [mpin, setMpin] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [status, setStatus] = useState<ContractError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    device
      .isBiometricAvailable()
      .catch(() => false)
      .then((available) => {
        if (active) setBiometricAvailable(available);
      });
    return () => {
      active = false;
    };
  }, [device]);

  const confirm = (repeated: string) => {
    if (repeated === first) {
      setMpin(repeated);
      return;
    }
    setFirst(null);
    setMismatch(true);
    setAttempt((count) => count + 1);
  };

  const submit = async () => {
    if (mpin === null || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await adapter.setMpin({ mpin });
      if (result.ok) {
        flow.markMpinSet(biometricAvailable && enableBiometric);
        navigate(paths.register.otp);
        return;
      }
      if (result.error.code === "VALIDATION_FAILED") {
        setMpin(null);
        setFirst(null);
        setAttempt((count) => count + 1);
      }
      setStatus(result.error);
    } catch {
      setStatus({ code: "UNKNOWN" });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AppShell variant="auth" header={<AppHeader title={t.setMpin.title} onBack={() => navigate(-1)} />}>
      {mpin === null &&
        (first === null ? (
          <MPINInput
            key={`create-${attempt}`}
            mode="create"
            error={mismatch ? t.mpin.mismatch : undefined}
            onComplete={(pin) => {
              setMismatch(false);
              setFirst(pin);
            }}
          />
        ) : (
          <MPINInput key={`confirm-${attempt}`} mode="confirm" onComplete={confirm} />
        ))}
      <ListRow
        variant="toggle"
        title={t.setMpin.biometricToggle}
        subtitle={biometricAvailable ? undefined : t.setMpin.biometricUnavailable}
        disabled={!biometricAvailable || submitting}
        checked={biometricAvailable && enableBiometric}
        onToggle={setEnableBiometric}
      />
      {status && <StatusMessage {...statusFor(status, t)} />}
      <ActionButton action="next" disabled={mpin === null} loading={submitting} onPress={() => void submit()} />
    </AppShell>
  );
}
