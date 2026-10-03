// @vitest-environment jsdom
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { CodeDelivery, Result } from "../../adapters/banking/types";
import { APP_PREFERENCES_KEY, saveAppPreferences } from "../../app/appPreferencesStorage";
import { findScreenTitle, memoryPreferenceStorage, renderApp } from "../../test/renderApp";

type User = ReturnType<typeof userEvent.setup>;
const DELIVERY: CodeDelivery = { destinationMasked: "+7 ••• •••-00-01", codeLength: 6, resendAfterSec: 60 };

/** A scripted bank: the change-MPIN operations are spies, everything else records a call. */
function changeMpinBank(overrides: Partial<Pick<BankingAdapter, "verifyOtp" | "changeMpin">> = {}) {
  const stub = stubBankingAdapter();
  const spies = {
    requestOtp: vi.fn(async (): Promise<Result<CodeDelivery>> => ok(DELIVERY)),
    verifyOtp: vi.fn(overrides.verifyOtp ?? (async (): Promise<Result<void>> => ok())),
    changeMpin: vi.fn(overrides.changeMpin ?? (async (): Promise<Result<void>> => ok())),
    setMpin: vi.fn(async (): Promise<Result<void>> => ok()),
    logout: vi.fn(async (): Promise<Result<void>> => ok()),
  };
  const adapter: BankingAdapter = { ...stub.adapter, ...spies };
  return { adapter, ...spies, otherCalls: stub.calls };
}

async function typeCode(user: User, code: string) {
  await user.click(await screen.findByLabelText(/^Код 1 из/));
  await user.keyboard(code);
}

async function typeMpin(user: User, digits: string) {
  for (const digit of digits) await user.click(screen.getByRole("button", { name: digit }));
}

async function enterNewMpin(user: User, digits = "5678") {
  await screen.findByRole("group", { name: "Придумайте MPIN" });
  await typeMpin(user, digits);
  await screen.findByRole("group", { name: "Повторите MPIN" });
  await typeMpin(user, digits);
}

async function pressConfirm(user: User) {
  const button = await screen.findByRole("button", { name: "Подтвердить" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  await user.click(button);
}

describe("SET-02 Change MPIN", () => {
  it("is behind the session guard", () => {
    const { router } = renderApp(changeMpinBank().adapter, { path: "/settings/mpin" });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("runs OTP (change_mpin) → new MPIN → changeMpin → success → SET-01, keeping the session", async () => {
    const user = userEvent.setup();
    const preferenceStorage = memoryPreferenceStorage();
    saveAppPreferences(preferenceStorage, { biometricLoginEnabled: true });
    const bank = changeMpinBank();
    const { router } = renderApp(bank.adapter, { path: "/settings", authenticated: true, preferenceStorage });
    await user.click(screen.getByRole("button", { name: "Сменить MPIN" }));
    expect(router.state.location.pathname).toBe("/settings/mpin");
    await typeCode(user, "123456");
    expect(bank.requestOtp).toHaveBeenCalledExactlyOnceWith({ purpose: "change_mpin" });
    expect(bank.verifyOtp).toHaveBeenCalledExactlyOnceWith({ purpose: "change_mpin", code: "123456" });
    await enterNewMpin(user);
    await pressConfirm(user);
    expect(bank.changeMpin).toHaveBeenCalledExactlyOnceWith({ newMpin: "5678" });
    expect(bank.setMpin).not.toHaveBeenCalled(); // onboarding operation is never used here
    expect(await screen.findByText("MPIN изменён")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/settings/mpin");
    await user.click(screen.getByRole("button", { name: "Готово" }));
    await findScreenTitle("Настройки");
    expect(router.state.location.pathname).toBe("/settings");
    // Session kept; no logout; biometric preference untouched; MPIN nowhere in URL or storage.
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/home");
    expect(bank.logout).not.toHaveBeenCalled();
    expect(JSON.parse(preferenceStorage.getItem(APP_PREFERENCES_KEY) ?? "null")).toEqual({
      version: 1,
      biometricLoginEnabled: true,
    });
    expect(router.state.location.search + router.state.location.hash).not.toContain("5678");
    expect(window.localStorage.length + window.sessionStorage.length).toBe(0);
    expect(bank.otherCalls).toEqual([]);
  });

  it("stays on the OTP step with a controlled error for a wrong code, then accepts the right one", async () => {
    const user = userEvent.setup();
    const results: Result<void>[] = [fail("CODE_INVALID"), ok()];
    const bank = changeMpinBank({ verifyOtp: async () => results.shift() ?? ok() });
    const { router } = renderApp(bank.adapter, { path: "/settings/mpin", authenticated: true });
    await typeCode(user, "000000");
    expect(await screen.findByText("Неверный код")).toBeTruthy();
    expect(screen.queryByRole("group", { name: "Придумайте MPIN" })).toBeNull();
    expect(router.state.location.pathname).toBe("/settings/mpin");
    await typeCode(user, "123456");
    expect(await screen.findByRole("group", { name: "Придумайте MPIN" })).toBeTruthy();
  });

  it("asks again when the two new MPINs differ", async () => {
    const user = userEvent.setup();
    const bank = changeMpinBank();
    renderApp(bank.adapter, { path: "/settings/mpin", authenticated: true });
    await typeCode(user, "123456");
    await screen.findByRole("group", { name: "Придумайте MPIN" });
    await typeMpin(user, "1111");
    await screen.findByRole("group", { name: "Повторите MPIN" });
    await typeMpin(user, "2222");
    expect((await screen.findByRole("alert")).textContent).toContain("MPIN не совпадают");
    expect(screen.getByRole("button", { name: "Подтвердить" }).hasAttribute("disabled")).toBe(true);
    expect(bank.changeMpin).not.toHaveBeenCalled();
  });

  it("keeps a failed change on SET-02 with a controlled message", async () => {
    const user = userEvent.setup();
    const bank = changeMpinBank({ changeMpin: async () => fail("UNAVAILABLE") });
    const { router } = renderApp(bank.adapter, { path: "/settings/mpin", authenticated: true });
    await typeCode(user, "123456");
    await enterNewMpin(user);
    await pressConfirm(user);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Банк сейчас недоступен");
    expect(alert.textContent).not.toContain("UNAVAILABLE");
    expect(router.state.location.pathname).toBe("/settings/mpin");
    expect(screen.queryByText("MPIN изменён")).toBeNull();
  });

  it("offers to request the code again when sending it failed", async () => {
    const user = userEvent.setup();
    const bank = changeMpinBank();
    bank.requestOtp.mockResolvedValueOnce(fail("UNAVAILABLE"));
    renderApp(bank.adapter, { path: "/settings/mpin", authenticated: true });
    const retry = await screen.findByRole("button", { name: "Отправить код" });
    await waitFor(() => expect(retry.hasAttribute("disabled")).toBe(false));
    await user.click(retry);
    expect(await screen.findByLabelText(/^Код 1 из/)).toBeTruthy();
    expect(bank.requestOtp).toHaveBeenCalledTimes(2);
  });

  it("submits changeMpin once even when «Подтвердить» is pressed twice", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const bank = changeMpinBank({
      changeMpin: () =>
        new Promise((resolve) => {
          release = () => resolve(ok());
        }),
    });
    renderApp(bank.adapter, { path: "/settings/mpin", authenticated: true });
    await typeCode(user, "123456");
    await enterNewMpin(user);
    const button = screen.getByRole("button", { name: "Подтвердить" });
    await user.click(button);
    await user.click(button);
    expect(bank.changeMpin).toHaveBeenCalledOnce();
    await act(async () => release());
  });
});

describe("Real DemoAdapter: login → Settings → change MPIN → logout → login with the new MPIN", () => {
  it("connects the UI to the adapter's MPIN change", async () => {
    const user = userEvent.setup();
    const banking = new DemoAdapter({ storage: createMemoryStorage() });
    const { router } = renderApp(banking, { path: "/login" });
    await typeMpin(user, "1234");
    await findScreenTitle("Главная");
    await user.click(within(screen.getByRole("navigation", { name: "Основная навигация" })).getByRole("button", { name: "Настройки" }));
    await user.click(await screen.findByRole("button", { name: "Сменить MPIN" }));
    await typeCode(user, "123456");
    await enterNewMpin(user, "5678");
    await pressConfirm(user);
    await user.click(await screen.findByRole("button", { name: "Готово" }));
    await findScreenTitle("Настройки");
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("group", { name: "Введите MPIN" });

    await typeMpin(user, "1234");
    expect((await screen.findByRole("alert")).textContent).toContain("Неверный MPIN");
    await typeMpin(user, "5678");
    await findScreenTitle("Главная");
    expect(router.state.location.pathname).toBe("/home");
  });
});
