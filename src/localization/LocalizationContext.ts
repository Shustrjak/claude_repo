import { createContext, useContext } from "react";
import { DEFAULT_LANGUAGE, type AppLanguage } from "./languages";
import { MESSAGES, type Messages } from "./messages";

export type Localization = { language: AppLanguage; messages: Messages };

/** The language the interface is drawn in. Without a provider (e.g. isolated component tests) — Russian. */
export const LocalizationContext = createContext<Localization>({
  language: DEFAULT_LANGUAGE,
  messages: MESSAGES[DEFAULT_LANGUAGE],
});

/** Interface texts in the current language. Components read texts here; they never load the language. */
export function useMessages(): Messages {
  return useContext(LocalizationContext).messages;
}

export function useLanguage(): AppLanguage {
  return useContext(LocalizationContext).language;
}
