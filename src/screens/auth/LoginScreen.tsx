import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAppSession } from "../../app/AppSessionContext";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AuthMethodSelector, type AuthMethod } from "../../components/semantic/AuthMethodSelector";
import { ListRow } from "../../components/semantic/ListRow";
import { MPINInput } from "../../components/semantic/MPINInput";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { loginFailure, type LoginFailure } from "./loginFailure";

const METHODS: readonly AuthMethod[] = ["biometric", "mpin"];

// Biometric availability comes from the device boundary (D-14), which is not implemented yet.
// Until it is, AUTH-01 is in its documented "no biometrics: MPIN only" state.
const BIOMETRIC_AVAILABLE = false;

/** AUTH-01 Login: biometrics or MPIN (N04, D-09, D-13); links to register and open an account. */
export function LoginScreen() {
  const adapter = useBankingAdapter();
  const session = useAppSession();
  const navigate = useNavigate();
  const [method, setMethod] = useState<AuthMethod>("mpin");
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);

  const loginWithMpin = async (mpin: string) => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      const result = await adapter.login({ method: "mpin", mpin });
      if (result.ok) {
        session.signIn();
        navigate(paths.home, { replace: true });
        return;
      }
      setFailure(loginFailure(result.error));
    } catch {
      setFailure(loginFailure({ code: "UNKNOWN" }));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
    setAttempt((count) => count + 1); // fresh, empty MPIN input after a failure
  };

  return (
    <AppShell variant="auth" header={<AppHeader title="Вход" />}>
      <AuthMethodSelector
        methods={METHODS}
        current={method}
        biometricAvailable={BIOMETRIC_AVAILABLE}
        disabled={submitting}
        onSelect={setMethod}
        onBiometricRequest={() => undefined}
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
      {/* AUTH-02 and ACC-07 are not implemented yet: the intents stay visible but unavailable. */}
      <ListRow variant="link" title="Открыть счёт" disabled />
      <ListRow variant="link" title="Зарегистрироваться" disabled />
    </AppShell>
  );
}
