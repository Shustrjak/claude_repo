import type { BankingAdapter } from "../BankingAdapter";
import type { ErrorCode, PersonalDetails, Result, TransferRequest } from "../types";

/** All operations of the contract. `satisfies` fails to compile if one is missing or extra. */
export const BANKING_ADAPTER_METHODS = {
  login: true,
  logout: true,
  startRegistration: true,
  submitPersonalDetails: true,
  requestOtp: true,
  verifyOtp: true,
  sendEmailCode: true,
  verifyEmailCode: true,
  setMpin: true,
  changeMpin: true,
  getAccounts: true,
  getRecentTransactions: true,
  getTransferLimits: true,
  confirmTransfer: true,
  findRecipientBanks: true,
  getSbpDefaultBank: true,
  setSbpDefaultBank: true,
  getLanguageSettings: true,
  setLanguage: true,
} as const satisfies Record<keyof BankingAdapter, true>;

export const DEVICE_METHOD_NAMES = [
  "getSimCards",
  "bindSim",
  "scanQr",
  "isBiometricAvailable",
  "verifyBiometric",
  "getBiometricHardware",
];

export const ERROR_CODES: readonly ErrorCode[] = [
  "UNAVAILABLE",
  "UNKNOWN",
  "VALIDATION_FAILED",
  "SESSION_EXPIRED",
  "STATE_CONFLICT",
  "MPIN_INVALID",
  "CODE_INVALID",
  "AGE_RESTRICTION",
  "AMOUNT_OUT_OF_LIMITS",
  "INSUFFICIENT_FUNDS",
  "RECIPIENT_NOT_FOUND",
];

/** Negative tests send shapes TypeScript forbids; this is the only place that bypasses the types. */
export function malformed<T>(value: unknown): T {
  return value as T;
}

export function mobileTransfer(overrides: Partial<TransferRequest> = {}): TransferRequest {
  return {
    clientRequestId: "req-mobile-1",
    sourceAccountId: "acc-1",
    recipient: { method: "mobile", phone: "+79990000002", bankId: "bank-north" },
    amount: { amount: 10000, currency: "RUB" },
    confirmation: { method: "biometric" },
    ...overrides,
  };
}

export function bankAccountTransfer(overrides: Partial<TransferRequest> = {}): TransferRequest {
  return {
    clientRequestId: "req-account-1",
    sourceAccountId: "acc-1",
    recipient: {
      method: "bankAccount",
      accountNumber: "40817810099910004312",
      bik: "044525000",
      recipientName: "Иван Петров",
    },
    amount: { amount: 25000, currency: "RUB" },
    confirmation: { method: "biometric" },
    ...overrides,
  };
}

export function personalDetails(overrides: Partial<PersonalDetails> = {}): PersonalDetails {
  return {
    firstName: "Анна",
    lastName: "Смирнова",
    birthDate: "1990-04-12",
    address: {
      postalCode: "101000",
      region: "Москва",
      city: "Москва",
      district: "Центральный",
      street: "Тверская",
      house: "1",
      apartment: "",
    },
    email: "anna@example.com",
    consents: { push: true, marketing: false },
    ...overrides,
  };
}

/** Calls every operation once with well-formed input; logout last so the session lasts. */
export async function callEveryOperation(
  adapter: BankingAdapter,
  mpin: string,
): Promise<[keyof BankingAdapter, Result<unknown>][]> {
  const calls: [keyof BankingAdapter, () => Promise<Result<unknown>>][] = [
    ["login", () => adapter.login({ method: "mpin", mpin })],
    ["getAccounts", () => adapter.getAccounts()],
    ["getRecentTransactions", () => adapter.getRecentTransactions({ accountId: "acc-1", limit: 5 })],
    ["getTransferLimits", () => adapter.getTransferLimits({ method: "mobile" })],
    ["findRecipientBanks", () => adapter.findRecipientBanks({ phone: "+79990000002" })],
    ["getSbpDefaultBank", () => adapter.getSbpDefaultBank()],
    ["setSbpDefaultBank", () => adapter.setSbpDefaultBank()],
    ["getLanguageSettings", () => adapter.getLanguageSettings()],
    ["setLanguage", () => adapter.setLanguage({ code: "ru" })],
    ["confirmTransfer", () => adapter.confirmTransfer(mobileTransfer({ confirmation: { method: "mpin", mpin } }))],
    ["requestOtp", () => adapter.requestOtp({ purpose: "change_mpin" })],
    ["verifyOtp", () => adapter.verifyOtp({ purpose: "change_mpin", code: "000000" })],
    ["changeMpin", () => adapter.changeMpin({ newMpin: mpin })],
    ["startRegistration", () => adapter.startRegistration({ phone: "+79990000009", onboardingContext: "new_customer" })],
    ["sendEmailCode", () => adapter.sendEmailCode({ email: "anna@example.com" })],
    ["verifyEmailCode", () => adapter.verifyEmailCode({ code: "000000" })],
    ["submitPersonalDetails", () => adapter.submitPersonalDetails(personalDetails())],
    ["setMpin", () => adapter.setMpin({ mpin })],
    ["logout", () => adapter.logout()],
  ];
  const results: [keyof BankingAdapter, Result<unknown>][] = [];
  for (const [name, call] of calls) {
    results.push([name, await call()]);
  }
  return results;
}
