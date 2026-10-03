import type { AccountSummary, Bank, TransferLimits, TransferMethod, TransferResult, Transaction } from "../types";
import { isMoney, isNonEmptyString, isRecord } from "./validation";

/** A transaction as the demo bank stores it: the contract `Transaction` plus its account. */
export type DemoTransaction = Transaction & { accountId: string };

/** Mutable demo state. This is what DemoAdapter persists; nothing else is. */
export type DemoState = {
  /** The customer bound to this app instance (G-1); null until registration completes. */
  customer: { phone: string; mpinHash: string } | null;
  accounts: AccountSummary[];
  transactions: DemoTransaction[];
  /** Successful transfers by `clientRequestId`, so a repeat cannot debit twice. */
  completedTransfers: Record<string, { fingerprint: string; result: TransferResult }>;
  sbpDefaultBank: boolean;
  language: string;
};

/** Seed data. Static parts (banks, limits, languages, demo codes) are read from here, not persisted. */
export type DemoSeed = {
  customer: { phone: string; mpin: string };
  accounts: AccountSummary[];
  transactions: DemoTransaction[];
  banks: Bank[];
  phoneDirectory: Record<string, string[]>;
  limits: Record<TransferMethod, TransferLimits>;
  languages: { code: string; title: string }[];
  language: string;
  sbpDefaultBank: boolean;
  codes: { otp: string; email: string; length: number; resendAfterSec: number };
};

/**
 * Not a security measure: a 4-digit MPIN is trivially brute-forced. It only keeps the
 * plaintext MPIN out of browser storage. Real credential handling belongs to a real bank.
 */
export function hashMpin(mpin: string): string {
  let hash = 0x811c9dc5;
  for (const char of `banking-shell-demo:${mpin}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function initialState(seed: DemoSeed): DemoState {
  return {
    customer: { phone: seed.customer.phone, mpinHash: hashMpin(seed.customer.mpin) },
    accounts: structuredClone(seed.accounts),
    transactions: structuredClone(seed.transactions),
    completedTransfers: {},
    sbpDefaultBank: seed.sbpDefaultBank,
    language: seed.language,
  };
}

// Structural guards: persisted state and the JSON seed are both untrusted input.

export function isAccount(value: unknown): value is AccountSummary {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    typeof value.name === "string" &&
    typeof value.maskedNumber === "string" &&
    isMoney(value.balance) &&
    (value.status === "active" || value.status === "blocked")
  );
}

export function isDemoTransaction(value: unknown): value is DemoTransaction {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.accountId) &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    !Number.isNaN(Date.parse(value.date)) &&
    isMoney(value.amount) &&
    (value.status === "success" || value.status === "pending" || value.status === "failure")
  );
}

function isCompletedTransfer(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.fingerprint === "string" &&
    isRecord(value.result) &&
    (value.result.status === "success" || value.result.status === "pending")
  );
}

export function isDemoState(value: unknown): value is DemoState {
  if (!isRecord(value)) {
    return false;
  }
  const { customer, accounts, transactions, completedTransfers } = value;
  const customerOk =
    customer === null ||
    (isRecord(customer) && typeof customer.phone === "string" && typeof customer.mpinHash === "string");
  return (
    customerOk &&
    Array.isArray(accounts) &&
    accounts.every(isAccount) &&
    Array.isArray(transactions) &&
    transactions.every(isDemoTransaction) &&
    isRecord(completedTransfers) &&
    Object.values(completedTransfers).every(isCompletedTransfer) &&
    typeof value.sbpDefaultBank === "boolean" &&
    typeof value.language === "string"
  );
}

function isLimits(value: unknown): value is TransferLimits {
  return isRecord(value) && isMoney(value.min) && isMoney(value.max);
}

export function isDemoSeed(value: unknown): value is DemoSeed {
  if (!isRecord(value)) {
    return false;
  }
  const { customer, banks, phoneDirectory, limits, languages, codes } = value;
  return (
    isRecord(customer) &&
    typeof customer.phone === "string" &&
    typeof customer.mpin === "string" &&
    Array.isArray(value.accounts) &&
    value.accounts.every(isAccount) &&
    Array.isArray(value.transactions) &&
    value.transactions.every(isDemoTransaction) &&
    Array.isArray(banks) &&
    banks.every((bank) => isRecord(bank) && isNonEmptyString(bank.id) && typeof bank.name === "string") &&
    isRecord(phoneDirectory) &&
    Object.values(phoneDirectory).every((ids) => Array.isArray(ids) && ids.every(isNonEmptyString)) &&
    isRecord(limits) &&
    isLimits(limits.mobile) &&
    isLimits(limits.bankAccount) &&
    Array.isArray(languages) &&
    languages.every((lang) => isRecord(lang) && isNonEmptyString(lang.code) && typeof lang.title === "string") &&
    typeof value.language === "string" &&
    typeof value.sbpDefaultBank === "boolean" &&
    isRecord(codes) &&
    typeof codes.otp === "string" &&
    typeof codes.email === "string" &&
    typeof codes.length === "number" &&
    typeof codes.resendAfterSec === "number"
  );
}
