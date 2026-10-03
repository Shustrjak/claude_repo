// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { stubBankingAdapter } from "../adapters/banking/testing/fixtures";
import { DemoDeviceAdapter } from "../adapters/device/DemoDeviceAdapter";
import { findScreenTitle, renderApp } from "../test/renderApp";

const nav = () => screen.queryByRole("navigation", { name: "Основная навигация" });
const navButton = (name: string) => within(screen.getByRole("navigation", { name: "Основная навигация" })).getByRole("button", { name });

describe("Bottom navigation (D-43)", () => {
  it("is on HOME-01 with Home current, and Settings opens SET-01", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/home", authenticated: true });
    expect(nav()).not.toBeNull();
    expect(navButton("Главная").getAttribute("aria-current")).toBe("page");
    await user.click(navButton("Настройки"));
    await findScreenTitle("Настройки");
    expect(router.state.location.pathname).toBe("/settings");
    expect(navButton("Настройки").getAttribute("aria-current")).toBe("page");
  });

  it("is on SET-01, and Home returns to HOME-01", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/settings", authenticated: true });
    await user.click(navButton("Главная"));
    await findScreenTitle("Главная");
    expect(router.state.location.pathname).toBe("/home");
  });

  it("keeps destinations without a screen disabled: no placeholder screens", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(stubBankingAdapter().adapter, { path: "/home", authenticated: true });
    for (const name of ["Платежи", "QR", "Функции СБП"]) {
      const button = navButton(name);
      expect(button.hasAttribute("disabled")).toBe(true);
      await user.click(button);
      expect(router.state.location.pathname).toBe("/home");
    }
  });

  it.each([
    ["/settings/mpin", "Сменить MPIN"],
    ["/settings/biometric", "Вход по биометрии"],
  ])("is not on the nested settings screen %s", async (path, title) => {
    renderApp(stubBankingAdapter().adapter, { path, authenticated: true });
    await findScreenTitle(title);
    expect(nav()).toBeNull();
  });

  it("is not on login, ACC-07 or registration screens", async () => {
    const user = userEvent.setup();
    renderApp(stubBankingAdapter().adapter, { path: "/login", device: new DemoDeviceAdapter() });
    expect(nav()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    await findScreenTitle("Открыть счёт");
    expect(nav()).toBeNull();
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await findScreenTitle("Регистрация");
    expect(nav()).toBeNull();
  });
});
