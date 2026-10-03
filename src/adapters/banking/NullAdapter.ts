import type { BankingAdapter } from "./BankingAdapter";
import { fail, ok } from "./result";
import type {
  AccountSummary,
  Bank,
  CodeDelivery,
  LanguageSettings,
  Result,
  Transaction,
  TransferLimits,
  TransferResult,
} from "./types";

/**
 * No banking core (rule G-6): a read returns its empty value when one exists, otherwise
 * UNAVAILABLE; every action returns UNAVAILABLE. No data, no storage, no network.
 */
export class NullAdapter implements BankingAdapter {
  // Reads with an empty value
  async getAccounts(): Promise<Result<AccountSummary[]>> {
    return ok([]);
  }
  async getRecentTransactions(): Promise<Result<Transaction[]>> {
    return ok([]);
  }
  async findRecipientBanks(): Promise<Result<Bank[]>> {
    return ok([]);
  }

  // Reads without an empty value
  async getTransferLimits(): Promise<Result<TransferLimits>> {
    return fail("UNAVAILABLE");
  }
  async getSbpDefaultBank(): Promise<Result<{ isDefault: boolean }>> {
    return fail("UNAVAILABLE");
  }
  async getLanguageSettings(): Promise<Result<LanguageSettings>> {
    return fail("UNAVAILABLE");
  }

  // Actions
  async login(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async logout(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async startRegistration(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async submitPersonalDetails(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async requestOtp(): Promise<Result<CodeDelivery>> {
    return fail("UNAVAILABLE");
  }
  async verifyOtp(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async sendEmailCode(): Promise<Result<CodeDelivery>> {
    return fail("UNAVAILABLE");
  }
  async verifyEmailCode(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async setMpin(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async changeMpin(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async confirmTransfer(): Promise<Result<TransferResult>> {
    return fail("UNAVAILABLE");
  }
  async setSbpDefaultBank(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
  async setLanguage(): Promise<Result<void>> {
    return fail("UNAVAILABLE");
  }
}
