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
import { renderApp } from "../../test/renderApp";

/** A test double of the interface: login is scripted, every other operation records a call. */
function adapterWithLogin(login: (req: LoginRequest) => Promise<Result<void>>) {
  const stub = stubBankingAdapter();
  const loginSpy = vi.fn(login);
  const adapter: BankingAdapter = { ...stub.adapter, login: loginSpy };
  return { adapter, login: loginSpy, otherCalls: stub.calls };
}

/** Home actually rendered (not just a transient URL the guard then redirects away from). */
async function expectHome(router: { state: { location: { pathname: string } } }) {
  await screen.findByText("Главная");
  expect(router.state.location.pathname).toBe("/home");
}

async function typeMpinOnKeypad(user: ReturnType<typeof userEvent.setup>, digits: string) {
  for (const digit of digits) {
    await user.click(screen.getByRole("button", { name: digit }));
  }
}

describe("AUTH-01 Login", () => {
  it("is the application entry and calls no banking operation on render", () => {
    const { adapter, login, otherCalls } = adapterWithLogin(async () => ok());
    const { router } = renderApp(adapter, { path: "/" });
    expect(router.state.location.pathname).toBe("/login");
    expect(screen.getByRole("group", { name: "Введите MPIN" })).toBeTruthy();
    expect(login).not.toHaveBeenCalled();
    expect(otherCalls).toEqual([]);
  });

  it("logs in with a 4-digit MPIN through BankingAdapter.login and opens Home", async () => {
    const user = userEvent.setup();
    const { adapter, login, otherCalls } = adapterWithLogin(async () => ok());
    const { router } = renderApp(adapter, { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    expect(login).toHaveBeenCalledExactlyOnceWith({ method: "mpin", mpin: "1234" });
    await expectHome(router);
    expect(otherCalls).toEqual([]); // login is login: Home data is not loaded here
  });

  it("accepts digits from a physical keyboard and never submits fewer than 4", async () => {
    const user = userEvent.setup();
    const { adapter, login } = adapterWithLogin(async () => ok());
    renderApp(adapter, { path: "/login" });
    screen.getByRole("group", { name: "Введите MPIN" }).focus();
    await user.keyboard("12a3");
    expect(login).not.toHaveBeenCalled();
    await user.keyboard("{Backspace}");
    expect(login).not.toHaveBeenCalled();
    await user.keyboard("34");
    expect(login).toHaveBeenCalledExactlyOnceWith({ method: "mpin", mpin: "1234" });
  });

  it("stays on login with a controlled error and an empty input after a wrong MPIN", async () => {
    const user = userEvent.setup();
    const { adapter } = adapterWithLogin(async () => fail("MPIN_INVALID"));
    const { router } = renderApp(adapter, { path: "/login" });
    await typeMpinOnKeypad(user, "9999");
    expect((await screen.findByRole("alert")).textContent).toBe("Неверный MPIN. Попробуйте ещё раз.");
    expect(router.state.location.pathname).toBe("/login");
    expect(screen.queryByRole("button", { name: "Удалить последний символ" })).toBeNull();
    // A failed login does not authenticate: Home is still guarded.
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/login");
  });

  it("shows a status message, not a raw error, for other failures and a throwing adapter", async () => {
    const user = userEvent.setup();
    const { adapter } = adapterWithLogin(async () => {
      throw new Error("boom");
    });
    renderApp(adapter, { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Не удалось войти");
    expect(alert.textContent).not.toMatch(/boom|UNKNOWN/);
  });

  it("handles NullAdapter without crashing", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(new NullAdapter(), { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Банк сейчас недоступен");
    expect(alert.textContent).not.toContain("UNAVAILABLE");
    expect(router.state.location.pathname).toBe("/login");
  });

  it("logs in against DemoAdapter end to end with the demo MPIN", async () => {
    const user = userEvent.setup();
    const demo = new DemoAdapter({ storage: createMemoryStorage() });
    const { router } = renderApp(demo, { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    await expectHome(router);
  });

  it("blocks repeated submission while a login is in flight", async () => {
    const user = userEvent.setup();
    let resolve: (result: Result<void>) => void = () => undefined;
    const { adapter, login } = adapterWithLogin(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    renderApp(adapter, { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    const group = screen.getByRole("group", { name: "Введите MPIN" });
    expect(group.getAttribute("aria-disabled")).toBe("true");
    group.focus();
    await user.keyboard("{Backspace}5");
    await user.click(screen.getByRole("button", { name: "1" }));
    expect(login).toHaveBeenCalledTimes(1);
    await act(async () => resolve(fail("MPIN_INVALID")));
    expect(screen.getByRole("group", { name: "Введите MPIN" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("keeps the MPIN out of storage and the URL", async () => {
    const user = userEvent.setup();
    const { adapter } = adapterWithLogin(async () => ok());
    const { router } = renderApp(adapter, { path: "/login" });
    await typeMpinOnKeypad(user, "1234");
    await expectHome(router);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(router.state.location.search + router.state.location.hash).not.toContain("1234");
  });

  it("keeps the register and open-account intents visible but unavailable", () => {
    renderApp(adapterWithLogin(async () => ok()).adapter, { path: "/login" });
    for (const name of ["Открыть счёт", "Зарегистрироваться"]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
    }
  });

  it("offers MPIN only while the device boundary reports no biometrics", () => {
    renderApp(adapterWithLogin(async () => ok()).adapter, { path: "/login" });
    expect(screen.queryByRole("button", { name: "Войти по биометрии" })).toBeNull();
  });
});

describe("Route guard", () => {
  it("sends an unauthenticated visit to Home back to login", () => {
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/home" });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("lets an authenticated session open Home", () => {
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/home", authenticated: true });
    expect(router.state.location.pathname).toBe("/home");
    expect(screen.getByText("Главная")).toBeTruthy();
  });

  it("sends unknown paths to login", () => {
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/acc-02" });
    expect(router.state.location.pathname).toBe("/login");
  });
});
