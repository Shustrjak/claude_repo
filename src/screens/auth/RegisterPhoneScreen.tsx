import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { PhoneInput } from "../../components/primitives";
import { ActionButton } from "../../components/semantic/ActionButton";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { statusFor, type ScreenStatus } from "./registrationStatus";

/** "+7 (999) 123-45-67" → "+79991234567", or null if it is not a full Russian number (D-15). */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return /^7\d{10}$/.test(digits) ? `+${digits}` : null;
}

/** AUTH-02 Register User: the phone (+7) and the onboarding context from the entry point. */
export function RegisterPhoneScreen() {
  const adapter = useBankingAdapter();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [status, setStatus] = useState<ScreenStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const submit = async () => {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setFieldError("Введите номер полностью: +7 и 10 цифр");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setStatus(null);
    try {
      const result = await adapter.startRegistration({ phone: normalized, onboardingContext: flow.onboardingContext });
      if (result.ok) {
        flow.markStarted();
        navigate(paths.register.sim);
        return;
      }
      if (result.error.code === "VALIDATION_FAILED") {
        setFieldError("Проверьте номер телефона");
      } else {
        setStatus(statusFor(result.error));
      }
    } catch {
      setStatus(statusFor({ code: "UNKNOWN" }));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AppShell variant="auth" header={<AppHeader title="Регистрация" onBack={() => navigate(-1)} />}>
      <PhoneInput
        label="Номер телефона"
        block
        value={phone}
        error={fieldError}
        disabled={submitting}
        onChange={(_event, payload) => {
          setPhone(payload.value);
          setFieldError(undefined);
        }}
      />
      {status && <StatusMessage {...status} />}
      <ActionButton action="next" loading={submitting} onPress={() => void submit()} />
    </AppShell>
  );
}
