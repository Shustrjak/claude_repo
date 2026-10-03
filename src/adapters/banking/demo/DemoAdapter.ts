import type { BankingAdapter } from "../BankingAdapter";
import { fail, ok } from "../result";
import type {
  AccountSummary,
  Bank,
  CodeDelivery,
  LanguageSettings,
  LoginRequest,
  OnboardingContext,
  OtpPurpose,
  PersonalDetails,
  Result,
  StartRegistrationRequest,
  Transaction,
  TransferLimits,
  TransferMethod,
  TransferRequest,
  TransferResult,
} from "../types";
import { demoSeed } from "./seed";
import { hashMpin, initialState, type DemoSeed, type DemoState } from "./state";
import { defaultDemoStorage, loadDemoState, saveDemoState, type DemoStorage } from "./storage";
import {
  isAdult,
  isEmail,
  isMpin,
  isPhone,
  isRecord,
  parseIsoDate,
  personalDetailsErrors,
  transferRequestErrors,
} from "./validation";

export type DemoAdapterOptions = {
  /** Defaults to browser `localStorage`, or memory where it does not exist. */
  storage?: DemoStorage;
  seed?: DemoSeed;
  /** Clock for age checks and transfer dates; injectable for deterministic tests. */
  now?: () => Date;
};

/** Registration in progress. Kept in memory only: a reload restarts registration. */
type RegistrationDraft = {
  phone: string;
  context: OnboardingContext;
  pendingEmail: string | null;
  verifiedEmail: string | null;
  detailsSubmitted: boolean;
  mpinHash: string | null;
  otpRequested: boolean;
};

/**
 * Deterministic local demo of API Contract v1. Mutable bank data persists through
 * `DemoStorage` (localStorage in the browser, D-27); the session, registration in progress
 * and the change-MPIN permission live in memory, so a reload requires logging in again.
 * Not a bank and not production-grade security.
 */
export class DemoAdapter implements BankingAdapter {
  private readonly storage: DemoStorage;
  private readonly seed: DemoSeed;
  private readonly now: () => Date;
  private state: DemoState;
  private session = false;
  private registration: RegistrationDraft | null = null;
  private changeMpinStep: "none" | "requested" | "verified" = "none";

  constructor(options: DemoAdapterOptions = {}) {
    this.storage = options.storage ?? defaultDemoStorage();
    this.seed = options.seed ?? demoSeed;
    this.now = options.now ?? (() => new Date());
    const stored = loadDemoState(this.storage);
    const usable = stored !== null && this.seed.languages.some((lang) => lang.code === stored.language);
    this.state = usable ? stored : initialState(this.seed);
    if (!usable) {
      this.persist();
    }
  }

  /** Development/test helper, not a BankingAdapter operation: restores the seed. */
  reset(): void {
    this.state = initialState(this.seed);
    this.session = false;
    this.registration = null;
    this.changeMpinStep = "none";
    this.persist();
  }

  // A. Session

  login(req: LoginRequest): Promise<Result<void>> {
    return this.run(() => {
      const customer = this.state.customer;
      if (!customer) {
        return fail("STATE_CONFLICT");
      }
      const request: unknown = req;
      if (!isRecord(request) || (request.method !== "biometric" && request.method !== "mpin")) {
        return fail("VALIDATION_FAILED", ["method"]); // G-10: malformed runtime input
      }
      if (request.method === "mpin" && !(isMpin(request.mpin) && hashMpin(request.mpin) === customer.mpinHash)) {
        return fail("MPIN_INVALID");
      }
      this.session = true;
      this.changeMpinStep = "none";
      return ok();
    });
  }

  logout(): Promise<Result<void>> {
    return this.run(() => {
      this.session = false;
      this.changeMpinStep = "none";
      return ok();
    });
  }

  // B–C. Registration

  startRegistration(req: StartRegistrationRequest): Promise<Result<void>> {
    return this.run(() => {
      const errors: string[] = [];
      if (!isPhone(req.phone)) errors.push("phone");
      if (req.onboardingContext !== "existing_customer" && req.onboardingContext !== "new_customer") {
        errors.push("onboardingContext");
      }
      if (errors.length > 0) {
        return fail("VALIDATION_FAILED", errors);
      }
      this.registration = {
        phone: req.phone,
        context: req.onboardingContext,
        pendingEmail: null,
        verifiedEmail: null,
        detailsSubmitted: false,
        mpinHash: null,
        otpRequested: false,
      };
      return ok();
    });
  }

  submitPersonalDetails(req: PersonalDetails): Promise<Result<void>> {
    return this.run(() => {
      const draft = this.registration;
      if (!draft) {
        return fail("STATE_CONFLICT");
      }
      const errors = personalDetailsErrors(req);
      if (errors.length > 0) {
        return fail("VALIDATION_FAILED", errors);
      }
      const birthDate = parseIsoDate(req.birthDate);
      if (!birthDate || !isAdult(birthDate, this.now())) {
        return fail("AGE_RESTRICTION", ["birthDate"]);
      }
      if (draft.verifiedEmail === null || draft.verifiedEmail !== req.email) {
        return fail("STATE_CONFLICT", ["email"]);
      }
      const hasCard = req.card !== undefined;
      if (hasCard !== (draft.context === "existing_customer")) {
        return fail("STATE_CONFLICT", ["card"]);
      }
      // Personal details are only checked: the demo has no screen that reads them back.
      draft.detailsSubmitted = true;
      return ok();
    });
  }

  // D. OTP

  requestOtp(req: { purpose: OtpPurpose }): Promise<Result<CodeDelivery>> {
    return this.run(() => {
      if (req.purpose === "onboarding") {
        const draft = this.registration;
        if (!draft || draft.mpinHash === null) {
          return fail("STATE_CONFLICT");
        }
        draft.otpRequested = true;
        return ok(this.delivery(maskPhone(draft.phone)));
      }
      if (req.purpose === "change_mpin") {
        if (!this.session || !this.state.customer) {
          return fail("SESSION_EXPIRED");
        }
        this.changeMpinStep = "requested";
        return ok(this.delivery(maskPhone(this.state.customer.phone)));
      }
      return fail("VALIDATION_FAILED", ["purpose"]);
    });
  }

  verifyOtp(req: { purpose: OtpPurpose; code: string }): Promise<Result<void>> {
    return this.run(() => {
      const codeOk = req.code === this.seed.codes.otp;
      if (req.purpose === "onboarding") {
        const draft = this.registration;
        if (!draft || !draft.otpRequested || draft.mpinHash === null || !codeOk) {
          return fail("CODE_INVALID");
        }
        this.completeRegistration(draft.phone, draft.mpinHash, draft.context);
        return ok();
      }
      if (req.purpose === "change_mpin") {
        if (!this.session) {
          return fail("SESSION_EXPIRED");
        }
        if (this.changeMpinStep !== "requested" || !codeOk) {
          return fail("CODE_INVALID");
        }
        this.changeMpinStep = "verified";
        return ok();
      }
      return fail("VALIDATION_FAILED", ["purpose"]);
    });
  }

  // E. Email

  sendEmailCode(req: { email: string }): Promise<Result<CodeDelivery>> {
    return this.run(() => {
      const draft = this.registration;
      if (!draft) {
        return fail("STATE_CONFLICT");
      }
      if (!isEmail(req.email)) {
        return fail("VALIDATION_FAILED", ["email"]);
      }
      draft.pendingEmail = req.email;
      draft.verifiedEmail = null;
      return ok(this.delivery(maskEmail(req.email)));
    });
  }

  verifyEmailCode(req: { code: string }): Promise<Result<void>> {
    return this.run(() => {
      const draft = this.registration;
      if (!draft || draft.pendingEmail === null || req.code !== this.seed.codes.email) {
        return fail("CODE_INVALID");
      }
      draft.verifiedEmail = draft.pendingEmail;
      return ok();
    });
  }

  // F. MPIN

  setMpin(req: { mpin: string }): Promise<Result<void>> {
    return this.run(() => {
      const draft = this.registration;
      if (!draft || !draft.detailsSubmitted) {
        return fail("STATE_CONFLICT");
      }
      if (!isMpin(req.mpin)) {
        return fail("VALIDATION_FAILED", ["mpin"]);
      }
      draft.mpinHash = hashMpin(req.mpin);
      return ok();
    });
  }

  changeMpin(req: { newMpin: string }): Promise<Result<void>> {
    return this.run(() => {
      const customer = this.state.customer;
      if (!this.session || !customer) {
        return fail("SESSION_EXPIRED");
      }
      if (this.changeMpinStep !== "verified") {
        return fail("STATE_CONFLICT");
      }
      if (!isMpin(req.newMpin)) {
        return fail("VALIDATION_FAILED", ["newMpin"]);
      }
      customer.mpinHash = hashMpin(req.newMpin);
      this.changeMpinStep = "none";
      this.persist();
      return ok();
    });
  }

  // G–H. Accounts and transactions

  getAccounts(): Promise<Result<AccountSummary[]>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      return ok(structuredClone(this.state.accounts));
    });
  }

  getRecentTransactions(req: { accountId: string; limit: number }): Promise<Result<Transaction[]>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      const errors: string[] = [];
      if (!this.state.accounts.some((account) => account.id === req.accountId)) errors.push("accountId");
      if (!Number.isSafeInteger(req.limit) || req.limit < 1) errors.push("limit");
      if (errors.length > 0) {
        return fail("VALIDATION_FAILED", errors);
      }
      const items = this.state.transactions
        .filter((tx) => tx.accountId === req.accountId)
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .slice(0, req.limit)
        .map(({ id, title, date, amount, status }) => ({ id, title, date, amount: { ...amount }, status }));
      return ok(items);
    });
  }

  // I. Payments

  getTransferLimits(req: { method: TransferMethod }): Promise<Result<TransferLimits>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      if (req.method !== "mobile" && req.method !== "bankAccount") {
        return fail("VALIDATION_FAILED", ["method"]);
      }
      return ok(structuredClone(this.seed.limits[req.method]));
    });
  }

  confirmTransfer(req: TransferRequest): Promise<Result<TransferResult>> {
    return this.run(() => {
      const customer = this.state.customer;
      if (!this.session || !customer) {
        return fail("SESSION_EXPIRED");
      }
      const errors = transferRequestErrors(req);
      if (errors.length > 0) {
        return fail("VALIDATION_FAILED", errors);
      }
      const { confirmation, recipient, amount } = req;
      if (confirmation.method === "mpin" && hashMpin(confirmation.mpin) !== customer.mpinHash) {
        return fail("MPIN_INVALID");
      }

      // Idempotency: a repeated successful request returns its first result and moves no money.
      const fingerprint = transferFingerprint(req);
      const completed = this.state.completedTransfers[req.clientRequestId];
      if (completed) {
        return completed.fingerprint === fingerprint
          ? ok({ ...completed.result })
          : fail("VALIDATION_FAILED", ["clientRequestId"]);
      }

      const account = this.state.accounts.find((item) => item.id === req.sourceAccountId);
      if (!account) {
        return fail("VALIDATION_FAILED", ["sourceAccountId"]);
      }
      if (account.status === "blocked") {
        return fail("STATE_CONFLICT", ["sourceAccountId"]); // D-25
      }
      if (recipient.method === "mobile") {
        const bankIds = this.seed.phoneDirectory[recipient.phone] ?? [];
        if (bankIds.length === 0) {
          return fail("RECIPIENT_NOT_FOUND", ["recipient.phone"]);
        }
        if (!bankIds.includes(recipient.bankId)) {
          return fail("VALIDATION_FAILED", ["recipient.bankId"]);
        }
      }
      const limits = this.seed.limits[recipient.method];
      if (amount.amount < limits.min.amount || amount.amount > limits.max.amount) {
        return fail("AMOUNT_OUT_OF_LIMITS", ["amount"]);
      }
      if (account.balance.amount < amount.amount) {
        return fail("INSUFFICIENT_FUNDS");
      }

      const result: TransferResult = { status: "success" };
      account.balance.amount -= amount.amount;
      this.state.transactions.push({
        id: `transfer-${req.clientRequestId}`,
        accountId: account.id,
        title:
          recipient.method === "mobile"
            ? `Перевод по номеру ${recipient.phone}`
            : `Перевод: ${recipient.recipientName.trim()}`,
        date: this.now().toISOString(),
        amount: { amount: -amount.amount, currency: "RUB" },
        status: "success",
      });
      this.state.completedTransfers[req.clientRequestId] = { fingerprint, result };
      this.persist();
      return ok({ ...result });
    });
  }

  // J. SBP

  findRecipientBanks(req: { phone: string }): Promise<Result<Bank[]>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      if (!isPhone(req.phone)) {
        return fail("VALIDATION_FAILED", ["phone"]);
      }
      const bankIds = this.seed.phoneDirectory[req.phone] ?? [];
      const banks = this.seed.banks.filter((bank) => bankIds.includes(bank.id)).map((bank) => ({ ...bank }));
      return ok(banks);
    });
  }

  getSbpDefaultBank(): Promise<Result<{ isDefault: boolean }>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      return ok({ isDefault: this.state.sbpDefaultBank });
    });
  }

  setSbpDefaultBank(): Promise<Result<void>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      this.state.sbpDefaultBank = true;
      this.persist();
      return ok();
    });
  }

  // K. Settings

  getLanguageSettings(): Promise<Result<LanguageSettings>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      return ok({ current: this.state.language, available: structuredClone(this.seed.languages) });
    });
  }

  setLanguage(req: { code: string }): Promise<Result<void>> {
    return this.run(() => {
      if (!this.session) {
        return fail("SESSION_EXPIRED");
      }
      if (!this.seed.languages.some((lang) => lang.code === req.code)) {
        return fail("VALIDATION_FAILED", ["code"]);
      }
      this.state.language = req.code;
      this.persist();
      return ok();
    });
  }

  // Internals

  /** Every operation resolves to a Result; an unexpected exception becomes UNKNOWN. */
  private async run<T>(operation: () => Result<T>): Promise<Result<T>> {
    try {
      return operation();
    } catch {
      return fail("UNKNOWN");
    }
  }

  private persist(): void {
    saveDemoState(this.storage, this.state);
  }

  private delivery(destinationMasked: string): CodeDelivery {
    return { destinationMasked, codeLength: this.seed.codes.length, resendAfterSec: this.seed.codes.resendAfterSec };
  }

  /** Binds this app instance to the registered customer (G-1). No banking product is opened (D-18). */
  private completeRegistration(phone: string, mpinHash: string, context: OnboardingContext): void {
    const existing = context === "existing_customer";
    this.state = {
      ...this.state,
      customer: { phone, mpinHash },
      accounts: existing ? structuredClone(this.seed.accounts) : [],
      transactions: existing ? structuredClone(this.seed.transactions) : [],
      completedTransfers: {},
    };
    this.registration = null;
    this.session = true;
    this.changeMpinStep = "none";
    this.persist();
  }
}

/** Everything that defines a transfer except how it was confirmed. */
function transferFingerprint(req: TransferRequest): string {
  const { recipient } = req;
  const recipientKey =
    recipient.method === "mobile"
      ? [recipient.method, recipient.phone, recipient.bankId]
      : [recipient.method, recipient.accountNumber, recipient.bik, recipient.recipientName];
  return JSON.stringify([req.sourceAccountId, recipientKey, req.amount.amount, req.comment ?? null]);
}

function maskPhone(phone: string): string {
  return `+7 ••• •••-${phone.slice(-4, -2)}-${phone.slice(-2)}`;
}

function maskEmail(email: string): string {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}•••@${domain}`;
}
