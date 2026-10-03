import { afterEach, describe, expect, it, vi } from "vitest";
import type { BankingAdapter } from "./BankingAdapter";
import { NullAdapter } from "./NullAdapter";
import { callEveryOperation, mobileTransfer } from "./testing/fixtures";

const unavailable = { ok: false, error: { code: "UNAVAILABLE" } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NullAdapter", () => {
  it("answers each operation as documented by rule G-6", async () => {
    const results = Object.fromEntries(await callEveryOperation(new NullAdapter(), "1234"));
    expect(results).toEqual({
      getAccounts: { ok: true, data: [] },
      getRecentTransactions: { ok: true, data: [] },
      findRecipientBanks: { ok: true, data: [] },
      getTransferLimits: unavailable,
      getSbpDefaultBank: unavailable,
      getLanguageSettings: unavailable,
      login: unavailable,
      logout: unavailable,
      startRegistration: unavailable,
      submitPersonalDetails: unavailable,
      requestOtp: unavailable,
      verifyOtp: unavailable,
      sendEmailCode: unavailable,
      verifyEmailCode: unavailable,
      setMpin: unavailable,
      changeMpin: unavailable,
      confirmTransfer: unavailable,
      setSbpDefaultBank: unavailable,
      setLanguage: unavailable,
    });
  });

  it("fabricates no accounts and moves no money", async () => {
    const adapter: BankingAdapter = new NullAdapter();
    expect(await adapter.confirmTransfer(mobileTransfer())).toEqual(unavailable);
    expect(await adapter.getAccounts()).toEqual({ ok: true, data: [] });
    expect(await adapter.getRecentTransactions({ accountId: "acc-1", limit: 10 })).toEqual({ ok: true, data: [] });
  });

  it("touches neither storage nor the network", async () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() };
    const fetch = vi.fn();
    vi.stubGlobal("localStorage", storage);
    vi.stubGlobal("sessionStorage", storage);
    vi.stubGlobal("fetch", fetch);
    await callEveryOperation(new NullAdapter(), "1234");
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
