// Contract models of API Contract v1 (docs/api/API_CONTRACT_V1.md).
// Field names and shapes mirror the contract exactly; provenance lives in the document.

// 3. Common models

export type Result<T> = { ok: true; data: T } | { ok: false; error: ContractError };

export type ErrorCode =
  | "UNAVAILABLE"
  | "UNKNOWN"
  | "VALIDATION_FAILED"
  | "SESSION_EXPIRED"
  | "STATE_CONFLICT"
  | "MPIN_INVALID"
  | "CODE_INVALID"
  | "AGE_RESTRICTION"
  | "AMOUNT_OUT_OF_LIMITS"
  | "INSUFFICIENT_FUNDS"
  | "RECIPIENT_NOT_FOUND";

/** `fields` are request field paths; nested paths use dots, e.g. `recipient.recipientName`. */
export type ContractError = { code: ErrorCode; fields?: string[] };

/** `amount` is an integer number of kopecks; signed for transactions. */
export type Money = { amount: number; currency: "RUB" };

export type CodeDelivery = { destinationMasked: string; codeLength: number; resendAfterSec: number };

// A. Authentication and session

export type LoginRequest = { method: "mpin"; mpin: string } | { method: "biometric" };

// B–C. Registration and onboarding context

export type OnboardingContext = "existing_customer" | "new_customer";

export type StartRegistrationRequest = { phone: string; onboardingContext: OnboardingContext };

export type Address = {
  postalCode: string;
  region: string;
  city: string;
  district: string;
  street: string;
  house: string;
  /** Empty string means "no apartment" (CQ-01 stays open). */
  apartment: string;
};

export type CardDetails = { number: string; expiry: string };

export type PersonalDetails = {
  firstName: string;
  lastName: string;
  birthDate: string;
  address: Address;
  email: string;
  consents: { push: boolean; marketing: boolean };
  /** Only for `existing_customer` (D-18). */
  card?: CardDetails;
};

// D. OTP

export type OtpPurpose = "onboarding" | "change_mpin";

// G. Accounts

export type AccountStatus = "active" | "blocked";

export type AccountSummary = {
  id: string;
  name: string;
  maskedNumber: string;
  balance: Money;
  status: AccountStatus;
};

// H. Account transactions

export type TransactionStatus = "success" | "pending" | "failure";

export type Transaction = {
  id: string;
  title: string;
  date: string;
  amount: Money;
  status: TransactionStatus;
};

// I. Payments

export type TransferMethod = "mobile" | "bankAccount";

export type TransferLimits = { min: Money; max: Money };

export type TransferRecipient =
  | { method: "mobile"; phone: string; bankId: string }
  | { method: "bankAccount"; accountNumber: string; bik: string; recipientName: string };

export type TransferConfirmation = { method: "biometric" } | { method: "mpin"; mpin: string };

export type TransferRequest = {
  clientRequestId: string;
  sourceAccountId: string;
  recipient: TransferRecipient;
  amount: Money;
  comment?: string;
  confirmation: TransferConfirmation;
};

export type TransferResult = { status: "success" | "pending" };

// J. SBP

export type Bank = { id: string; name: string };

// K. Settings

export type LanguageSettings = { current: string; available: { code: string; title: string }[] };
