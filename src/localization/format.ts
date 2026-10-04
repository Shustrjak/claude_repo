import type { AppLanguage } from "./languages";

/** Locales for `Intl` formatting only; the application languages stay `ru` and `en` (D-49, D-53). */
const INTL_LOCALES: Record<AppLanguage, string> = { ru: "ru-RU", en: "en-US" };

/**
 * Day and month of an ISO 8601 date-time in the interface language: «28 сентября», "September 28".
 * No year, no time (D-53). The device time zone applies unless one is given. An unreadable value is
 * shown as it came: it is data, not something to fix.
 */
export function formatDayMonth(iso: string, language: AppLanguage, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(INTL_LOCALES[language], {
    day: "numeric",
    month: "long",
    ...(timeZone === undefined ? {} : { timeZone }),
  }).format(date);
}
