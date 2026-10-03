import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ContractError, LanguageSettings } from "../adapters/banking/types";
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from "../localization/languages";
import { LocalizationContext, type Localization } from "../localization/LocalizationContext";
import { MESSAGES } from "../localization/messages";
import { useAppSession } from "./AppSessionContext";
import { useBankingAdapter } from "./BankingAdapterContext";
import { LanguageSettingsContext, type LanguageControl, type LanguageSettingsState } from "./LanguageSettingsContext";

type Loaded = { status: "idle" } | { status: "loaded"; settings: LanguageSettings } | { status: "failed"; error: ContractError };

const IDLE: Loaded = { status: "idle" };

/**
 * The one owner of the interface language (D-49). The user's setting is the bank's
 * (`getLanguageSettings` / `setLanguage`); this provider only decides which texts to draw.
 * Before login it is always Russian; after login the setting is loaded once per session; an
 * unknown code or a failed load keeps Russian. Nothing is stored by the application itself.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const adapter = useBankingAdapter();
  const { isAuthenticated } = useAppSession();
  const [loaded, setLoaded] = useState<Loaded>(IDLE);
  const [request, setRequest] = useState(0);
  // A new session or a sign-out makes answers to earlier requests stale.
  const generation = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const current = generation.current;
    Promise.resolve()
      .then(() => adapter.getLanguageSettings())
      .then(
        (result): Loaded => (result.ok ? { status: "loaded", settings: result.data } : { status: "failed", error: result.error }),
        (): Loaded => ({ status: "failed", error: { code: "UNKNOWN" } }),
      )
      .then((next) => {
        if (generation.current === current) setLoaded(next);
      });
    return () => {
      generation.current += 1;
      setLoaded(IDLE);
    };
  }, [adapter, isAuthenticated, request]);

  const changeLanguage = useCallback(
    async (code: AppLanguage) => {
      const current = generation.current;
      const result = await adapter.setLanguage({ code });
      if (result.ok && generation.current === current) {
        setLoaded((state) =>
          state.status === "loaded" ? { status: "loaded", settings: { ...state.settings, current: code } } : state,
        );
      }
      return result;
    },
    [adapter],
  );

  const reload = useCallback(() => setRequest((count) => count + 1), []);

  const state = useMemo<LanguageSettingsState>(
    () => (!isAuthenticated ? { status: "signed-out" } : loaded.status === "idle" ? { status: "loading" } : loaded),
    [isAuthenticated, loaded],
  );

  const language: AppLanguage =
    state.status === "loaded" && isAppLanguage(state.settings.current) ? state.settings.current : DEFAULT_LANGUAGE;

  const localization = useMemo<Localization>(() => ({ language, messages: MESSAGES[language] }), [language]);
  const control = useMemo<LanguageControl>(() => ({ state, changeLanguage, reload }), [state, changeLanguage, reload]);

  return (
    <LanguageSettingsContext.Provider value={control}>
      <LocalizationContext.Provider value={localization}>{children}</LocalizationContext.Provider>
    </LanguageSettingsContext.Provider>
  );
}
