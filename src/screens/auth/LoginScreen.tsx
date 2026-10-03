import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { Result } from "../../adapters/banking/types";
import { useAppSession } from "../../app/AppSessionContext";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { useBiometricLoginPreference } from "../../app/BiometricLoginPreferenceContext";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import type { RegistrationEntryState } from "../../app/registration/RegistrationFlowLayout";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AuthMethodSelector, type AuthMethod } from "../../components/semantic/AuthMethodSelector";
import { ListRow } from "../../components/semantic/ListRow";
import { MPINInput } from "../../components/semantic/MPINInput";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { BIOMETRIC_NOT_VERIFIED, loginFailure, type LoginFailure } from "./loginFailure";

const METHODS: readonly AuthMethod[] = ["biometric", "mpin"];

/** D-16: «Зарегистрироваться» is for someone who is already a client of the bank. */
const EXISTING_CUSTOMER: RegistrationEntryState = { onboardingContext: "existing_customer" };

/** A login attempt either reaches the bank or stops on the device. */
type Attempt = () => Promise<Result<void> | "device_not_verified">;

/**
 * AUTH-01 Login: biometrics OR MPIN (N04, D-09, D-13). Biometrics are offered when enabled by the
 * user and available on the device (D-33, D-31); only BankingAdapter.login opens the session.
 * «Открыть счёт» → ACC-07 (D-08), «Зарегистрироваться» → AUTH-02 as `existing_customer` (D-16, D-18). Links to register and open an account.
 */
export function LoginScreen() {
  const adapter = useBankingAdapter();
  const device = useDeviceCapability();
  const { biometricLoginEnabled } = useBiometricLoginPreference();
  const session = useAppSession();
  const navigate = useNavigate();
  const [deviceBiometricAvailable, setDeviceBiometricAvailable] = useState(false);
  const [method, setMethod] = useState<AuthMethod>("mpin");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);

  // D-33: offer biometrics only if the user enabled them AND the device can do them.
  const biometricOffered = biometricLoginEnabled && deviceBiometricAvailable;

  useEffect(() => {
    if (!biometricLoginEnabled) {
      return; // device support alone never turns biometric login on
    }
    let active = true;
    device
      .isBiometricAvailable()
      .catch(() => false)
      .then((available) => {
        if (active && available) {
          setDeviceBiometricAvailable(true);
          setMethod("biometric"); // D-13: biometrics when offered, MPIN as the fallback
        }
      });
    return () => {
      active = false;
    };
  }, [device, biometricLoginEnabled]);

  // One attempt at a time, whichever method started it.
  const authenticate = async (run: Attempt) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    let outcome: Awaited<ReturnType<Attempt>>;
    try {
      outcome = await run();
    } catch {
      outcome = { ok: false, error: { code: "UNKNOWN" } };
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
    if (outcome === "device_not_verified") {
      setFailure(BIOMETRIC_NOT_VERIFIED);
      setMethod("mpin"); // the bank was not asked; MPIN stays available
      return;
    }
    if (outcome.ok) {
      session.signIn();
      navigate(paths.home, { replace: true });
      return;
    }
    setFailure(loginFailure(outcome.error));
    setAttempt((count) => count + 1); // fresh, empty MPIN input after a failure
  };

  const loginWithMpin = (mpin: string) => authenticate(() => adapter.login({ method: "mpin", mpin }));

  const loginWithBiometrics = () =>
    authenticate(async () => {
      const verification = await device.verifyBiometric().catch(() => "not_verified" as const);
      return verification === "verified" ? adapter.login({ method: "biometric" }) : "device_not_verified";
    });

  return (
    <AppShell variant="auth" header={<AppHeader title="Вход" />}>
      <AuthMethodSelector
        methods={METHODS}
        current={method}
        biometricAvailable={biometricOffered}
        disabled={submitting}
        onSelect={setMethod}
        onBiometricRequest={() => void loginWithBiometrics()}
      >
        <MPINInput
          key={attempt}
          mode="enter"
          error={failure?.target === "mpin" ? failure.message : undefined}
          disabled={submitting}
          onComplete={(mpin) => void loginWithMpin(mpin)}
        />
      </AuthMethodSelector>
      {failure?.target === "status" && (
        <StatusMessage kind={failure.kind} title={failure.title} description={failure.description} />
      )}
      <ListRow variant="link" title="Открыть счёт" disabled={submitting} onPress={() => navigate(paths.openAccount)} />
      <ListRow
        variant="link"
        title="Зарегистрироваться"
        disabled={submitting}
        onPress={() => navigate(paths.register.phone, { state: EXISTING_CUSTOMER })}
      />
    </AppShell>
  );
}
