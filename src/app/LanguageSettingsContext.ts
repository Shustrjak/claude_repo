import { createContext, useContext } from "react";
import type { ContractError, LanguageSettings, Result } from "../adapters/banking/types";
import type { AppLanguage } from "../localization/languages";

/** The user's language setting as the application knows it after login (D-49). */
export type LanguageSettingsState =
  | { status: "signed-out" }
  | { status: "loading" }
  | { status: "loaded"; settings: LanguageSettings }
  | { status: "failed"; error: ContractError };

export type LanguageControl = {
  state: LanguageSettingsState;
  /** Asks the bank to change the language; the interface switches only after a successful answer. */
  changeLanguage: (code: AppLanguage) => Promise<Result<void>>;
  /** Loads the setting again after a failed load. */
  reload: () => void;
};

export const LanguageSettingsContext = createContext<LanguageControl | null>(null);

export function useLanguageSettings(): LanguageControl {
  const control = useContext(LanguageSettingsContext);
  if (!control) {
    throw new Error("useLanguageSettings must be used inside <LanguageProvider>");
  }
  return control;
}
