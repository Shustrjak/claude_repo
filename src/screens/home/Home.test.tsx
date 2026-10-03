// @vitest-environment jsdom
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { NullAdapter } from "../../adapters/banking/NullAdapter";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { AccountSummary, Result } from "../../adapters/banking/types";
import { findScreenTitle, renderApp } from "../../test/renderApp";

const rub = (amount: number) => ({ amount, currency: "RUB" as const });

/** Deliberately unsorted: blocked first, then a smaller and a larger active balance, names not alphabetical. */
const UNSORTED: AccountSummary[] = [
  { id: "z-9", name: "Яхта", maskedNumber: "•• 9001", balance: rub(500), status: "blocked" },
  { id: "a-1", name: "Бытовой", maskedNumber: "•• 0002", balance: rub(100), status: "active" },
  { id: "m-5", name: "Аренда", maskedNumber: "•• 5555", balance: rub(99_999_99), status: "active" },
];

/** A bank whose only scripted answer is `getAccounts`; every other operation is recorded. */
function bankWithAccounts(getAccounts: () => Promise<Result<AccountSummary[]>>) {
  const stub = stubBankingAdapter();
  const spy = vi.fn(getAccounts);
  const adapter: BankingAdapter = { ...stub.adapter, getAccounts: spy };
  return { adapter, getAccounts: spy, otherCalls: stub.calls };
}

function openHome(adapter: BankingAdapter) {
  return renderApp(adapter, { path: "/home", authenticated: true });
}

function cards() {
  return screen.queryAllByRole("article");
}

function nav() {
  return within(screen.getByRole("navigation", { name: "Основная навигация" }));
}

/** Normalises the thin and non-breaking spaces of the money format for comparison. */
function text(element: HTMLElement) {
  return (element.textContent ?? "").replace(/[\s\u00a0\u2009\u202f]+/g, " ").trim();
}

describe("HOME-01 accounts (D-47)", () => {
  it("renders every account in exactly the adapter's order, with no sorting", async () => {
    const { adapter, getAccounts } = bankWithAccounts(async () => ok(UNSORTED));
    openHome(adapter);
    await screen.findByRole("list", { name: "Счета" });
    expect(cards().map((card) => card.getAttribute("aria-label"))).toEqual(["Яхта", "Бытовой", "Аренда"]);
    expect(within(screen.getByRole("list", { name: "Счета" })).getAllByRole("listitem")).toHaveLength(3);
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it("keeps a different adapter order too: the order is the adapter's, not a rule of the UI", async () => {
    const reversed = [...UNSORTED].reverse();
    openHome(bankWithAccounts(async () => ok(reversed)).adapter);
    await screen.findByRole("list", { name: "Счета" });
    expect(cards().map((card) => card.getAttribute("aria-label"))).toEqual(["Аренда", "Бытовой", "Яхта"]);
  });

  it("zero accounts: the empty state, no card, no redirect, session kept", async () => {
    const { adapter, getAccounts } = bankWithAccounts(async () => ok([]));
    const { router } = openHome(adapter);
    const empty = await screen.findByText("Счетов пока нет");
    expect(empty.closest("[data-kind]")?.getAttribute("data-kind")).toBe("empty");
    expect(cards()).toHaveLength(0);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: /Открыть счёт|Повторить/ })).toBeNull(); // no CTA, no retry
    expect(router.state.location.pathname).toBe("/home");
    expect(getAccounts).toHaveBeenCalledOnce();
  });

  it("one account: exactly one card, shown as is", async () => {
    openHome(bankWithAccounts(async () => ok([UNSORTED[1] as AccountSummary])).adapter);
    await screen.findByRole("list", { name: "Счета" });
    expect(cards()).toHaveLength(1);
    const card = cards()[0] as HTMLElement;
    expect(card.getAttribute("aria-label")).toBe("Бытовой");
    expect(within(card).getByText("•• 0002")).toBeTruthy();
  });

  it("blocked: visible in its place with the status, no reason, date or remediation action", async () => {
    openHome(bankWithAccounts(async () => ok(UNSORTED)).adapter);
    await screen.findByRole("list", { name: "Счета" });
    const [blocked, ...active] = cards() as [HTMLElement, ...HTMLElement[]];
    expect(blocked.getAttribute("aria-label")).toBe("Яхта");
    expect(within(blocked).getByText("Заблокирован")).toBeTruthy();
    expect(within(blocked).queryAllByRole("button")).toHaveLength(0);
    expect(within(blocked).queryAllByRole("link")).toHaveLength(0);
    for (const card of active) expect(within(card).queryByText("Заблокирован")).toBeNull();
    expect(screen.getAllByText("Заблокирован")).toHaveLength(1);
  });

  it("cards are presentation only: no button or link, a click goes nowhere, no special account", async () => {
    const user = userEvent.setup();
    const { adapter, otherCalls } = bankWithAccounts(async () => ok(UNSORTED));
    const { router } = openHome(adapter);
    await screen.findByRole("list", { name: "Счета" });
    const list = screen.getByRole("list", { name: "Счета" });
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
    expect(within(list).queryAllByRole("link")).toHaveLength(0);
    for (const card of cards()) await user.click(card);
    expect(router.state.location.pathname).toBe("/home");
    expect(text(list)).not.toMatch(/основн|по умолчанию|предпочт|выбран/i);
    // Q-30 is open: no mini statement, so no transaction fetch; nothing else is asked either.
    expect(otherCalls).toEqual([]);
  });

  it("formats kopecks exactly: 123456 → 1 234,56 ₽ and 100 → 1 ₽", async () => {
    const accounts: AccountSummary[] = [
      { id: "k", name: "Копейки", maskedNumber: "•• 1111", balance: rub(123_456), status: "active" },
      { id: "r", name: "Рубль", maskedNumber: "•• 2222", balance: rub(100), status: "active" },
    ];
    openHome(bankWithAccounts(async () => ok(accounts)).adapter);
    await screen.findByRole("list", { name: "Счета" });
    const [kopecks, rouble] = cards() as [HTMLElement, HTMLElement];
    expect(text(kopecks)).toContain("1 234,56 ₽");
    expect(text(rouble)).toContain("1 ₽");
    expect(text(rouble)).not.toContain("1,00");
  });
});

describe("HOME-01 accounts: loading and failures", () => {
  it("shows loading until getAccounts resolves, then the accounts replace it", async () => {
    let resolve: (result: Result<AccountSummary[]>) => void = () => undefined;
    const { adapter } = bankWithAccounts(() => new Promise((done) => (resolve = done)));
    openHome(adapter);
    const loading = await screen.findByRole("status", { name: "Загрузка" });
    expect(loading).toBeTruthy();
    expect(screen.queryByText("Счетов пока нет")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(cards()).toHaveLength(0);
    await act(async () => resolve(ok(UNSORTED)));
    expect(screen.queryByRole("status", { name: "Загрузка" })).toBeNull();
    expect(cards()).toHaveLength(3);
  });

  it("UNAVAILABLE: a controlled unavailable state; shell, session and navigation stay usable", async () => {
    const user = userEvent.setup();
    const { adapter } = bankWithAccounts(async () => fail("UNAVAILABLE"));
    const { router } = openHome(adapter);
    const message = await screen.findByText("Банк сейчас недоступен");
    expect(message.closest("[data-kind]")?.getAttribute("data-kind")).toBe("unavailable");
    expect(screen.queryByText(/UNAVAILABLE/)).toBeNull();
    expect(cards()).toHaveLength(0);
    expect(screen.queryByText("Счетов пока нет")).toBeNull();
    await findScreenTitle("Главная");
    await user.click(nav().getByRole("button", { name: "Настройки" }));
    await findScreenTitle("Настройки");
    expect(router.state.location.pathname).toBe("/settings"); // still signed in
  });

  it("a thrown error: a generic controlled error, no crash, the session stays open", async () => {
    const { adapter } = bankWithAccounts(async () => {
      throw new Error("boom");
    });
    const { router } = openHome(adapter);
    expect(await screen.findByText("Не удалось загрузить счета")).toBeTruthy();
    expect(screen.queryByText(/boom/)).toBeNull();
    await act(() => router.navigate("/settings"));
    expect(router.state.location.pathname).toBe("/settings");
  });

  it.each(["SESSION_EXPIRED", "UNKNOWN"] as const)("%s: a controlled error without the raw code, no sign-out", async (code) => {
    const { adapter } = bankWithAccounts(async () => fail(code));
    const { router } = openHome(adapter);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).not.toContain(code);
    await act(() => router.navigate("/settings"));
    expect(router.state.location.pathname).toBe("/settings");
  });

  it("«Повторить» (AsyncContent.onRetry) asks again and shows the accounts", async () => {
    const user = userEvent.setup();
    const answers: Result<AccountSummary[]>[] = [fail("UNAVAILABLE"), ok(UNSORTED)];
    const { adapter, getAccounts } = bankWithAccounts(async () => answers.shift() ?? fail("UNKNOWN"));
    openHome(adapter);
    await user.click(await screen.findByRole("button", { name: "Повторить" }));
    await screen.findByRole("list", { name: "Счета" });
    expect(getAccounts).toHaveBeenCalledTimes(2);
    expect(cards()).toHaveLength(3);
  });

  it("loads accounts only on HOME-01: not on login, not in Settings", async () => {
    const { adapter, getAccounts } = bankWithAccounts(async () => ok(UNSORTED));
    renderApp(adapter, { path: "/login" }).unmount();
    renderApp(adapter, { path: "/settings", authenticated: true });
    await findScreenTitle("Настройки");
    expect(getAccounts).not.toHaveBeenCalled();
  });
});

describe("HOME-01 with real adapters", () => {
  it("NullAdapter: [] is a valid empty home, not «bank unavailable»", async () => {
    const banking = new NullAdapter();
    const transactions = vi.spyOn(banking, "getRecentTransactions");
    openHome(banking);
    expect(await screen.findByText("Счетов пока нет")).toBeTruthy();
    expect(screen.queryByText("Банк сейчас недоступен")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(cards()).toHaveLength(0);
    expect(transactions).not.toHaveBeenCalled();
  });

  it("DemoAdapter: login → HOME-01 shows the demo accounts, the blocked one included, without transactions", async () => {
    const user = userEvent.setup();
    const banking = new DemoAdapter({ storage: createMemoryStorage() });
    const transactions = vi.spyOn(banking, "getRecentTransactions");
    renderApp(banking, { path: "/login" });
    for (const digit of "1234") await user.click(screen.getByRole("button", { name: digit }));
    await findScreenTitle("Главная");
    await screen.findByRole("list", { name: "Счета" });
    const expected = await banking.getAccounts(); // through the interface, not its storage
    if (!expected.ok) throw new Error("demo accounts unavailable");
    expect(expected.data.length).toBeGreaterThan(1);
    expect(cards().map((card) => card.getAttribute("aria-label"))).toEqual(expected.data.map((account) => account.name));
    const blocked = expected.data.filter((account) => account.status === "blocked");
    expect(blocked.length).toBeGreaterThan(0);
    for (const account of blocked) {
      expect(within(screen.getByRole("article", { name: account.name })).getByText("Заблокирован")).toBeTruthy();
    }
    await waitFor(() => expect(transactions).not.toHaveBeenCalled());
  });
});
