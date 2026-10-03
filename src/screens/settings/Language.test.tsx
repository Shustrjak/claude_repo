// @vitest-environment jsdom
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { NullAdapter } from "../../adapters/banking/NullAdapter";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { AccountSummary, LanguageSettings, Result } from "../../adapters/banking/types";
import { findScreenTitle, renderApp } from "../../test/renderApp";

type User = ReturnType<typeof userEvent.setup>;

const BOTH = [
  { code: "ru", title: "Русский" },
  { code: "en", title: "English" },
];
const ACCOUNTS: AccountSummary[] = [
  { id: "a", name: "Счёт для покупок", maskedNumber: "•• 4021", balance: { amount: 123_456, currency: "RUB" }, status: "blocked" },
];

/** A bank with a language setting; `setLanguage` succeeds unless told otherwise. Other calls are recorded. */
function languageBank({
  current = "ru",
  available = BOTH,
  getLanguageSettings,
  setLanguage = async () => ok(),
}: {
  current?: string;
  available?: LanguageSettings["available"];
  getLanguageSettings?: () => Promise<Result<LanguageSettings>>;
  setLanguage?: (req: { code: string }) => Promise<Result<void>>;
} = {}) {
  const stub = stubBankingAdapter();
  const get = vi.fn(getLanguageSettings ?? (async () => ok({ current, available })));
  const set = vi.fn(setLanguage);
  const adapter: BankingAdapter = {
    ...stub.adapter,
    getLanguageSettings: get,
    setLanguage: set,
    getAccounts: async () => ok(ACCOUNTS),
  };
  return { adapter, getLanguageSettings: get, setLanguage: set, otherCalls: stub.calls };
}

const nav = () => within(screen.getByRole("navigation", { name: /Основная навигация|Main navigation/ }));
const radio = (name: string) => screen.getByRole("radio", { name }) as HTMLInputElement;
const text = (element: HTMLElement) => (element.textContent ?? "").replace(/[\s\u00a0\u2009\u202f]+/g, " ");

async function openLanguage(user: User) {
  await user.click(await screen.findByRole("button", { name: /^(Язык|Language)$/ }));
  await screen.findByRole("radiogroup");
}

afterEach(() => vi.restoreAllMocks());

describe("Default language (D-49)", () => {
  it("before login: Russian, and the bank's language setting is not read", () => {
    const { adapter, getLanguageSettings } = languageBank({ current: "en" });
    renderApp(adapter, { path: "/login" });
    expect(within(screen.getByRole("banner")).getByText("Вход")).toBeTruthy();
    expect(getLanguageSettings).not.toHaveBeenCalled();
  });

  it.each([
    ["an error result", async (): Promise<Result<LanguageSettings>> => fail("UNAVAILABLE")],
    [
      "a thrown error",
      async (): Promise<Result<LanguageSettings>> => {
        throw new Error("boom");
      },
    ],
    ["an unknown code", async (): Promise<Result<LanguageSettings>> => ok({ current: "de", available: BOTH })],
  ])("after login, %s keeps Russian; the session stays", async (_label, getLanguageSettings) => {
    const { adapter, getLanguageSettings: get } = languageBank({ getLanguageSettings });
    const { router } = renderApp(adapter, { path: "/home", authenticated: true });
    await waitFor(() => expect(get).toHaveBeenCalledOnce());
    await findScreenTitle("Главная");
    expect(within(await screen.findByRole("article")).getByText("Заблокирован")).toBeTruthy();
    await act(() => router.navigate("/settings"));
    await findScreenTitle("Настройки");
    expect(get).toHaveBeenCalledOnce(); // no retry loop
  });

  it("loads the setting once per session, not per screen", async () => {
    const user = userEvent.setup();
    const { adapter, getLanguageSettings } = languageBank();
    renderApp(adapter, { path: "/home", authenticated: true });
    await findScreenTitle("Главная");
    await user.click(nav().getByRole("button", { name: "Настройки" }));
    await user.click(await screen.findByRole("button", { name: "Вход по биометрии" }));
    await user.click(await screen.findByRole("button", { name: "Назад" }));
    await openLanguage(user);
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(nav().getByRole("button", { name: "Главная" }));
    await findScreenTitle("Главная");
    expect(getLanguageSettings).toHaveBeenCalledOnce();
  });
});

describe("SET-04 route", () => {
  it("sends an unauthenticated visit to login", () => {
    const { router } = renderApp(languageBank().adapter, { path: "/settings/language" });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("opens from the active «Язык» row, has no bottom navigation, and «Назад» returns to SET-01", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(languageBank().adapter, { path: "/settings", authenticated: true });
    await openLanguage(user);
    expect(router.state.location.pathname).toBe("/settings/language");
    expect(screen.queryByRole("navigation")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await findScreenTitle("Настройки");
    expect(router.state.location.pathname).toBe("/settings");
  });

  it.each([
    ["ru", "Русский", "Язык"],
    ["en", "English", "Language"],
  ])("current %s: «%s» is selected and the screen speaks it", async (current, selected, title) => {
    renderApp(languageBank({ current }).adapter, { path: "/settings/language", authenticated: true });
    await screen.findByRole("radiogroup");
    await findScreenTitle(title);
    expect(screen.getAllByRole("radio").map((item) => item.getAttribute("value"))).toEqual(["ru", "en"]);
    expect(radio(selected).checked).toBe(true);
    // Language names are self-named in any interface language.
    expect(radio("Русский")).toBeTruthy();
    expect(radio("English")).toBeTruthy();
  });

  it("offers only v1 languages the bank lists in `available`", async () => {
    const available = [{ code: "ru", title: "Русский" }, { code: "de", title: "Deutsch" }];
    renderApp(languageBank({ available }).adapter, { path: "/settings/language", authenticated: true });
    await screen.findByRole("radiogroup");
    expect(screen.getAllByRole("radio").map((item) => item.getAttribute("value"))).toEqual(["ru"]);
  });

  it("choosing the current language asks nothing and shows nothing", async () => {
    const user = userEvent.setup();
    const { adapter, setLanguage } = languageBank();
    renderApp(adapter, { path: "/settings/language", authenticated: true });
    await screen.findByRole("radiogroup");
    await user.click(radio("Русский"));
    expect(setLanguage).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(radio("Русский").checked).toBe(true);
  });
});

describe("Switching the language", () => {
  it("RU → EN: after a successful setLanguage the whole app is English at once, data untouched", async () => {
    const user = userEvent.setup();
    const { adapter, setLanguage } = languageBank();
    const { router } = renderApp(adapter, { path: "/home", authenticated: true });
    await findScreenTitle("Главная");
    await user.click(nav().getByRole("button", { name: "Настройки" }));
    await openLanguage(user);
    await user.click(radio("English"));
    expect(setLanguage).toHaveBeenCalledExactlyOnceWith({ code: "en" });
    await findScreenTitle("Language"); // SET-04 itself, no reload, same route
    expect(router.state.location.pathname).toBe("/settings/language");
    expect(screen.getByRole("radiogroup", { name: "Interface language" })).toBeTruthy();
    expect(radio("English").checked).toBe(true);

    await user.click(screen.getByRole("button", { name: "Back" }));
    await findScreenTitle("Settings");
    for (const name of ["Change MPIN", "Biometric sign-in", "Language", "Sign out"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    const labels = within(screen.getByRole("navigation", { name: "Main navigation" }))
      .getAllByRole("button")
      .map((button) => button.textContent);
    expect(labels).toEqual(["Home", "Payments", "QR", "Settings", "SBP"]);

    await user.click(nav().getByRole("button", { name: "Home" }));
    await findScreenTitle("Home");
    const card = await screen.findByRole("article", { name: "Счёт для покупок" }); // a name is data
    expect(within(card).getByText("Blocked")).toBeTruthy();
    expect(text(card)).toContain("1 234,56 ₽"); // money format and RUB do not follow the language

    // SET-02 too: its controlled error comes in English.
    await user.click(nav().getByRole("button", { name: "Settings" }));
    await user.click(await screen.findByRole("button", { name: "Change MPIN" }));
    await findScreenTitle("Change MPIN");
    expect(await screen.findByText("Bank is currently unavailable")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send code" })).toBeTruthy();
  });

  it("EN → RU: back to Russian at once after a successful setLanguage", async () => {
    const user = userEvent.setup();
    const { adapter, setLanguage } = languageBank({ current: "en" });
    renderApp(adapter, { path: "/settings", authenticated: true });
    await findScreenTitle("Settings");
    await openLanguage(user);
    await user.click(radio("Русский"));
    expect(setLanguage).toHaveBeenCalledExactlyOnceWith({ code: "ru" });
    await findScreenTitle("Язык");
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await findScreenTitle("Настройки");
    expect(nav().getByRole("button", { name: "Главная" })).toBeTruthy();
  });

  it.each([
    ["an error result", "ru", async (): Promise<Result<void>> => fail("UNAVAILABLE"), "Банк сейчас недоступен", "Язык"],
    ["a thrown error", "ru", async (): Promise<Result<void>> => Promise.reject(new Error("boom")), "Что-то пошло не так", "Язык"],
    ["an error result in English", "en", async (): Promise<Result<void>> => fail("UNAVAILABLE"), "Bank is currently unavailable", "Language"],
  ])("failure with %s: the language stays, the error speaks it, still on SET-04, still signed in", async (_label, current, setLanguage, message, title) => {
    const user = userEvent.setup();
    const { adapter } = languageBank({ current, setLanguage });
    const { router } = renderApp(adapter, { path: "/settings/language", authenticated: true });
    await screen.findByRole("radiogroup");
    const other = current === "ru" ? "English" : "Русский";
    const kept = current === "ru" ? "Русский" : "English";
    await user.click(radio(other));
    expect(await screen.findByText(message)).toBeTruthy();
    await findScreenTitle(title);
    expect(radio(kept).checked).toBe(true);
    expect(radio(other).checked).toBe(false);
    expect(router.state.location.pathname).toBe("/settings/language");
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/home");
  });

  it("logout returns AUTH-01 to Russian; the bank keeps the setting", async () => {
    const user = userEvent.setup();
    const { adapter } = languageBank({ current: "en" });
    adapter.logout = async () => ok();
    const { router } = renderApp(adapter, { path: "/settings", authenticated: true });
    await findScreenTitle("Settings");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await findScreenTitle("Вход");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("an answer that arrives after logout does not change the language of AUTH-01", async () => {
    const user = userEvent.setup();
    let answer: (result: Result<LanguageSettings>) => void = () => undefined;
    const { adapter } = languageBank({ getLanguageSettings: () => new Promise((resolve) => (answer = resolve)) });
    adapter.logout = async () => ok();
    renderApp(adapter, { path: "/settings", authenticated: true });
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    await findScreenTitle("Вход");
    await act(async () => answer(ok({ current: "en", available: BOTH })));
    await findScreenTitle("Вход");
  });
});

describe("SET-04 with real adapters", () => {
  it("NullAdapter: Russian stays usable; SET-04 shows «unavailable» with retry", async () => {
    const user = userEvent.setup();
    const banking = new NullAdapter();
    const get = vi.spyOn(banking, "getLanguageSettings");
    renderApp(banking, { path: "/home", authenticated: true });
    await findScreenTitle("Главная");
    await user.click(nav().getByRole("button", { name: "Настройки" }));
    await openLanguageUnavailable(user);
    const message = screen.getByText("Банк сейчас недоступен");
    expect(message.closest("[data-kind]")?.getAttribute("data-kind")).toBe("unavailable");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    await screen.findByText("Банк сейчас недоступен");
    expect(get).toHaveBeenCalledTimes(2); // once after login, once on the user's retry
  });

  it("DemoAdapter: login → Settings → Language → English; the bank keeps it; the app stores nothing itself", async () => {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    const banking = new DemoAdapter({ storage });
    const local = vi.spyOn(Storage.prototype, "setItem");
    renderApp(banking, { path: "/login" });
    for (const digit of "1234") await user.click(screen.getByRole("button", { name: digit }));
    await findScreenTitle("Главная");
    await user.click(nav().getByRole("button", { name: "Настройки" }));
    await openLanguage(user);
    expect(radio("Русский").checked).toBe(true);
    await user.click(radio("English"));
    await findScreenTitle("Language");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await findScreenTitle("Settings");
    await user.click(nav().getByRole("button", { name: "Home" }));
    await findScreenTitle("Home");
    expect(await screen.findByText("Blocked")).toBeTruthy();
    expect(await banking.getLanguageSettings()).toMatchObject({ ok: true, data: { current: "en" } });
    expect(local).not.toHaveBeenCalled(); // no app language key in localStorage / sessionStorage

    const restarted = new DemoAdapter({ storage }); // same demo storage, new page
    await restarted.login({ method: "mpin", mpin: "1234" });
    expect(await restarted.getLanguageSettings()).toMatchObject({ ok: true, data: { current: "en" } });
  });
});

async function openLanguageUnavailable(user: User) {
  await user.click(await screen.findByRole("button", { name: "Язык" }));
  await findScreenTitle("Язык");
  await screen.findByText("Банк сейчас недоступен");
}
