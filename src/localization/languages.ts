/** Interface languages of v1 (D-49). The codes are the ones `LanguageSettings` and `setLanguage` use. */
export const APP_LANGUAGES = ["ru", "en"] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** The default and the fallback: before login, without a loaded setting, and for unknown codes. */
export const DEFAULT_LANGUAGE: AppLanguage = "ru";

/** Each language is named in itself, whatever the interface language is (D-49). */
export const LANGUAGE_NAMES: Record<AppLanguage, string> = { ru: "Русский", en: "English" };

export function isAppLanguage(code: unknown): code is AppLanguage {
  return APP_LANGUAGES.some((language) => language === code);
}
