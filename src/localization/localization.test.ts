import { describe, expect, it } from "vitest";
import { ERROR_CODES } from "../adapters/banking/testing/fixtures";
import { accountsFailure } from "../screens/home/homeStatus";
import { loginFailure } from "../screens/auth/loginFailure";
import { statusFor } from "../screens/auth/registrationStatus";
import { settingsStatusFor } from "../screens/settings/settingsStatus";
import { APP_LANGUAGES, DEFAULT_LANGUAGE, isAppLanguage, LANGUAGE_NAMES } from "./languages";
import { MESSAGES } from "./messages";

/** Every text of a dictionary as "path → value"; functions are called with sample arguments. */
function leaves(node: unknown, path = ""): [string, unknown][] {
  if (typeof node === "function") return [[path, (node as (arg: never) => unknown)("1" as never)]];
  if (typeof node === "object" && node !== null) {
    return Object.entries(node).flatMap(([key, value]) => leaves(value, path ? `${path}.${key}` : key));
  }
  return [[path, node]];
}

describe("v1 interface languages (D-49)", () => {
  it("are exactly ru and en, with ru as the default", () => {
    expect(APP_LANGUAGES).toEqual(["ru", "en"]);
    expect(DEFAULT_LANGUAGE).toBe("ru");
    expect(Object.keys(MESSAGES).sort()).toEqual(["en", "ru"]);
    expect(LANGUAGE_NAMES).toEqual({ ru: "Русский", en: "English" });
  });

  it.each(["de", "ru-RU", "en-US", "EN", "", "system", "auto", null, undefined, 1])("rejects %j", (code) => {
    expect(isAppLanguage(code)).toBe(false);
  });

  it("has complete dictionaries: the same texts in both, none empty", () => {
    const ru = leaves(MESSAGES.ru);
    const en = leaves(MESSAGES.en);
    expect(en.map(([path]) => path)).toEqual(ru.map(([path]) => path));
    for (const [path, value] of [...ru, ...en]) {
      expect(typeof value, path).toBe("string");
      expect((value as string).trim(), path).not.toBe("");
    }
    // English is really English: no Cyrillic outside the self-named language list.
    for (const [path, value] of en) expect(value as string, path).not.toMatch(/[А-Яа-яЁё]/);
  });
});

describe("status helpers follow the language and hide codes", () => {
  it.each(ERROR_CODES)("%s → a message in each language without the raw code", (code) => {
    for (const language of APP_LANGUAGES) {
      const t = MESSAGES[language];
      const texts = [
        statusFor({ code }, t),
        settingsStatusFor({ code }, t),
        accountsFailure({ code }, t).message,
        loginFailure({ code }, t),
      ].flatMap((item) => Object.values(item).filter((value): value is string => typeof value === "string"));
      for (const text of texts) expect(text).not.toContain(code);
    }
  });

  it("speaks English with the English dictionary", () => {
    expect(statusFor({ code: "UNAVAILABLE" }, MESSAGES.en).title).toBe("Bank is currently unavailable");
    expect(loginFailure({ code: "MPIN_INVALID" }, MESSAGES.en)).toEqual({
      target: "mpin",
      message: "Wrong MPIN. Please try again.",
    });
    expect(statusFor({ code: "UNAVAILABLE" }, MESSAGES.ru).title).toBe("Банк сейчас недоступен");
  });
});
