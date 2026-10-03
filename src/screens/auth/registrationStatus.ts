import type { ContractError } from "../../adapters/banking/types";
import type { Messages } from "../../localization/messages";

/** A status message for a registration screen. */
export type ScreenStatus = { kind: "error" | "unavailable"; title: string; description: string };

/**
 * Banking errors that no field owns, in the current language. Screens keep the error itself and
 * map it while rendering. Field errors are mapped by each screen itself.
 */
export function statusFor(error: ContractError, t: Messages): ScreenStatus {
  switch (error.code) {
    case "UNAVAILABLE":
      return { kind: "unavailable", title: t.status.bankUnavailable, description: t.status.coreNotConnected };
    case "STATE_CONFLICT":
      return { kind: "error", title: t.registration.stepUnavailable, description: t.registration.startAgain };
    default:
      return { kind: "error", title: t.status.somethingWrong, description: t.status.tryAgain };
  }
}
