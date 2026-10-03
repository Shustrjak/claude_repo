import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CodeDelivery, PersonalDetails } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { Checkbox, Input, Typography } from "../../components/primitives";
import { ActionButton } from "../../components/semantic/ActionButton";
import { OTPVerification } from "../../components/semantic/OTPVerification";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { statusFor, type ScreenStatus } from "./registrationStatus";

/** Text fields of AUTH-05 (D-15). Keys double as `PersonalDetails` field paths. */
const FIELDS = [
  ["firstName", "Имя"],
  ["lastName", "Фамилия"],
  ["birthDate", "Дата рождения (ДД.ММ.ГГГГ)"],
  ["address.postalCode", "Индекс"],
  ["address.region", "Регион"],
  ["address.city", "Город"],
  ["address.district", "Район"],
  ["address.street", "Улица"],
  ["address.house", "Дом"],
  ["address.apartment", "Квартира"],
] as const;
const CARD_FIELDS = [
  ["card.number", "Номер карты"],
  ["card.expiry", "Срок действия (ММ/ГГ)"],
] as const;

type FieldKey = (typeof FIELDS)[number][0] | (typeof CARD_FIELDS)[number][0] | "email";
type Values = Record<FieldKey, string>;

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
function localErrors(values: Values, withCard: boolean): Partial<Record<FieldKey, string>> {
  const errors: Partial<Record<FieldKey, string>> = {};
  for (const [key] of FIELDS) {
    // An empty apartment means "no apartment" (CQ-01 stays open).
    if (key !== "address.apartment" && values[key].trim() === "") errors[key] = "Заполните поле";
  }
  if (values.birthDate.trim() !== "" && !toIsoDate(values.birthDate)) errors.birthDate = "Дата в формате ДД.ММ.ГГГГ";
  if (withCard) {
    if (!/^\d+$/.test(values["card.number"].replace(/\s/g, ""))) errors["card.number"] = "Только цифры";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values["card.expiry"].trim())) errors["card.expiry"] = "Формат ММ/ГГ";
  }
  return errors;
}

type EmailState =
  | { step: "idle" }
  | { step: "sent"; delivery: CodeDelivery; attempt: number; checking: boolean; error?: string | undefined }
  | { step: "verified" };

/**
 * AUTH-05 Personal & Card Details: fields per D-15, card fields only for `existing_customer`
 * (D-18), email confirmed by a code from the letter and two separate consents (D-19). No password.
 */
export function PersonalDetailsScreen() {
  const adapter = useBankingAdapter();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const withCard = flow.onboardingContext === "existing_customer";
  const [values, setValues] = useState<Values>(EMPTY);
  const [consents, setConsents] = useState({ push: false, marketing: false });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [email, setEmail] = useState<EmailState>({ step: "idle" });
  const [status, setStatus] = useState<ScreenStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const once = async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      await work();
    } catch {
      setStatus(statusFor({ code: "UNKNOWN" }));
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
        setErrors((current) => ({ ...current, email: "Проверьте адрес почты" }));
      } else {
        setStatus(statusFor(result.error));
      }
    });

  const verifyCode = (code: string) =>
    once(async () => {
      if (email.step !== "sent") return;
      setEmail({ ...email, checking: true, error: undefined });
      const result = await adapter.verifyEmailCode({ code });
      if (result.ok) {
        setEmail({ step: "verified" });
      } else if (result.error.code === "CODE_INVALID") {
        setEmail({ ...email, attempt: email.attempt + 1, checking: false, error: "Неверный код" });
      } else {
        setEmail({ ...email, checking: false });
        setStatus(statusFor(result.error));
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
        setErrors({ email: "Подтвердите почту кодом из письма" });
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
        setErrors({ birthDate: "Регистрация доступна с 18 лет" });
      } else if (code === "VALIDATION_FAILED" && fields.length > 0) {
        setErrors(Object.fromEntries(fields.map((field) => [field, "Проверьте значение"])));
      } else if (code === "STATE_CONFLICT" && fields.includes("email")) {
        setEmail({ step: "idle" });
        setErrors({ email: "Подтвердите почту кодом из письма" });
      } else {
        setStatus(statusFor(result.error));
      }
    });

  const field = (key: FieldKey, label: string) => (
    <Input
      key={key}
      label={label}
      block
      value={values[key]}
      error={errors[key]}
      disabled={submitting}
      onChange={(_event, payload) => update(key, payload.value)}
    />
  );

  return (
    <AppShell variant="auth" header={<AppHeader title="Личные данные" onBack={() => navigate(-1)} />}>
      {FIELDS.map(([key, label]) => field(key, label))}
      {field("email", "Почта")}
      {email.step === "idle" && (
        <ActionButton
          action="confirm"
          label="Получить код на почту"
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
          error={email.error}
          onSubmit={(code) => void verifyCode(code)}
          onResend={() => void sendCode()}
        />
      )}
      {email.step === "verified" && (
        <Typography.Text tag="p" view="primary-medium" role="status">
          Почта подтверждена
        </Typography.Text>
      )}
      <Checkbox
        label="Согласен получать push-уведомления"
        checked={consents.push}
        disabled={submitting}
        onChange={(_event, payload) => setConsents((current) => ({ ...current, push: payload.checked }))}
      />
      <Checkbox
        label="Согласен получать рекламные рассылки"
        checked={consents.marketing}
        disabled={submitting}
        onChange={(_event, payload) => setConsents((current) => ({ ...current, marketing: payload.checked }))}
      />
      {withCard && CARD_FIELDS.map(([key, label]) => field(key, label))}
      {status && <StatusMessage {...status} />}
      <ActionButton action="next" loading={submitting} onPress={() => void submit()} />
    </AppShell>
  );
}
