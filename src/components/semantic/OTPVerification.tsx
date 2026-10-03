import { useEffect, useId, useState } from "react";
import { useMessages } from "../../localization/LocalizationContext";
import { CodeInput, Typography } from "../primitives";
import { ActionButton } from "./ActionButton";

type Props = {
  /** Where the code went, already masked. */
  destination: string;
  codeLength: number;
  /** Seconds until the code may be sent again. */
  resendAfter: number;
  status: "input" | "checking";
  error?: string | undefined;
  onSubmit: (code: string) => void;
  onResend: () => void;
};

/**
 * One-time code entry with a resend timer. Used for the onboarding OTP and the email code alike:
 * it does not know which one it is (D-19). Remount it (React `key`) for a newly sent code.
 */
export function OTPVerification({ destination, codeLength, resendAfter, status, error, onSubmit, onResend }: Props) {
  const t = useMessages();
  const [secondsLeft, setSecondsLeft] = useState(resendAfter);
  const titleId = useId();

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((left) => Math.max(0, left - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section aria-labelledby={titleId}>
      <Typography.Text tag="p" view="primary-medium" id={titleId}>
        {t.otp.sentTo(destination)}
      </Typography.Text>
      <CodeInput
        fields={codeLength}
        disabled={status === "checking"}
        error={error}
        onComplete={(code) => onSubmit(code)}
      />
      {secondsLeft > 0 ? (
        <Typography.Text tag="p" view="primary-small" color="secondary">
          {t.otp.resendIn(secondsLeft)}
        </Typography.Text>
      ) : (
        <ActionButton action="retry" label={t.otp.resend} disabled={status === "checking"} onPress={onResend} />
      )}
    </section>
  );
}
