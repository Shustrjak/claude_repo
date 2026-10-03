import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { CodeDelivery, ContractError } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { MPINInput } from "../../components/semantic/MPINInput";
import { OperationStatus } from "../../components/semantic/OperationStatus";
import { OTPVerification } from "../../components/semantic/OTPVerification";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { useMessages } from "../../localization/LocalizationContext";
import { settingsStatusFor } from "./settingsStatus";

type Step = "otp" | "mpin" | "done";

/**
 * SET-02 Change MPIN, steps inside one screen (D-10): OTP for a sensitive operation
 * (`change_mpin`) → new MPIN and its repeat [A] → `changeMpin` → success → «Готово» → SET-01
 * (D-45). No old MPIN is asked. The session is kept; the new MPIN lives in this screen only.
 */
export function ChangeMpinScreen() {
  const adapter = useBankingAdapter();
  const navigate = useNavigate();
  const t = useMessages();
  const [step, setStep] = useState<Step>("otp");
  const [delivery, setDelivery] = useState<CodeDelivery | null>(null);
  const [sent, setSent] = useState(0);
  const [codeInvalid, setCodeInvalid] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [newMpin, setNewMpin] = useState<string | null>(null);
  const [mismatch, setMismatch] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<ContractError | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const once = useCallback(async (work: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await work();
    } catch {
      setStatus({ code: "UNKNOWN" });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);

  const requestCode = useCallback(
    () =>
      once(async () => {
        setStatus(null);
        const result = await adapter.requestOtp({ purpose: "change_mpin" });
        if (result.ok) {
          setDelivery(result.data);
          setSent((count) => count + 1);
          setCodeInvalid(false);
        } else {
          setStatus(result.error);
        }
      }),
    [adapter, once],
  );

  const requested = useRef(false);
  useEffect(() => {
    if (requested.current) return; // one code per visit, also under StrictMode
    requested.current = true;
    void requestCode();
  }, [requestCode]);

  const verifyCode = (code: string) =>
    once(async () => {
      setStatus(null);
      const result = await adapter.verifyOtp({ purpose: "change_mpin", code });
      if (result.ok) {
        setStep("mpin");
      } else if (result.error.code === "CODE_INVALID") {
        setCodeInvalid(true);
        setSent((count) => count + 1); // fresh, empty code input
      } else {
        setStatus(result.error);
      }
    });

  const confirmRepeat = (repeated: string) => {
    if (repeated === first) {
      setNewMpin(repeated);
      return;
    }
    setFirst(null);
    setMismatch(true);
    setAttempt((count) => count + 1);
  };

  const change = () =>
    once(async () => {
      if (newMpin === null) return;
      setStatus(null);
      const result = await adapter.changeMpin({ newMpin });
      setNewMpin(null); // the new MPIN is not kept after the attempt
      setFirst(null);
      if (result.ok) {
        setStep("done");
        return;
      }
      setAttempt((count) => count + 1);
      setStatus(result.error);
    });

  const back = () => navigate(paths.settings);

  return (
    <AppShell
      variant="main"
      header={<AppHeader title={t.changeMpin.title} {...(step === "done" ? {} : { onBack: back })} />}
    >
      {step === "otp" && delivery && (
        <OTPVerification
          key={sent}
          destination={delivery.destinationMasked}
          codeLength={delivery.codeLength}
          resendAfter={delivery.resendAfterSec}
          status={busy ? "checking" : "input"}
          error={codeInvalid ? t.otp.invalid : undefined}
          onSubmit={(code) => void verifyCode(code)}
          onResend={() => void requestCode()}
        />
      )}
      {step === "otp" && !delivery && status && (
        <ActionButton action="retry" label={t.otp.send} loading={busy} onPress={() => void requestCode()} />
      )}
      {step === "mpin" &&
        newMpin === null &&
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
          <MPINInput key={`confirm-${attempt}`} mode="confirm" onComplete={confirmRepeat} />
        ))}
      {step === "mpin" && (
        <ActionButton action="confirm" disabled={newMpin === null} loading={busy} onPress={() => void change()} />
      )}
      {step === "done" && (
        <OperationStatus
          status="success"
          title={t.changeMpin.changed}
          description={t.changeMpin.useNewMpin}
          actions={<ActionButton action="close" onPress={back} />}
        />
      )}
      {status && <StatusMessage {...settingsStatusFor(status, t)} />}
    </AppShell>
  );
}
