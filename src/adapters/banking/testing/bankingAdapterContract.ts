import { describe, expect, it } from "vitest";
import type { BankingAdapter } from "../BankingAdapter";
import type { AccountSummary, Money, Result, TransferRequest } from "../types";
import {
  BANKING_ADAPTER_METHODS,
  DEVICE_METHOD_NAMES,
  ERROR_CODES,
  bankAccountTransfer,
  callEveryOperation,
  malformed,
  mobileTransfer,
} from "./fixtures";

export type ContractSubject = {
  name: string;
  /** A fresh adapter in its ready state: logged in, where the implementation has sessions. */
  create: () => Promise<BankingAdapter>;
  /** The MPIN the subject accepts; used to prove MPIN never comes back in a response. */
  mpin: string;
};

const isInteger = (value: unknown): boolean => Number.isSafeInteger(value);

function expectResult(result: Result<unknown>): void {
  expect(typeof result.ok).toBe("boolean");
  if (result.ok) {
    expect(result).toHaveProperty("data");
  } else {
    expect(ERROR_CODES).toContain(result.error.code);
    if (result.error.fields !== undefined) {
      expect(result.error.fields.every((field) => typeof field === "string")).toBe(true);
    }
  }
}

function expectMoney(value: Money): void {
  expect(Object.keys(value).sort()).toEqual(["amount", "currency"]);
  expect(value.currency).toBe("RUB");
  expect(isInteger(value.amount)).toBe(true);
}

/** A rejected request, either refused outright or rejected for the expected field. */
function expectRejectedFor(result: Result<unknown>, field: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(["VALIDATION_FAILED", "UNAVAILABLE"]).toContain(result.error.code);
    if (result.error.code === "VALIDATION_FAILED") {
      expect(result.error.fields).toContain(field);
    }
  }
}

function collectStrings(value: unknown, keys: string[], strings: string[]): void {
  if (typeof value === "string") {
    strings.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, keys, strings));
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      keys.push(key);
      collectStrings(item, keys, strings);
    }
  }
}

async function accountsOf(adapter: BankingAdapter): Promise<AccountSummary[]> {
  const result = await adapter.getAccounts();
  return result.ok ? result.data : [];
}

/** Shared guarantees every BankingAdapter implementation must satisfy. */
export function bankingAdapterContract(subject: ContractSubject): void {
  describe(`BankingAdapter contract: ${subject.name}`, () => {
    it("exposes exactly the 19 contract operations and no device methods", async () => {
      const adapter = await subject.create();
      const names = Object.keys(BANKING_ADAPTER_METHODS);
      expect(names).toHaveLength(19);
      for (const name of names) {
        expect(typeof Reflect.get(adapter, name)).toBe("function");
      }
      for (const name of DEVICE_METHOD_NAMES) {
        expect(name in adapter).toBe(false);
      }
    });

    it("resolves every operation to a Result and never throws", async () => {
      const results = await callEveryOperation(await subject.create(), subject.mpin);
      expect(results).toHaveLength(19);
      for (const [, result] of results) {
        expectResult(result);
      }
    });

    it("never returns an MPIN in a response", async () => {
      const results = await callEveryOperation(await subject.create(), subject.mpin);
      const keys: string[] = [];
      const strings: string[] = [];
      for (const [, result] of results) {
        collectStrings(result, keys, strings);
      }
      expect(keys.some((key) => key.toLowerCase().includes("mpin"))).toBe(false);
      expect(strings).not.toContain(subject.mpin);
    });

    it("returns accounts shaped as AccountSummary with status active or blocked", async () => {
      const result = await (await subject.create()).getAccounts();
      expectResult(result);
      if (!result.ok) return;
      const ids = result.data.map((account) => account.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const account of result.data) {
        expect(Object.keys(account).sort()).toEqual(["balance", "id", "maskedNumber", "name", "status"]);
        expect(account.id).not.toBe("");
        expect(typeof account.name).toBe("string");
        expect(typeof account.maskedNumber).toBe("string");
        expectMoney(account.balance);
        expect(["active", "blocked"]).toContain(account.status);
      }
    });

    it("scopes transactions to the requested account and respects the limit", async () => {
      const adapter = await subject.create();
      const seen = new Map<string, string>();
      for (const account of await accountsOf(adapter)) {
        const result = await adapter.getRecentTransactions({ accountId: account.id, limit: 2 });
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expect(result.data.length).toBeLessThanOrEqual(2);
        for (const tx of result.data) {
          expect(Object.keys(tx).sort()).toEqual(["amount", "date", "id", "status", "title"]);
          expect(Number.isNaN(Date.parse(tx.date))).toBe(false);
          expectMoney(tx.amount);
          expect(["success", "pending", "failure"]).toContain(tx.status);
          // A transaction belongs to one account: no aggregation across accounts.
          expect(seen.get(tx.id) ?? account.id).toBe(account.id);
          seen.set(tx.id, account.id);
        }
      }
    });

    it("never returns transactions for an unknown account", async () => {
      const result = await (await subject.create()).getRecentTransactions({ accountId: "acc-unknown", limit: 10 });
      if (result.ok) {
        expect(result.data).toEqual([]);
      } else {
        expect(result.error).toEqual({ code: "VALIDATION_FAILED", fields: ["accountId"] });
      }
    });

    describe("confirmTransfer validation", () => {
      const firstActiveId = async (adapter: BankingAdapter): Promise<string> =>
        (await accountsOf(adapter)).find((account) => account.status === "active")?.id ?? "acc-1";

      const cases: [string, string, (sourceAccountId: string) => TransferRequest][] = [
        [
          "without sourceAccountId",
          "sourceAccountId",
          () => malformed<TransferRequest>({ ...mobileTransfer(), sourceAccountId: undefined }),
        ],
        ["with an empty sourceAccountId", "sourceAccountId", () => mobileTransfer({ sourceAccountId: "" })],
        [
          "bankAccount without recipientName",
          "recipient.recipientName",
          (sourceAccountId) =>
            malformed<TransferRequest>({
              ...bankAccountTransfer({ sourceAccountId }),
              recipient: { method: "bankAccount", accountNumber: "40817810099910004312", bik: "044525000" },
            }),
        ],
        [
          "bankAccount with a blank recipientName",
          "recipient.recipientName",
          (sourceAccountId) =>
            bankAccountTransfer({
              sourceAccountId,
              recipient: { method: "bankAccount", accountNumber: "40817810099910004312", bik: "044525000", recipientName: "  " },
            }),
        ],
        [
          "with a fractional amount",
          "amount",
          (sourceAccountId) => mobileTransfer({ sourceAccountId, amount: { amount: 100.5, currency: "RUB" } }),
        ],
      ];

      for (const [label, field, build] of cases) {
        it(`rejects a transfer ${label} without moving money`, async () => {
          const adapter = await subject.create();
          const before = await accountsOf(adapter);
          const result = await adapter.confirmTransfer(build(await firstActiveId(adapter)));
          expectRejectedFor(result, field);
          expect(await accountsOf(adapter)).toEqual(before);
        });
      }

      it("does not require recipientName for mobile transfers", async () => {
        const adapter = await subject.create();
        const result = await adapter.confirmTransfer(mobileTransfer({ sourceAccountId: await firstActiveId(adapter) }));
        if (!result.ok && result.error.code === "VALIDATION_FAILED") {
          expect(result.error.fields).not.toContain("recipient.recipientName");
        }
      });

      it("never accepts a blocked account as the transfer source", async () => {
        const adapter = await subject.create();
        const before = await accountsOf(adapter);
        for (const account of before.filter((item) => item.status === "blocked")) {
          const result = await adapter.confirmTransfer(mobileTransfer({ sourceAccountId: account.id }));
          expect(result).toEqual({ ok: false, error: { code: "STATE_CONFLICT", fields: ["sourceAccountId"] } });
        }
        expect(await accountsOf(adapter)).toEqual(before);
      });
    });

    it("returns transfer limits as integer RUB with min ≤ max", async () => {
      const adapter = await subject.create();
      for (const method of ["mobile", "bankAccount"] as const) {
        const result = await adapter.getTransferLimits({ method });
        expectResult(result);
        if (!result.ok) continue;
        expectMoney(result.data.min);
        expectMoney(result.data.max);
        expect(result.data.min.amount).toBeLessThanOrEqual(result.data.max.amount);
      }
    });

    it("returns recipient banks as { id, name }", async () => {
      const result = await (await subject.create()).findRecipientBanks({ phone: "+79990000002" });
      expectResult(result);
      if (!result.ok) return;
      for (const bank of result.data) {
        expect(Object.keys(bank).sort()).toEqual(["id", "name"]);
      }
    });

    it("returns language settings whose current language is one of the available ones", async () => {
      const result = await (await subject.create()).getLanguageSettings();
      expectResult(result);
      if (!result.ok) return;
      const codes = result.data.available.map((lang) => lang.code);
      expect(new Set(codes).size).toBe(codes.length);
      expect(codes).toContain(result.data.current);
    });

    it("returns the SBP default-bank flag as a boolean", async () => {
      const result = await (await subject.create()).getSbpDefaultBank();
      expectResult(result);
      if (result.ok) expect(typeof result.data.isDefault).toBe("boolean");
    });

    it("describes code delivery with a masked destination and positive numbers", async () => {
      const result = await (await subject.create()).requestOtp({ purpose: "change_mpin" });
      expectResult(result);
      if (!result.ok) return;
      expect(typeof result.data.destinationMasked).toBe("string");
      expect(isInteger(result.data.codeLength) && result.data.codeLength > 0).toBe(true);
      expect(isInteger(result.data.resendAfterSec) && result.data.resendAfterSec >= 0).toBe(true);
    });
  });
}
