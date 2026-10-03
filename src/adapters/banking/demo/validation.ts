// Runtime checks for DemoAdapter. The adapter is the final validator (G-2), so requests are
// checked as `unknown` even though TypeScript already constrains well-behaved callers.

const PHONE_RE = /^\+7\d{10}$/;
const MPIN_RE = /^\d{4}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACCOUNT_NUMBER_RE = /^\d{20}$/;
const BIK_RE = /^\d{9}$/;
const CARD_NUMBER_RE = /^\d+$/;
const CARD_EXPIRY_RE = /^(0[1-9]|1[0-2])\/\d{2}$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

export const isPhone = (value: unknown): value is string => typeof value === "string" && PHONE_RE.test(value);
export const isMpin = (value: unknown): value is string => typeof value === "string" && MPIN_RE.test(value);
export const isEmail = (value: unknown): value is string => typeof value === "string" && EMAIL_RE.test(value);

export function isMoney(value: unknown): value is { amount: number; currency: "RUB" } {
  return isRecord(value) && Number.isSafeInteger(value.amount) && value.currency === "RUB";
}

/** Parses `YYYY-MM-DD` into a UTC date, or returns null for anything that is not a real date. */
export function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = DATE_RE.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const valid = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return valid ? date : null;
}

export function isAdult(birthDate: Date, now: Date): boolean {
  const eighteenth = Date.UTC(birthDate.getUTCFullYear() + 18, birthDate.getUTCMonth(), birthDate.getUTCDate());
  return eighteenth <= now.getTime();
}

/** Field paths of `PersonalDetails` that fail format checks. */
export function personalDetailsErrors(req: unknown): string[] {
  if (!isRecord(req)) {
    return ["details"];
  }
  const errors: string[] = [];
  for (const key of ["firstName", "lastName"]) {
    if (!isNonEmptyString(req[key])) errors.push(key);
  }
  if (!parseIsoDate(req.birthDate)) errors.push("birthDate");
  const address = req.address;
  if (!isRecord(address)) {
    errors.push("address");
  } else {
    for (const key of ["postalCode", "region", "city", "district", "street", "house"]) {
      if (!isNonEmptyString(address[key])) errors.push(`address.${key}`);
    }
    if (typeof address.apartment !== "string") errors.push("address.apartment");
  }
  if (!isEmail(req.email)) errors.push("email");
  const consents = req.consents;
  if (!isRecord(consents)) {
    errors.push("consents");
  } else {
    if (typeof consents.push !== "boolean") errors.push("consents.push");
    if (typeof consents.marketing !== "boolean") errors.push("consents.marketing");
  }
  if (req.card !== undefined) {
    if (!isRecord(req.card)) {
      errors.push("card");
    } else {
      const { number, expiry } = req.card;
      if (typeof number !== "string" || !CARD_NUMBER_RE.test(number)) errors.push("card.number");
      if (typeof expiry !== "string" || !CARD_EXPIRY_RE.test(expiry)) errors.push("card.expiry");
    }
  }
  return errors;
}

/** Field paths of `TransferRequest` that fail shape or format checks. */
export function transferRequestErrors(req: unknown): string[] {
  if (!isRecord(req)) {
    return ["request"];
  }
  const errors: string[] = [];
  if (!isNonEmptyString(req.clientRequestId)) errors.push("clientRequestId");
  if (!isNonEmptyString(req.sourceAccountId)) errors.push("sourceAccountId");

  const recipient = req.recipient;
  if (!isRecord(recipient)) {
    errors.push("recipient");
  } else if (recipient.method === "mobile") {
    if (!isPhone(recipient.phone)) errors.push("recipient.phone");
    if (!isNonEmptyString(recipient.bankId)) errors.push("recipient.bankId");
  } else if (recipient.method === "bankAccount") {
    const { accountNumber, bik } = recipient;
    if (typeof accountNumber !== "string" || !ACCOUNT_NUMBER_RE.test(accountNumber)) {
      errors.push("recipient.accountNumber");
    }
    if (typeof bik !== "string" || !BIK_RE.test(bik)) errors.push("recipient.bik");
    if (!isNonEmptyString(recipient.recipientName)) errors.push("recipient.recipientName");
  } else {
    errors.push("recipient.method");
  }

  if (!isMoney(req.amount) || req.amount.amount <= 0) errors.push("amount");
  if (req.comment !== undefined && typeof req.comment !== "string") errors.push("comment");

  const confirmation = req.confirmation;
  if (!isRecord(confirmation)) {
    errors.push("confirmation");
  } else if (confirmation.method === "mpin") {
    if (!isMpin(confirmation.mpin)) errors.push("confirmation.mpin");
  } else if (confirmation.method !== "biometric") {
    errors.push("confirmation.method");
  }
  return errors;
}
