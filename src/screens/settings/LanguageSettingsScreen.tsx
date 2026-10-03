import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { ContractError } from "../../adapters/banking/types";
import { useLanguageSettings } from "../../app/LanguageSettingsContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AsyncContent, type AsyncContentState } from "../../components/semantic/AsyncContent";
import { ChoiceList } from "../../components/semantic/ChoiceList";
import { StatusMessage } from "../../components/semantic/StatusMessage";
import { APP_LANGUAGES, isAppLanguage, LANGUAGE_NAMES } from "../../localization/languages";
import { useMessages } from "../../localization/LocalizationContext";
import { settingsStatusFor } from "./settingsStatus";

/**
 * SET-04 Change Language (D-49): the v1 languages the bank also offers, each named in itself.
 * The bank keeps the setting; the interface switches only after `setLanguage` succeeds, and the
 * user stays here. Choosing the current language asks nothing. A failure keeps the language.
 */
export function LanguageSettingsScreen() {
  const { state, changeLanguage, reload } = useLanguageSettings();
  const navigate = useNavigate();
  const t = useMessages();
  const [error, setError] = useState<ContractError | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const choose = async (code: string) => {
    if (state.status !== "loaded" || !isAppLanguage(code) || code === state.settings.current || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await changeLanguage(code);
      if (!result.ok) setError(result.error);
    } catch {
      setError({ code: "UNKNOWN" });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const content: AsyncContentState =
    state.status === "loaded"
      ? { status: "data" }
      : state.status === "failed"
        ? { status: "error", ...messageFor(settingsStatusFor(state.error, t)) }
        : { status: "loading" };

  return (
    <AppShell variant="main" header={<AppHeader title={t.language.title} onBack={() => navigate(paths.settings)} />}>
      <AsyncContent state={content} empty={{ title: t.language.title }} onRetry={reload}>
        {state.status === "loaded" && (
          <ChoiceList
            label={t.language.listLabel}
            // Only languages the interface has (D-49) and the bank accepts (`available`).
            items={APP_LANGUAGES.filter((code) => state.settings.available.some((item) => item.code === code)).map(
              (code) => ({ id: code, title: LANGUAGE_NAMES[code] }),
            )}
            value={state.settings.current}
            disabled={busy}
            onChange={(code) => void choose(code)}
          />
        )}
      </AsyncContent>
      {error && <StatusMessage {...settingsStatusFor(error, t)} />}
    </AppShell>
  );
}

function messageFor({ kind, title, description }: ReturnType<typeof settingsStatusFor>) {
  return { kind, message: { title, description } };
}
