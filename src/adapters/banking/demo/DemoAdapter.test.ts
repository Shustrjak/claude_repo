import { afterEach, describe, expect, it, vi } from "vitest";
import { bankAccountTransfer, malformed, mobileTransfer, personalDetails } from "../testing/fixtures";
import type { TransferRequest } from "../types";
import { DemoAdapter } from "./DemoAdapter";
import { demoSeed } from "./seed";
import { createMemoryStorage, DEMO_STATE_VERSION, DEMO_STORAGE_KEY, type DemoStorage } from "./storage";

const NOW = new Date("2026-10-01T12:00:00Z");
const MPIN = "1234";
const OTP = "123456";

function demo(storage: DemoStorage = createMemoryStorage(), seed = demoSeed): DemoAdapter {
  return new DemoAdapter({ storage, seed, now: () => NOW });
}

async function loggedIn(storage?: DemoStorage, seed = demoSeed): Promise<DemoAdapter> {
  const adapter = demo(storage, seed);
  expect(await adapter.login({ method: "mpin", mpin: MPIN })).toEqual({ ok: true, data: undefined });
  return adapter;
}

async function balanceOf(adapter: DemoAdapter, accountId: string): Promise<number | undefined> {
  const result = await adapter.getAccounts();
  return result.ok ? result.data.find((account) => account.id === accountId)?.balance.amount : undefined;
}

async function register(
  adapter: DemoAdapter,
  context: "existing_customer" | "new_customer",
  mpin = "4321",
): Promise<void> {
  expect((await adapter.startRegistration({ phone: "+79990000077", onboardingContext: context })).ok).toBe(true);
  expect((await adapter.sendEmailCode({ email: "anna@example.com" })).ok).toBe(true);
  expect((await adapter.verifyEmailCode({ code: OTP })).ok).toBe(true);
  const card = context === "existing_customer" ? { card: { number: "2200123412341234", expiry: "08/29" } } : {};
  expect(await adapter.submitPersonalDetails(personalDetails(card))).toEqual({ ok: true, data: undefined });
  expect((await adapter.setMpin({ mpin })).ok).toBe(true);
  expect((await adapter.requestOtp({ purpose: "onboarding" })).ok).toBe(true);
  expect(await adapter.verifyOtp({ purpose: "onboarding", code: OTP })).toEqual({ ok: true, data: undefined });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DemoAdapter seed", () => {
  it("is deterministic across instances", async () => {
    const first = await loggedIn();
    const second = await loggedIn();
    expect(await first.getAccounts()).toEqual(await second.getAccounts());
    expect(await first.getRecentTransactions({ accountId: "acc-1", limit: 10 })).toEqual(
      await second.getRecentTransactions({ accountId: "acc-1", limit: 10 }),
    );
  });

  it("has several accounts, active and blocked", async () => {
    const result = await (await loggedIn()).getAccounts();
    expect(result.ok && result.data.map((account) => [account.id, account.status])).toEqual([
      ["acc-1", "active"],
      ["acc-2", "active"],
      ["acc-3", "blocked"],
    ]);
  });

  it("requires a session for bank data", async () => {
    expect(await demo().getAccounts()).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
  });

  it("rejects a wrong MPIN at login", async () => {
    expect(await demo().login({ method: "mpin", mpin: "0000" })).toEqual({ ok: false, error: { code: "MPIN_INVALID" } });
  });

  it("rejects an untyped login method as malformed input (G-10)", async () => {
    expect(await demo().login(malformed({ method: "password" }))).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["method"] },
    });
  });

  it("rejects registration steps called out of order with STATE_CONFLICT (G-10)", async () => {
    const adapter = demo();
    expect(await adapter.sendEmailCode({ email: "anna@example.com" })).toEqual({
      ok: false,
      error: { code: "STATE_CONFLICT" },
    });
    await adapter.startRegistration({ phone: "+79990000077", onboardingContext: "new_customer" });
    expect(await adapter.setMpin({ mpin: "4321" })).toEqual({ ok: false, error: { code: "STATE_CONFLICT" } });
    expect(await adapter.requestOtp({ purpose: "onboarding" })).toEqual({ ok: false, error: { code: "STATE_CONFLICT" } });
  });
});

describe("DemoAdapter transactions", () => {
  it("returns only the requested account's transactions, newest first, up to the limit", async () => {
    const adapter = await loggedIn();
    const result = await adapter.getRecentTransactions({ accountId: "acc-1", limit: 2 });
    expect(result.ok && result.data.map((tx) => tx.id)).toEqual(["tx-1", "tx-2"]);
    const other = await adapter.getRecentTransactions({ accountId: "acc-2", limit: 10 });
    expect(other.ok && other.data.map((tx) => tx.id)).toEqual(["tx-4", "tx-5"]);
  });

  it("rejects an unknown account and an invalid limit", async () => {
    const adapter = await loggedIn();
    expect(await adapter.getRecentTransactions({ accountId: "acc-9", limit: 0 })).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["accountId", "limit"] },
    });
  });
});

describe("DemoAdapter transfers", () => {
  it("debits the source account in kopecks and records the transaction on that account only", async () => {
    const adapter = await loggedIn();
    const result = await adapter.confirmTransfer(bankAccountTransfer({ amount: { amount: 12345, currency: "RUB" } }));
    expect(result).toEqual({ ok: true, data: { status: "success" } });
    expect(await balanceOf(adapter, "acc-1")).toBe(12500000 - 12345);
    expect(await balanceOf(adapter, "acc-2")).toBe(3480050);
    const acc1 = await adapter.getRecentTransactions({ accountId: "acc-1", limit: 1 });
    expect(acc1.ok && acc1.data[0]).toEqual({
      id: "transfer-req-account-1",
      title: "Перевод: Иван Петров",
      date: NOW.toISOString(),
      amount: { amount: -12345, currency: "RUB" },
      status: "success",
    });
    const acc2 = await adapter.getRecentTransactions({ accountId: "acc-2", limit: 10 });
    expect(acc2.ok && acc2.data.some((tx) => tx.id === "transfer-req-account-1")).toBe(false);
  });

  it("rejects a blocked source account with STATE_CONFLICT", async () => {
    const adapter = await loggedIn();
    expect(await adapter.confirmTransfer(mobileTransfer({ sourceAccountId: "acc-3" }))).toEqual({
      ok: false,
      error: { code: "STATE_CONFLICT", fields: ["sourceAccountId"] },
    });
    expect(await balanceOf(adapter, "acc-3")).toBe(500000);
  });

  it("rejects an unknown source account", async () => {
    expect(await (await loggedIn()).confirmTransfer(mobileTransfer({ sourceAccountId: "acc-9" }))).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["sourceAccountId"] },
    });
  });

  it("requires recipientName for bankAccount transfers only", async () => {
    const adapter = await loggedIn();
    const withoutName = malformed<TransferRequest>({
      ...bankAccountTransfer(),
      recipient: { method: "bankAccount", accountNumber: "40817810099910004312", bik: "044525000" },
    });
    expect(await adapter.confirmTransfer(withoutName)).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["recipient.recipientName"] },
    });
    expect((await adapter.confirmTransfer(mobileTransfer())).ok).toBe(true);
  });

  it("applies MPIN, limits, funds and recipient checks", async () => {
    const adapter = await loggedIn();
    expect(await adapter.confirmTransfer(mobileTransfer({ confirmation: { method: "mpin", mpin: "9999" } }))).toEqual({
      ok: false,
      error: { code: "MPIN_INVALID" },
    });
    expect(
      await adapter.confirmTransfer(mobileTransfer({ clientRequestId: "r2", amount: { amount: 99, currency: "RUB" } })),
    ).toEqual({ ok: false, error: { code: "AMOUNT_OUT_OF_LIMITS", fields: ["amount"] } });
    expect(
      await adapter.confirmTransfer(
        mobileTransfer({ clientRequestId: "r3", sourceAccountId: "acc-2", amount: { amount: 9000000, currency: "RUB" } }),
      ),
    ).toEqual({ ok: false, error: { code: "INSUFFICIENT_FUNDS" } });
    expect(
      await adapter.confirmTransfer(
        mobileTransfer({ clientRequestId: "r4", recipient: { method: "mobile", phone: "+79990000099", bankId: "bank-north" } }),
      ),
    ).toEqual({ ok: false, error: { code: "RECIPIENT_NOT_FOUND", fields: ["recipient.phone"] } });
    expect(await balanceOf(adapter, "acc-1")).toBe(12500000);
  });
});

describe("DemoAdapter idempotency", () => {
  it("does not debit twice for a repeated clientRequestId", async () => {
    const adapter = await loggedIn();
    const request = mobileTransfer({ amount: { amount: 50000, currency: "RUB" } });
    expect(await adapter.confirmTransfer(request)).toEqual({ ok: true, data: { status: "success" } });
    expect(await adapter.confirmTransfer(request)).toEqual({ ok: true, data: { status: "success" } });
    expect(await balanceOf(adapter, "acc-1")).toBe(12500000 - 50000);
    const txs = await adapter.getRecentTransactions({ accountId: "acc-1", limit: 50 });
    expect(txs.ok && txs.data.filter((tx) => tx.id === "transfer-req-mobile-1")).toHaveLength(1);
  });

  it("still dedupes after a reload", async () => {
    const storage = createMemoryStorage();
    await (await loggedIn(storage)).confirmTransfer(mobileTransfer());
    const reloaded = await loggedIn(storage);
    expect((await reloaded.confirmTransfer(mobileTransfer())).ok).toBe(true);
    expect(await balanceOf(reloaded, "acc-1")).toBe(12500000 - 10000);
  });

  it("rejects reuse of a clientRequestId for a different transfer", async () => {
    const adapter = await loggedIn();
    await adapter.confirmTransfer(mobileTransfer());
    expect(await adapter.confirmTransfer(mobileTransfer({ amount: { amount: 20000, currency: "RUB" } }))).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["clientRequestId"] },
    });
  });

  it("lets a failed attempt be retried with the same clientRequestId", async () => {
    const adapter = await loggedIn();
    const wrong = await adapter.confirmTransfer(mobileTransfer({ confirmation: { method: "mpin", mpin: "9999" } }));
    expect(wrong.ok).toBe(false);
    expect(await adapter.confirmTransfer(mobileTransfer({ confirmation: { method: "mpin", mpin: MPIN } }))).toEqual({
      ok: true,
      data: { status: "success" },
    });
  });
});

describe("DemoAdapter persistence", () => {
  it("keeps balances and settings across instances sharing storage, but not the session", async () => {
    const storage = createMemoryStorage();
    const first = await loggedIn(storage);
    await first.confirmTransfer(mobileTransfer());
    await first.setLanguage({ code: "en" });
    await first.setSbpDefaultBank();

    const second = demo(storage);
    expect(await second.getAccounts()).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    await second.login({ method: "biometric" });
    expect(await balanceOf(second, "acc-1")).toBe(12500000 - 10000);
    expect(await second.getLanguageSettings()).toMatchObject({ ok: true, data: { current: "en" } });
    expect(await second.getSbpDefaultBank()).toEqual({ ok: true, data: { isDefault: true } });
  });

  it("writes one versioned entry under one key", async () => {
    const storage = createMemoryStorage();
    await (await loggedIn(storage)).setLanguage({ code: "en" });
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "null")).toMatchObject({ version: DEMO_STATE_VERSION, state: { language: "en" } });
  });

  it.each([
    ["malformed JSON", "{not json"],
    ["a wrong shape", JSON.stringify({ version: DEMO_STATE_VERSION, state: { accounts: "nope" } })],
    ["an incompatible version", JSON.stringify({ version: 99, state: {} })],
    ["an unknown language", JSON.stringify({ version: DEMO_STATE_VERSION, state: { language: "xx" } })],
  ])("resets to the seed when stored state has %s", async (_label, raw) => {
    const storage = createMemoryStorage();
    storage.setItem(DEMO_STORAGE_KEY, raw);
    const adapter = await loggedIn(storage);
    expect(await balanceOf(adapter, "acc-1")).toBe(12500000);
    expect(JSON.parse(storage.getItem(DEMO_STORAGE_KEY) ?? "null")).toMatchObject({ version: DEMO_STATE_VERSION });
  });

  it("never stores an MPIN in plaintext", async () => {
    const storage = createMemoryStorage();
    const adapter = await loggedIn(storage);
    await adapter.requestOtp({ purpose: "change_mpin" });
    await adapter.verifyOtp({ purpose: "change_mpin", code: OTP });
    await adapter.changeMpin({ newMpin: "5678" });
    const raw = storage.getItem(DEMO_STORAGE_KEY) ?? "";
    expect(raw).not.toContain("5678");
    expect(raw).not.toContain(`"${MPIN}"`);
  });

  it("uses browser localStorage by default", async () => {
    const local = createMemoryStorage();
    const setItem = vi.spyOn(local, "setItem");
    vi.stubGlobal("localStorage", local);
    await new DemoAdapter().login({ method: "biometric" });
    expect(setItem).toHaveBeenCalledWith(DEMO_STORAGE_KEY, expect.any(String));
  });

  it("falls back to memory where localStorage does not exist", async () => {
    vi.stubGlobal("localStorage", undefined);
    const adapter = new DemoAdapter({ now: () => NOW });
    expect(await adapter.login({ method: "mpin", mpin: MPIN })).toEqual({ ok: true, data: undefined });
  });

  it("reset restores the seed and ends the session", async () => {
    const storage = createMemoryStorage();
    const adapter = await loggedIn(storage);
    await adapter.confirmTransfer(mobileTransfer());
    adapter.reset();
    expect(await adapter.getAccounts()).toEqual({ ok: false, error: { code: "SESSION_EXPIRED" } });
    await adapter.login({ method: "biometric" });
    expect(await balanceOf(adapter, "acc-1")).toBe(12500000);
  });
});

describe("DemoAdapter account counts", () => {
  it("supports one account", async () => {
    const [onlyAccount] = demoSeed.accounts;
    const seed = { ...demoSeed, accounts: onlyAccount ? [onlyAccount] : [] };
    const result = await (await loggedIn(createMemoryStorage(), seed)).getAccounts();
    expect(result.ok && result.data.map((account) => account.id)).toEqual(["acc-1"]);
  });

  it("supports zero accounts: a new customer opens no product", async () => {
    const adapter = demo();
    await register(adapter, "new_customer");
    expect(await adapter.getAccounts()).toEqual({ ok: true, data: [] });
  });
});

describe("DemoAdapter registration", () => {
  it("completes for an existing customer, opens a session and accepts the new MPIN", async () => {
    const storage = createMemoryStorage();
    await register(demo(storage), "existing_customer", "4321");
    const next = demo(storage);
    expect(await next.login({ method: "mpin", mpin: MPIN })).toEqual({ ok: false, error: { code: "MPIN_INVALID" } });
    expect(await next.login({ method: "mpin", mpin: "4321" })).toEqual({ ok: true, data: undefined });
    expect((await next.getAccounts()).ok).toBe(true);
  });

  it("ties card details to the onboarding context", async () => {
    const adapter = demo();
    await adapter.startRegistration({ phone: "+79990000077", onboardingContext: "existing_customer" });
    await adapter.sendEmailCode({ email: "anna@example.com" });
    await adapter.verifyEmailCode({ code: OTP });
    expect(await adapter.submitPersonalDetails(personalDetails())).toEqual({
      ok: false,
      error: { code: "STATE_CONFLICT", fields: ["card"] },
    });

    await adapter.startRegistration({ phone: "+79990000077", onboardingContext: "new_customer" });
    await adapter.sendEmailCode({ email: "anna@example.com" });
    await adapter.verifyEmailCode({ code: OTP });
    const withCard = personalDetails({ card: { number: "2200123412341234", expiry: "08/29" } });
    expect(await adapter.submitPersonalDetails(withCard)).toEqual({
      ok: false,
      error: { code: "STATE_CONFLICT", fields: ["card"] },
    });
  });

  it("requires a verified email, adult age and well-formed fields", async () => {
    const adapter = demo();
    await adapter.startRegistration({ phone: "+79990000077", onboardingContext: "new_customer" });
    expect(await adapter.submitPersonalDetails(personalDetails())).toEqual({
      ok: false,
      error: { code: "STATE_CONFLICT", fields: ["email"] },
    });
    expect(await adapter.verifyEmailCode({ code: OTP })).toEqual({ ok: false, error: { code: "CODE_INVALID" } });
    await adapter.sendEmailCode({ email: "anna@example.com" });
    await adapter.verifyEmailCode({ code: OTP });
    expect(await adapter.submitPersonalDetails(personalDetails({ birthDate: "2010-01-01" }))).toEqual({
      ok: false,
      error: { code: "AGE_RESTRICTION", fields: ["birthDate"] },
    });
    expect(await adapter.submitPersonalDetails(personalDetails({ firstName: "", birthDate: "1990-02-30" }))).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["firstName", "birthDate"] },
    });
  });

  it("rejects a wrong onboarding OTP", async () => {
    const adapter = demo();
    await adapter.startRegistration({ phone: "+79990000077", onboardingContext: "new_customer" });
    await adapter.sendEmailCode({ email: "anna@example.com" });
    await adapter.verifyEmailCode({ code: OTP });
    await adapter.submitPersonalDetails(personalDetails());
    await adapter.setMpin({ mpin: "4321" });
    await adapter.requestOtp({ purpose: "onboarding" });
    expect(await adapter.verifyOtp({ purpose: "onboarding", code: "000000" })).toEqual({
      ok: false,
      error: { code: "CODE_INVALID" },
    });
  });
});

describe("DemoAdapter MPIN change", () => {
  it("requires a verified change_mpin OTP in this session", async () => {
    const adapter = await loggedIn();
    expect(await adapter.changeMpin({ newMpin: "5678" })).toEqual({ ok: false, error: { code: "STATE_CONFLICT" } });
    const delivery = await adapter.requestOtp({ purpose: "change_mpin" });
    expect(delivery).toEqual({
      ok: true,
      data: { destinationMasked: "+7 ••• •••-00-01", codeLength: 6, resendAfterSec: 60 },
    });
    await adapter.verifyOtp({ purpose: "change_mpin", code: OTP });
    expect(await adapter.changeMpin({ newMpin: "5678" })).toEqual({ ok: true, data: undefined });
    await adapter.logout();
    expect(await adapter.login({ method: "mpin", mpin: "5678" })).toEqual({ ok: true, data: undefined });
  });
});

describe("DemoAdapter SBP and settings", () => {
  it("finds recipient banks by phone", async () => {
    const adapter = await loggedIn();
    expect(await adapter.findRecipientBanks({ phone: "+79990000002" })).toEqual({
      ok: true,
      data: [
        { id: "bank-north", name: "Банк Север" },
        { id: "bank-south", name: "Банк Юг" },
      ],
    });
    expect(await adapter.findRecipientBanks({ phone: "+79990000099" })).toEqual({ ok: true, data: [] });
  });

  it("rejects an unavailable language", async () => {
    expect(await (await loggedIn()).setLanguage({ code: "xx" })).toEqual({
      ok: false,
      error: { code: "VALIDATION_FAILED", fields: ["code"] },
    });
  });
});
