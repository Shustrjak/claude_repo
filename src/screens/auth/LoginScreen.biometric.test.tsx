// @vitest-environment jsdom
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { NullAdapter } from "../../adapters/banking/NullAdapter";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { LoginRequest, Result } from "../../adapters/banking/types";
import { DemoDeviceAdapter } from "../../adapters/device/DemoDeviceAdapter";
import type { BiometricVerification, DeviceCapabilityAdapter } from "../../adapters/device/DeviceCapabilityAdapter";
import { NullDeviceAdapter } from "../../adapters/device/NullDeviceAdapter";
import { renderApp } from "../../test/renderApp";

const BIOMETRIC = { name: "Войти по биометрии" };

function bankingWithLogin(login: (req: LoginRequest) => Promise<Result<void>>) {
  const loginSpy = vi.fn(login);
  const adapter: BankingAdapter = { ...stubBankingAdapter().adapter, login: loginSpy };
  return { adapter, login: loginSpy };
}

/** A device double: availability is fixed, every challenge resolves as scripted. */
function scriptedDevice(verify: () => Promise<BiometricVerification>) {
  const verifySpy = vi.fn(verify);
  const device: DeviceCapabilityAdapter = { isBiometricAvailable: async () => true, verifyBiometric: verifySpy };
  return { device, verify: verifySpy };
}

async function expectHome(router: { state: { location: { pathname: string } } }) {
  await screen.findByText("Главная");
  expect(router.state.location.pathname).toBe("/home");
}

async function typeMpin(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits) {
    await user.click(screen.getByRole("button", { name: digit }));
  }
}

describe("AUTH-01 biometric login", () => {
  it("offers MPIN only when the device has no biometrics, and MPIN still logs in", async () => {
    for (const device of [new NullDeviceAdapter(), new DemoDeviceAdapter({ biometric: "unavailable" })]) {
      const user = userEvent.setup();
      const { adapter, login } = bankingWithLogin(async () => ok());
      const { router, unmount } = renderApp(adapter, { path: "/login", device });
      await act(async () => undefined); // let the availability check settle
      expect(screen.queryByRole("button", BIOMETRIC)).toBeNull();
      await typeMpin(user, "1234");
      expect(login).toHaveBeenCalledExactlyOnceWith({ method: "mpin", mpin: "1234" });
      await expectHome(router);
      unmount();
    }
  });

  it("verifies on the device, then logs in to the bank with the frozen biometric shape", async () => {
    const user = userEvent.setup();
    const { adapter, login } = bankingWithLogin(async () => ok());
    const { device, verify } = scriptedDevice(async () => "verified");
    const { router } = renderApp(adapter, { path: "/login", device });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    expect(verify).toHaveBeenCalledOnce();
    expect(login).toHaveBeenCalledExactlyOnceWith({ method: "biometric" });
    await expectHome(router);
  });

  it("does not ask the bank when the device does not verify, and falls back to MPIN", async () => {
    const user = userEvent.setup();
    const { adapter, login } = bankingWithLogin(async () => ok());
    const { router } = renderApp(adapter, { path: "/login", device: new DemoDeviceAdapter({ biometric: "rejects" }) });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    expect(login).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("Биометрия не подтверждена");
    expect(router.state.location.pathname).toBe("/login");
    await typeMpin(user, "1234");
    expect(login).toHaveBeenCalledExactlyOnceWith({ method: "mpin", mpin: "1234" });
    await expectHome(router);
  });

  it("treats a throwing device like a failed verification", async () => {
    const user = userEvent.setup();
    const { adapter, login } = bankingWithLogin(async () => ok());
    const { device } = scriptedDevice(async () => {
      throw new Error("sensor");
    });
    renderApp(adapter, { path: "/login", device });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    expect(login).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).not.toContain("sensor");
  });

  it("keeps the session closed when the bank rejects a verified biometric login", async () => {
    const user = userEvent.setup();
    const { adapter } = bankingWithLogin(async () => fail("STATE_CONFLICT"));
    const { router } = renderApp(adapter, { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    expect((await screen.findByRole("alert")).textContent).toContain("На этом устройстве нет регистрации");
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/login");
  });

  it("allows one authentication attempt at a time across both methods", async () => {
    const user = userEvent.setup();
    let finishVerification: (value: BiometricVerification) => void = () => undefined;
    const { device, verify } = scriptedDevice(
      () =>
        new Promise((resolve) => {
          finishVerification = resolve;
        }),
    );
    const { adapter, login } = bankingWithLogin(async () => ok());
    renderApp(adapter, { path: "/login", device });
    const biometric = await screen.findByRole("button", BIOMETRIC);
    await user.click(biometric);
    await user.click(biometric);
    await user.click(screen.getByRole("button", { name: "Войти по MPIN" }));
    expect(verify).toHaveBeenCalledOnce();
    expect(screen.queryByRole("group", { name: "Введите MPIN" })).toBeNull();
    await act(async () => finishVerification("verified"));
    expect(login).toHaveBeenCalledExactlyOnceWith({ method: "biometric" });
  });

  it("persists nothing about biometrics in browser storage", async () => {
    const user = userEvent.setup();
    const { adapter } = bankingWithLogin(async () => ok());
    const { router } = renderApp(adapter, { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    await expectHome(router);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });
});

describe("Banking and device boundaries are independent", () => {
  const demoBanking = () => new DemoAdapter({ storage: createMemoryStorage() });

  it("Demo banking + Demo device: biometric login reaches Home", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoBanking(), { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    await expectHome(router);
  });

  it("Demo banking + Null device: MPIN only, and MPIN reaches Home", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoBanking(), { path: "/login", device: new NullDeviceAdapter() });
    await act(async () => undefined);
    expect(screen.queryByRole("button", BIOMETRIC)).toBeNull();
    await typeMpin(user, "1234");
    await expectHome(router);
  });

  it("Null banking + Demo device: the device verifies, the bank is unavailable, no session", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(new NullAdapter(), { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(await screen.findByRole("button", BIOMETRIC));
    expect((await screen.findByRole("alert")).textContent).toContain("Банк сейчас недоступен");
    expect(router.state.location.pathname).toBe("/login");
  });
});
