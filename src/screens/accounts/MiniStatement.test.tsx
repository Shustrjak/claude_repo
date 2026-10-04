// @vitest-environment jsdom
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "../../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage } from "../../adapters/banking/demo/storage";
import { NullAdapter } from "../../adapters/banking/NullAdapter";
import { fail, ok } from "../../adapters/banking/result";
import { stubBankingAdapter } from "../../adapters/banking/testing/fixtures";
import type { AccountSummary, Result, Transaction } from "../../adapters/banking/types";
import { findScreenTitle, renderApp } from "../../test/renderApp";

const rub = (amount: number) => ({ amount, currency: "RUB" as const });

const ACCOUNTS: AccountSummary[] = [
  { id: "acc-1", name: "Первый", maskedNumber: "•• 1111", balance: rub(100_00), status: "active" },
  { id: "acc-2", name: "Второй", maskedNumber: "•• 2222", balance: rub(200_00), status: "active" },
  { id: "acc-3", name: "Закрытый для списаний", maskedNumber: "•• 3333", balance: rub(300_00), status: "blocked" },
];

// Midday UTC: the same calendar day in every time zone from UTC−11 to UTC+11.
const TRANSACTIONS: Record<string, Transaction[]> = {
  "acc-1": [{ id: "t1", title: "Операция первого счёта", date: "2026-09-10T12:00:00Z", amount: rub(-100), status: "success" }],
  "acc-2": [
    // Deliberately unsorted by date, amount and title.
    { id: "t2", title: "Кафе", date: "2026-09-01T12:00:00Z", amount: rub(-245_090), status: "pending" },
    { id: "t3", title: "Зарплата", date: "2026-09-28T12:00:00Z", amount: rub(8_500_000), status: "success" },
    { id: "t4", title: "Аптека", date: "2026-09-15T12:00:00Z", amount: rub(-1_000), status: "failure" },
  ],
  "acc-3": [{ id: "t5", title: "Пополнение", date: "2026-08-01T12:00:00Z", amount: rub(500_000), status: "success" }],
};

type Get = BankingAdapter["getRecentTransactions"];

/** A bank with accounts and account-scoped operations; `language` is what the bank keeps (D-49). */
function statementBank({
  getRecentTransactions = async ({ accountId }) => ok(TRANSACTIONS[accountId] ?? []),
  language = "ru",
}: { getRecentTransactions?: Get; language?: string } = {}) {
  const stub = stubBankingAdapter();
  const recent = vi.fn(getRecentTransactions);
  const accounts = vi.fn(async (): Promise<Result<AccountSummary[]>> => ok(ACCOUNTS));
  const adapter: BankingAdapter = {
    ...stub.adapter,
    getAccounts: accounts,
    getRecentTransactions: recent,
    getLanguageSettings: async () =>
      ok({ current: language, available: [{ code: "ru", title: "Русский" }, { code: "en", title: "English" }] }),
  };
  return { adapter, getRecentTransactions: recent, getAccounts: accounts };
}

const titles = () => screen.getAllByRole("listitem").map((row) => row.textContent ?? "");
const text = (element: HTMLElement) => (element.textContent ?? "").replace(/[\s\u00a0\u2009\u202f]+/g, " ");

async function openFromHome(name: string, bank = statementBank()) {
  const user = userEvent.setup();
  const view = renderApp(bank.adapter, { path: "/home", authenticated: true });
  await user.click(within(await screen.findByRole("article", { name })).getByRole("button"));
  await findScreenTitle("Мини-выписка");
  return { user, ...view, ...bank };
}

describe("HOME-01 → ACC-02 (D-51)", () => {
  it("the SECOND card opens the second account: exact request, its route, only its operations", async () => {
    const { router, getRecentTransactions } = await openFromHome("Второй");
    expect(router.state.location.pathname).toBe("/accounts/acc-2/transactions");
    expect(getRecentTransactions).toHaveBeenCalledExactlyOnceWith({ accountId: "acc-2", limit: 10 });
    await screen.findByRole("list", { name: "Операции" });
    expect(screen.queryByText("Операция первого счёта")).toBeNull();
    expect(titles()).toHaveLength(3);
  });

  it("a direct visit to the account's address asks for that account, limit 10, without getAccounts", async () => {
    const { adapter, getRecentTransactions, getAccounts } = statementBank();
    renderApp(adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    await screen.findByRole("list", { name: "Операции" });
    expect(getRecentTransactions).toHaveBeenCalledExactlyOnceWith({ accountId: "acc-2", limit: 10 });
    expect(getAccounts).not.toHaveBeenCalled(); // no hidden account rediscovery
  });

  it("an unauthenticated visit goes to login and asks nothing", () => {
    const { adapter, getRecentTransactions } = statementBank();
    const { router } = renderApp(adapter, { path: "/accounts/acc-2/transactions" });
    expect(router.state.location.pathname).toBe("/login");
    expect(getRecentTransactions).not.toHaveBeenCalled();
  });

  it.each([
    ["Enter", "{Enter}"],
    ["Space", " "],
  ])("opens from the keyboard with %s", async (_label, key) => {
    const user = userEvent.setup();
    const { adapter, getRecentTransactions } = statementBank();
    const { router } = renderApp(adapter, { path: "/home", authenticated: true });
    const card = within(await screen.findByRole("article", { name: "Второй" })).getByRole("button");
    card.focus();
    expect(document.activeElement).toBe(card);
    await user.keyboard(key);
    await findScreenTitle("Мини-выписка");
    expect(router.state.location.pathname).toBe("/accounts/acc-2/transactions");
    expect(getRecentTransactions).toHaveBeenCalledExactlyOnceWith({ accountId: "acc-2", limit: 10 });
  });

  it("a blocked account opens its history like any other (D-25 limits only transfers)", async () => {
    const { router, getRecentTransactions } = await openFromHome("Закрытый для списаний");
    expect(router.state.location.pathname).toBe("/accounts/acc-3/transactions");
    expect(getRecentTransactions).toHaveBeenCalledExactlyOnceWith({ accountId: "acc-3", limit: 10 });
    expect(await screen.findByText("Пополнение")).toBeTruthy();
  });

  it("Home itself fetches no operations (D-52); only activating a card does", async () => {
    const { adapter, getRecentTransactions } = statementBank();
    renderApp(adapter, { path: "/home", authenticated: true });
    await screen.findByRole("list", { name: "Счета" });
    expect(screen.queryByRole("list", { name: "Операции" })).toBeNull();
    expect(getRecentTransactions).not.toHaveBeenCalled();
  });

  it("«Назад» returns to HOME-01; ACC-02 has no bottom navigation", async () => {
    const { user, router } = await openFromHome("Первый");
    expect(screen.queryByRole("navigation")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await findScreenTitle("Главная");
    expect(router.state.location.pathname).toBe("/home");
  });
});

describe("ACC-02 content (D-53)", () => {
  it("keeps the adapter's order and shows bank data as it came", async () => {
    renderApp(statementBank().adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    await screen.findByRole("list", { name: "Операции" });
    const items = titles();
    expect(items[0]).toContain("Кафе");
    expect(items[1]).toContain("Зарплата");
    expect(items[2]).toContain("Аптека");
  });

  it("Russian: day and month, signed amounts in RUB, status only for pending and declined", async () => {
    renderApp(statementBank().adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    const list = await screen.findByRole("list", { name: "Операции" });
    const [cafe, salary, pharmacy] = within(list).getAllByRole("listitem") as [HTMLElement, HTMLElement, HTMLElement];
    expect(text(cafe)).toContain("1 сентября");
    expect(text(cafe)).toContain("В обработке");
    expect(text(cafe)).toContain("−2 450,90 ₽");
    expect(text(salary)).toContain("28 сентября");
    expect(text(salary)).toContain("+85 000 ₽");
    expect(text(salary)).not.toMatch(/В обработке|Отклонена/);
    expect(text(pharmacy)).toContain("Отклонена");
    expect(text(salary)).not.toMatch(/2026|\d{1,2}:\d{2}/); // no year, no time
  });

  it("English: the same data, English dates and labels; titles stay as the bank sent them", async () => {
    renderApp(statementBank({ language: "en" }).adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    await findScreenTitle("Mini statement");
    const list = await screen.findByRole("list", { name: "Transactions" });
    const [cafe, salary, pharmacy] = within(list).getAllByRole("listitem") as [HTMLElement, HTMLElement, HTMLElement];
    expect(text(cafe)).toContain("September 1");
    expect(text(cafe)).toContain("Pending");
    expect(text(cafe)).toContain("Кафе"); // data is not translated
    expect(text(salary)).toContain("September 28");
    expect(text(salary)).toContain("+85 000 ₽"); // still RUB
    expect(text(pharmacy)).toContain("Declined");
    expect(screen.getByRole("button", { name: "Back" })).toBeTruthy();
  });

  it.each([
    ["ru", "Мини-выписка", "Операций пока нет"],
    ["en", "Mini statement", "No transactions yet"],
  ])("[] in %s: the empty state, not an error, no redirect", async (language, title, empty) => {
    const { adapter } = statementBank({ getRecentTransactions: async () => ok([]), language });
    const { router } = renderApp(adapter, { path: "/accounts/acc-1/transactions", authenticated: true });
    await findScreenTitle(title);
    const message = await screen.findByText(empty);
    expect(message.closest("[data-kind]")?.getAttribute("data-kind")).toBe("empty");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(router.state.location.pathname).toBe("/accounts/acc-1/transactions");
  });

  it("shows loading until the answer, then the operations", async () => {
    let answer: (result: Result<Transaction[]>) => void = () => undefined;
    const { adapter } = statementBank({ getRecentTransactions: () => new Promise((resolve) => (answer = resolve)) });
    renderApp(adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    expect(await screen.findByRole("status", { name: "Загрузка" })).toBeTruthy();
    expect(screen.queryByText("Операций пока нет")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    await act(async () => answer(ok(TRANSACTIONS["acc-2"] ?? [])));
    expect(screen.queryByRole("status", { name: "Загрузка" })).toBeNull();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });
});

describe("ACC-02 failures", () => {
  it("unknown account: a controlled error, no retry, no other account, session kept, back works", async () => {
    const user = userEvent.setup();
    const { adapter, getRecentTransactions, getAccounts } = statementBank({
      getRecentTransactions: async () => fail("VALIDATION_FAILED", ["accountId"]),
    });
    const { router } = renderApp(adapter, { path: "/accounts/nope/transactions", authenticated: true });
    expect(await screen.findByText("Не удалось открыть операции этого счёта")).toBeTruthy();
    expect(screen.queryByText(/VALIDATION_FAILED|accountId/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    expect(getRecentTransactions).toHaveBeenCalledExactlyOnceWith({ accountId: "nope", limit: 10 });
    expect(getAccounts).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Назад" }));
    await findScreenTitle("Главная");
    expect(router.state.location.pathname).toBe("/home"); // still signed in
  });

  it.each([
    ["ru", "Банк сейчас недоступен", "Мини-выписка"],
    ["en", "Bank is currently unavailable", "Mini statement"],
  ])("UNAVAILABLE in %s: controlled unavailable state; back stays; session kept", async (language, message, title) => {
    const { adapter } = statementBank({ getRecentTransactions: async () => fail("UNAVAILABLE"), language });
    const { router } = renderApp(adapter, { path: "/accounts/acc-1/transactions", authenticated: true });
    const shown = await screen.findByText(message);
    await findScreenTitle(title);
    expect(shown.closest("[data-kind]")?.getAttribute("data-kind")).toBe("unavailable");
    expect(screen.getByRole("button", { name: /Назад|Back/ })).toBeTruthy();
    await act(() => router.navigate("/settings"));
    expect(router.state.location.pathname).toBe("/settings");
  });

  it("a thrown error: generic controlled error, no crash, session kept", async () => {
    const { adapter } = statementBank({
      getRecentTransactions: async () => {
        throw new Error("boom");
      },
    });
    const { router } = renderApp(adapter, { path: "/accounts/acc-1/transactions", authenticated: true });
    expect(await screen.findByText("Не удалось загрузить операции")).toBeTruthy();
    expect(screen.queryByText(/boom/)).toBeNull();
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/home");
  });

  it("«Повторить» asks again for the same account with limit 10", async () => {
    const user = userEvent.setup();
    const answers: Result<Transaction[]>[] = [fail("UNAVAILABLE"), ok(TRANSACTIONS["acc-2"] ?? [])];
    const { adapter, getRecentTransactions } = statementBank({
      getRecentTransactions: async () => answers.shift() ?? fail("UNKNOWN"),
    });
    renderApp(adapter, { path: "/accounts/acc-2/transactions", authenticated: true });
    await user.click(await screen.findByRole("button", { name: "Повторить" }));
    await screen.findByRole("list", { name: "Операции" });
    expect(getRecentTransactions.mock.calls).toEqual([[{ accountId: "acc-2", limit: 10 }], [{ accountId: "acc-2", limit: 10 }]]);
  });
});

describe("ACC-02 with real adapters", () => {
  it("NullAdapter: its [] is the empty state", async () => {
    renderApp(new NullAdapter(), { path: "/accounts/acc-1/transactions", authenticated: true });
    expect(await screen.findByText("Операций пока нет")).toBeTruthy();
  });

  it("DemoAdapter: login → a concrete account → its operations only → back → the blocked account opens too", async () => {
    const user = userEvent.setup();
    const banking = new DemoAdapter({ storage: createMemoryStorage() });
    const recent = vi.spyOn(banking, "getRecentTransactions");
    renderApp(banking, { path: "/login" });
    for (const digit of "1234") await user.click(screen.getByRole("button", { name: digit }));
    await screen.findByRole("list", { name: "Счета" });
    expect(recent).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole("article", { name: "Счёт для поездок" })).getByRole("button"));
    await findScreenTitle("Мини-выписка");
    const trip = await screen.findByRole("list", { name: "Операции" });
    expect(text(trip)).toContain("Билеты на поезд");
    expect(text(trip)).not.toContain("Продукты"); // another account's operation

    await user.click(screen.getByRole("button", { name: "Назад" }));
    await user.click(within(await screen.findByRole("article", { name: "Старый счёт" })).getByRole("button"));
    expect(text(await screen.findByRole("list", { name: "Операции" }))).toContain("Пополнение");
    expect(recent.mock.calls.map(([req]) => req.limit)).toEqual([10, 10]);
    expect(new Set(recent.mock.calls.map(([req]) => req.accountId)).size).toBe(2);
  });
});
