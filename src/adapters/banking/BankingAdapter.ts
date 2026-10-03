import type {
  AccountSummary,
  Bank,
  CodeDelivery,
  LanguageSettings,
  LoginRequest,
  OtpPurpose,
  PersonalDetails,
  Result,
  StartRegistrationRequest,
  Transaction,
  TransferLimits,
  TransferMethod,
  TransferRequest,
  TransferResult,
} from "./types";

/**
 * The UI-facing banking boundary: the 19 operations of API Contract v1, one method each.
 * Storage, transport and device capabilities (SIM, biometrics, camera) are not part of it (D-14).
 */
export interface BankingAdapter {
  // A. Session
  login(req: LoginRequest): Promise<Result<void>>;
  logout(): Promise<Result<void>>;
  // B–C. Registration and onboarding context
  startRegistration(req: StartRegistrationRequest): Promise<Result<void>>;
  submitPersonalDetails(req: PersonalDetails): Promise<Result<void>>;
  // D. OTP
  requestOtp(req: { purpose: OtpPurpose }): Promise<Result<CodeDelivery>>;
  verifyOtp(req: { purpose: OtpPurpose; code: string }): Promise<Result<void>>;
  // E. Email
  sendEmailCode(req: { email: string }): Promise<Result<CodeDelivery>>;
  verifyEmailCode(req: { code: string }): Promise<Result<void>>;
  // F. MPIN
  setMpin(req: { mpin: string }): Promise<Result<void>>;
  changeMpin(req: { newMpin: string }): Promise<Result<void>>;
  // G–H. Accounts and transactions
  getAccounts(): Promise<Result<AccountSummary[]>>;
  getRecentTransactions(req: { accountId: string; limit: number }): Promise<Result<Transaction[]>>;
  // I. Payments
  getTransferLimits(req: { method: TransferMethod }): Promise<Result<TransferLimits>>;
  confirmTransfer(req: TransferRequest): Promise<Result<TransferResult>>;
  // J. SBP
  findRecipientBanks(req: { phone: string }): Promise<Result<Bank[]>>;
  getSbpDefaultBank(): Promise<Result<{ isDefault: boolean }>>;
  setSbpDefaultBank(): Promise<Result<void>>;
  // K. Settings
  getLanguageSettings(): Promise<Result<LanguageSettings>>;
  setLanguage(req: { code: string }): Promise<Result<void>>;
}
