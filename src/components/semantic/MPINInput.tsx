import { useId, useState, type KeyboardEvent } from "react";
import { useMessages } from "../../localization/LocalizationContext";
import { PassCode, Typography } from "../primitives";

/** MPIN is exactly four digits (D-09); not configurable. */
export const MPIN_LENGTH = 4;

type Props = {
  mode: "enter" | "create" | "confirm";
  /** Error text from the screen; whether a MPIN is correct is decided elsewhere. */
  error?: string | undefined;
  disabled?: boolean;
  /** Fires once, after the fourth digit. */
  onComplete: (pin: string) => void;
};

/**
 * MPIN entry on the Alfa keypad, plus digits and Backspace from a physical keyboard.
 * Keeps the digits in local state only. Remount it (React `key`) to start over.
 */
export function MPINInput({ mode, error, disabled = false, onComplete }: Props) {
  const t = useMessages();
  const [value, setValue] = useState("");
  const titleId = useId();
  const errorId = useId();

  const change = (next: string) => {
    if (disabled || next.length > MPIN_LENGTH || !/^\d*$/.test(next)) {
      return;
    }
    setValue(next);
    if (next.length === MPIN_LENGTH) {
      onComplete(next);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      change(value + event.key);
    } else if (event.key === "Backspace") {
      event.preventDefault();
      change(value.slice(0, -1));
    }
  };

  return (
    <div
      role="group"
      tabIndex={0}
      aria-labelledby={titleId}
      aria-describedby={error ? errorId : undefined}
      aria-disabled={disabled || undefined}
      onKeyDown={handleKeyDown}
    >
      <Typography.Title tag="h2" view="small" id={titleId}>
        {t.mpin[mode]}
      </Typography.Title>
      <PassCode value={value} onChange={change} codeLength={MPIN_LENGTH} error={Boolean(error)} disabled={disabled} />
      {error && (
        <Typography.Text tag="p" view="primary-small" color="negative" id={errorId} role="alert">
          {error}
        </Typography.Text>
      )}
    </div>
  );
}
