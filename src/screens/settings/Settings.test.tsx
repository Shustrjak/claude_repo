// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { Result } from "../../adapters/banking/types";
import { DemoDeviceAdapter } from "../../adapters/device/DemoDeviceAdapter";
import type { DeviceCapabilityAdapter } from "../../adapters/device/DeviceCapabilityAdapter";
import { APP_PREFERENCES_KEY, saveAppPreferences } from "../../app/appPreferencesStorage";
import { memoryPreferenceStorage, renderApp } from "../../test/renderApp";

const BIOMETRIC_LOGIN = { name: "Войти по биометрии" };

function bankingWithLogout(logout: () => Promise<Result<void>>) {
  const stub = stubBankingAdapter();
  const logoutSpy = vi.fn(logout);
  const adapter: BankingAdapter = { ...stub.adapter, logout: logoutSpy };
  return { adapter, logout: logoutSpy, otherCalls: stub.calls };
}

/** A device double whose calls are recorded; `available` is fixed. */
function recordingDevice(available: boolean) {
  const isBiometricAvailable = vi.fn(async () => available);
  const verifyBiometric = vi.fn(async () => "verified" as const);
  const device: DeviceCapabilityAdapter = {
    isBiometricAvailable,
    verifyBiometric,
    getSimCards: async () => [],
    bindSim: async () => "not_bound",
  };
  return { device, isBiometricAvailable, verifyBiometric };
}

function storedPreference(storage: { getItem: (key: string) => string | null }) {
  return JSON.parse(storage.getItem(APP_PREFERENCES_KEY) ?? "null") as unknown;
}

function biometricToggle(): HTMLInputElement {
  const toggle = screen.getByLabelText(/Входить по биометрии/);
  if (!(toggle instanceof HTMLInputElement)) throw new Error("toggle is not an input");
  return toggle;
}

describe("SET-01 Settings", () => {
  it.each(["/settings", "/settings/biometric"])("sends an unauthenticated visit to %s to login", (path) => {
    const { router } = renderApp(stubBankingAdapter().adapter, { path });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("shows the rows of its composition, all active (SET-04 by D-49)", () => {
    renderApp(stubBankingAdapter().adapter, { path: "/settings", authenticated: true });
    expect(screen.getByRole("button", { name: "Сменить MPIN" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Язык" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Вход по биометрии" }).hasAttribute("disabled")).toBe(false);
    expect(screen.getByRole("button", { name: "Выйти" }).hasAttribute("disabled")).toBe(false);
  });

  it("logs out immediately: logout() once, session closed, back to AUTH-01, no confirmation", async () => {
    const user = userEvent.setup();
    const { adapter, logout, otherCalls } = bankingWithLogout(async () => ok());
    const { router } = renderApp(adapter, { path: "/settings", authenticated: true });
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    expect(logout).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByText(/Выйти\?/)).toBeNull();
    await screen.findByRole("group", { name: "Введите MPIN" });
    expect(router.state.location.pathname).toBe("/login");
    await act(() => router.navigate("/settings"));
    expect(router.state.location.pathname).toBe("/login"); // the session is closed
    expect(otherCalls).toEqual(["getLanguageSettings"]); // the app's own language load (D-49)
  });

  it.each([
    ["an error result", async (): Promise<Result<void>> => fail("UNAVAILABLE")],
    [
      "a thrown error",
      async (): Promise<Result<void>> => {
        throw new Error("network");
      },
    ],
  ])("D-44: closes the app session even when logout returns %s", async (_label, logoutImpl) => {
    const user = userEvent.setup();
    const { adapter, logout } = bankingWithLogout(logoutImpl);
    const { router } = renderApp(adapter, { path: "/settings", authenticated: true });
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("group", { name: "Введите MPIN" });
    expect(logout).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/login");
    expect(screen.queryByText(/Не удалось выйти/)).toBeNull();
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/login");
  });

  it("logs out once even when «Выйти» is pressed twice", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    const { adapter, logout } = bankingWithLogout(
      () =>
        new Promise((resolve) => {
          release = () => resolve(ok());
        }),
    );
    renderApp(adapter, { path: "/settings", authenticated: true });
    const button = screen.getByRole("button", { name: "Выйти" });
    await user.click(button);
    await user.click(button);
    expect(logout).toHaveBeenCalledOnce();
    await act(async () => release());
  });
});

describe("SET-03 Biometric login setting", () => {
  const cases = [
    ["device available, stored off", true, false, { checked: false, disabled: false, unavailable: false }],
    ["device available, stored on", true, true, { checked: true, disabled: false, unavailable: false }],
    ["device unavailable, stored off", false, false, { checked: false, disabled: true, unavailable: true }],
    ["device unavailable, stored on", false, true, { checked: false, disabled: true, unavailable: true }],
  ] as const;

  for (const [label, available, stored, expected] of cases) {
    it(`${label}: shows the effective setting`, async () => {
      const preferenceStorage = memoryPreferenceStorage();
      saveAppPreferences(preferenceStorage, { biometricLoginEnabled: stored });
      const { device, verifyBiometric } = recordingDevice(available);
      const { adapter, otherCalls } = bankingWithLogout(async () => ok());
      renderApp(adapter, { path: "/settings/biometric", authenticated: true, device, preferenceStorage });
      await screen.findByLabelText(/Входить по биометрии/);
      expect(biometricToggle().checked).toBe(expected.checked);
      expect(biometricToggle().disabled).toBe(expected.disabled);
      expect(screen.queryByText("Биометрия недоступна") !== null).toBe(expected.unavailable);
      // Showing the setting changes nothing: stored value, bank and device stay untouched.
      expect(storedPreference(preferenceStorage)).toEqual({ version: 1, biometricLoginEnabled: stored });
      expect(otherCalls.filter((call) => call !== "getLanguageSettings")).toEqual([]); // language load aside (D-49)
      expect(verifyBiometric).not.toHaveBeenCalled();
    });
  }

  it("enables and disables the one app preference, which survives a restart", async () => {
    const user = userEvent.setup();
    const preferenceStorage = memoryPreferenceStorage();
    const { device, isBiometricAvailable, verifyBiometric } = recordingDevice(true);
    const { adapter, otherCalls } = bankingWithLogout(async () => ok());
    const first = renderApp(adapter, { path: "/settings/biometric", authenticated: true, device, preferenceStorage });
    await screen.findByLabelText(/Входить по биометрии/);
    await user.click(biometricToggle());
    expect(storedPreference(preferenceStorage)).toEqual({ version: 1, biometricLoginEnabled: true });
    first.unmount();

    renderApp(adapter, { path: "/settings/biometric", authenticated: true, device, preferenceStorage });
    await screen.findByLabelText(/Входить по биометрии/);
    await waitFor(() => expect(biometricToggle().checked).toBe(true));
    await user.click(biometricToggle());
    expect(storedPreference(preferenceStorage)).toEqual({ version: 1, biometricLoginEnabled: false });

    // The device was only asked; nothing was verified; the bank was not involved.
    expect(isBiometricAvailable).toHaveBeenCalled();
    expect(verifyBiometric).not.toHaveBeenCalled();
    expect(otherCalls.filter((call) => call !== "getLanguageSettings")).toEqual([]); // language load aside (D-49)
  });
});

describe("SET-03 → app preference → AUTH-01", () => {
  async function toggleThenLogout(initiallyEnabled: boolean) {
    const user = userEvent.setup();
    const preferenceStorage = memoryPreferenceStorage();
    saveAppPreferences(preferenceStorage, { biometricLoginEnabled: initiallyEnabled });
    const banking = new DemoAdapter({ storage: createMemoryStorage() });
    const device = new DemoDeviceAdapter(); // biometrics available
    const { router } = renderApp(banking, { path: "/settings", authenticated: true, device, preferenceStorage });
    await user.click(screen.getByRole("button", { name: "Вход по биометрии" }));
    await screen.findByLabelText(/Входить по биометрии/);
    await waitFor(() => expect(biometricToggle().checked).toBe(initiallyEnabled));
    await user.click(biometricToggle());
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(screen.getByRole("button", { name: "Выйти" }));
    await screen.findByRole("group", { name: "Введите MPIN" });
    expect(router.state.location.pathname).toBe("/login");
    await act(async () => undefined); // let AUTH-01 ask the device
  }

  it("disabled in SET-03 → AUTH-01 offers MPIN only, even on a biometric device", async () => {
    await toggleThenLogout(true);
    expect(screen.queryByRole("button", BIOMETRIC_LOGIN)).toBeNull();
  });

  it("enabled in SET-03 → AUTH-01 offers biometric login", async () => {
    await toggleThenLogout(false);
    expect(await screen.findByRole("button", BIOMETRIC_LOGIN)).toBeTruthy();
  });
});
