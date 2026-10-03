import type { ContractError } from "../../adapters/banking/types";
import type { Messages } from "../../localization/messages";

/** What went wrong with a login attempt: a contract error, or the device did not confirm biometrics. */
export type LoginProblem = ContractError | "biometric_not_verified";

/** What AUTH-01 shows for a failed login: an MPIN error, or a status message. */
export type LoginFailure =
  | { target: "mpin"; message: string }
  | { target: "status"; kind: "error" | "unavailable"; title: string; description: string };

/**
 * Maps a failed login to UI state in the current language. Raw codes never reach the user.
 * Biometrics not confirmed is a device state, not a banking error: the bank was not asked.
 */
export function loginFailure(problem: LoginProblem, t: Messages): LoginFailure {
  if (problem === "biometric_not_verified") {
    return { target: "status", kind: "error", title: t.login.biometricNotVerified, description: t.login.useMpin };
  }
  switch (problem.code) {
    case "MPIN_INVALID":
      return { target: "mpin", message: t.login.mpinInvalid };
    case "UNAVAILABLE":
      return { target: "status", kind: "unavailable", title: t.status.bankUnavailable, description: t.login.unavailable };
    case "STATE_CONFLICT":
      return { target: "status", kind: "error", title: t.login.notRegistered, description: t.login.registerFirst };
    default:
      return { target: "status", kind: "error", title: t.login.failed, description: t.status.tryAgain };
  }
}
