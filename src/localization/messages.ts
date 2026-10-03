import { en } from "./en";
import type { AppLanguage } from "./languages";
import { ru, type Messages } from "./ru";

/** One dictionary per v1 language: adding a language to APP_LANGUAGES without one does not compile. */
export const MESSAGES: Record<AppLanguage, Messages> = { ru, en };

export type { Messages };
