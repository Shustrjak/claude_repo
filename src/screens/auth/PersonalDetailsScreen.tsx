import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CodeDelivery, ContractError, PersonalDetails } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { Checkbox, Input, Typography } from "../../components/primitives";
import { ActionButton } from "../../components/semantic/ActionButton";
import { OTPVerification } from "../../components/semantic/OTPVerification";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { useMessages } from "../../localization/LocalizationContext";
import type { Messages } from "../../localization/messages";
import { statusFor } from "./registrationStatus";

/** Text fields of AUTH-05 (D-15). Keys double as `PersonalDetails` field paths and label keys. */
const FIELDS = [
  "firstName",
  "lastName",
  "birthDate",
  "address.postalCode",
  "address.region",
  "address.city",
  "address.district",
  "address.street",
  "address.house",
  "address.apartment",
] as const;
const CARD_FIELDS = ["card.number", "card.expiry"] as const;

type FieldKey = (typeof FIELDS)[number] | (typeof CARD_FIELDS)[number] | "email";
type Values = Record<FieldKey, string>;
/** Field errors are kept as keys and put into words while rendering, in the current language. */
type FieldError = keyof Messages["details"]["errors"];
type FieldErrors = Partial<Record<FieldKey, FieldError>>;

const EMPTY: Values = {
  firstName: "",
  lastName: "",
  birthDate: "",
  "address.postalCode": "",
  "address.region": "",
  "address.city": "",
  "address.district": "",
  "address.street": "",
  "address.house": "",
  "address.apartment": "",
  email: "",
  "card.number": "",
  "card.expiry": "",
};

/** "31.12.1990" → "1990-12-31" if it is a real date, else null. */
export function toIsoDate(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const iso = `${year}-${month}-${day}`;
  return date.toISOString().startsWith(iso) ? iso : null;
}

/** Format checks only; whether the data is acceptable is the adapter's call (G-2). */
function localErrors(values: Values, withCard: boolean): FieldErrors {
  const errors: FieldErrors = {};
  for (const key of FIELDS) {
    // An empty apartment means "no apartment" (CQ-01 stays open).
    if (key !== "address.apartment" && values[key].trim() === "") errors[key] = "required";
  }
  if (values.birthDate.trim() !== "" && !toIsoDate(values.birthDate)) errors.birthDate = "dateFormat";
  if (withCard) {
    if (!/^\d+$/.test(values["card.number"].replace(/\s/g, ""))) errors["card.number"] = "digitsOnly";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values["card.expiry"].trim())) errors["card.expiry"] = "expiryFormat";
  }
  return errors;
}

type EmailState =
  | { step: "idle" }
  | { step: "sent"; delivery: CodeDelivery; attempt: number; checking: boolean; codeInvalid?: boolean }
  | { step: "verified" };

/**
 * AUTH-05 Personal & Card Details: fields per D-15, card fields only for `existing_customer`
 * (D-18), email confirmed by a code from the letter and two separate consents (D-19). No password.
 */
export function PersonalDetailsScreen() {
  const adapter = useBankingAdapter();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const t = useMessages();
  const withCard = flow.onboardingContext === "existing_customer";
  const [values, setValues] = useState<Values>(EMPTY);
  const [consents, setConsents] = useState({ push: false, marketing: false });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [email, setEmail] = useState<EmailState>({ step: "idle" });
  const [status, setStatus] = useState<ContractError | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const once = async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await work();
    } catch {
      setStatus({ code: "UNKNOWN" });
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const update = (key: FieldKey, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    if (key === "email") setEmail({ step: "idle" }); // a changed address needs a new code
  };

  const sendCode = () =>
    once(async () => {
      setStatus(null);
      const result = await adapter.sendEmailCode({ email: values.email.trim() });
      if (result.ok) {
        setEmail((current) => ({
          step: "sent",
          delivery: result.data,
          attempt: current.step === "sent" ? current.attempt + 1 : 0,
          checking: false,
        }));
      } else if (result.error.code === "VALIDATION_FAILED") {
        setErrors((current) => ({ ...current, email: "checkEmail" }));
      } else {
        setStatus(result.error);
      }
    });

  const verifyCode = (code: string) =>
    once(async () => {
      if (email.step !== "sent") return;
      setEmail({ ...email, checking: true, codeInvalid: false });
      const result = await adapter.verifyEmailCode({ code });
      if (result.ok) {
        setEmail({ step: "verified" });
      } else if (result.error.code === "CODE_INVALID") {
        setEmail({ ...email, attempt: email.attempt + 1, checking: false, codeInvalid: true });
      } else {
        setEmail({ ...email, checking: false });
        setStatus(result.error);
      }
    });

  const submit = () =>
    once(async () => {
      setStatus(null);
      const found = localErrors(values, withCard);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        return;
      }
      if (email.step !== "verified") {
        setErrors({ email: "confirmEmail" });
        return;
      }
      const details: PersonalDetails = {
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        birthDate: toIsoDate(values.birthDate) ?? "",
        address: {
          postalCode: values["address.postalCode"].trim(),
          region: values["address.region"].trim(),
          city: values["address.city"].trim(),
          district: values["address.district"].trim(),
          street: values["address.street"].trim(),
          house: values["address.house"].trim(),
          apartment: values["address.apartment"].trim(),
        },
        email: values.email.trim(),
        consents,
        // D-18: card details exist only for an existing client; none at all otherwise.
        ...(withCard
          ? { card: { number: values["card.number"].replace(/\s/g, ""), expiry: values["card.expiry"].trim() } }
          : {}),
      };
      const result = await adapter.submitPersonalDetails(details);
      if (result.ok) {
        flow.markDetailsSubmitted();
        navigate(paths.register.mpin);
        return;
      }
      const { code, fields = [] } = result.error;
      if (code === "AGE_RESTRICTION") {
        setErrors({ birthDate: "age" });
      } else if (code === "VALIDATION_FAILED" && fields.length > 0) {
        setErrors(Object.fromEntries(fields.map((field) => [field, "checkValue"])));
      } else if (code === "STATE_CONFLICT" && fields.includes("email")) {
        setEmail({ step: "idle" });
        setErrors({ email: "confirmEmail" });
      } else {
        setStatus(result.error);
      }
    });

  const field = (key: FieldKey) => {
    const error = errors[key];
    return (
      <Input
        key={key}
        label={t.details.fields[key]}
        block
        value={values[key]}
        error={error && t.details.errors[error]}
        disabled={submitting}
        onChange={(_event, payload) => update(key, payload.value)}
      />
    );
  };

  return (
    <AppShell variant="auth" header={<AppHeader title={t.details.title} onBack={() => navigate(-1)} />}>
      {FIELDS.map((key) => field(key))}
      {field("email")}
      {email.step === "idle" && (
        <ActionButton
          action="confirm"
          label={t.details.getEmailCode}
          disabled={values.email.trim() === ""}
          loading={submitting}
          onPress={() => void sendCode()}
        />
      )}
      {email.step === "sent" && (
        <OTPVerification
          key={email.attempt}
          destination={email.delivery.destinationMasked}
          codeLength={email.delivery.codeLength}
          resendAfter={email.delivery.resendAfterSec}
          status={email.checking ? "checking" : "input"}
          error={email.codeInvalid ? t.otp.invalid : undefined}
          onSubmit={(code) => void verifyCode(code)}
          onResend={() => void sendCode()}
        />
      )}
      {email.step === "verified" && (
        <Typography.Text tag="p" view="primary-medium" role="status">
          {t.details.emailConfirmed}
        </Typography.Text>
      )}
      <Checkbox
        label={t.details.consentPush}
        checked={consents.push}
        disabled={submitting}
        onChange={(_event, payload) => setConsents((current) => ({ ...current, push: payload.checked }))}
      />
      <Checkbox
        label={t.details.consentMarketing}
        checked={consents.marketing}
        disabled={submitting}
        onChange={(_event, payload) => setConsents((current) => ({ ...current, marketing: payload.checked }))}
      />
      {withCard && CARD_FIELDS.map((key) => field(key))}
      {status && <StatusMessage {...statusFor(status, t)} />}
      <ActionButton action="next" loading={submitting} onPress={() => void submit()} />
    </AppShell>
  );
}
