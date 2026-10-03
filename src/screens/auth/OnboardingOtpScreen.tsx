import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CodeDelivery } from "../../adapters/banking/types";
import { useAppSession } from "../../app/AppSessionContext";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { useBiometricLoginPreference } from "../../app/BiometricLoginPreferenceContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { OTPVerification } from "../../components/semantic/OTPVerification";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { statusFor, type ScreenStatus } from "./registrationStatus";

/**
 * AUTH-07 OTP Authentication: the onboarding OTP (D-10), not the email code. Success completes
 * registration and opens the session (contract: verifyOtp onboarding) → HOME-01; a wrong code
 * goes back to AUTH-03 as on the scheme (Failure → AUTH-03).
 */
export function OnboardingOtpScreen() {
  const adapter = useBankingAdapter();
  const flow = useRegistrationFlow();
  const session = useAppSession();
  const { setBiometricLoginEnabled } = useBiometricLoginPreference();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<CodeDelivery | null>(null);
  const [sent, setSent] = useState(0);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<ScreenStatus | null>(null);
  const inFlight = useRef(false);

  const request = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await adapter.requestOtp({ purpose: "onboarding" });
      if (result.ok) {
        setDelivery(result.data);
        setSent((count) => count + 1);
        setStatus(null);
      } else {
        setStatus(statusFor(result.error));
      }
    } catch {
      setStatus(statusFor({ code: "UNKNOWN" }));
    } finally {
      inFlight.current = false;
    }
  }, [adapter]);

  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return; // one code per visit, also under StrictMode
    requested.current = true;
    void request();
  }, [request]);

  const verify = async (code: string) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setChecking(true);
    try {
      const result = await adapter.verifyOtp({ purpose: "onboarding", code });
      if (result.ok) {
        setBiometricLoginEnabled(flow.enableBiometricLogin); // the AUTH-06 choice (D-33, D-35)
        session.signIn();
        navigate(paths.home, { replace: true });
        return;
      }
      if (result.error.code === "CODE_INVALID") {
        flow.reportOtpFailure();
        navigate(paths.register.sim, { replace: true });
        return;
      }
      setStatus(statusFor(result.error));
    } catch {
      setStatus(statusFor({ code: "UNKNOWN" }));
    } finally {
      inFlight.current = false;
      setChecking(false);
    }
  };

  return (
    <AppShell variant="auth" header={<AppHeader title="Код из СМС" />}>
      {delivery && (
        <OTPVerification
          key={sent}
          destination={delivery.destinationMasked}
          codeLength={delivery.codeLength}
          resendAfter={delivery.resendAfterSec}
          status={checking ? "checking" : "input"}
          onSubmit={(code) => void verify(code)}
          onResend={() => void request()}
        />
      )}
      {status && <StatusMessage {...status} />}
      {status && !delivery && <ActionButton action="retry" label="Отправить код" onPress={() => void request()} />}
    </AppShell>
  );
}
