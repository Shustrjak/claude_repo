import type { ContractError } from "../../adapters/banking/types";
import type { AsyncContentState } from "../../components/semantic/AsyncContent";
import type { Messages } from "../../localization/messages";

/** Why the accounts could not be loaded, in the current language. Raw codes never reach the screen. */
export function accountsFailure(error: ContractError, t: Messages): Extract<AsyncContentState, { status: "error" }> {
  switch (error.code) {
    case "UNAVAILABLE":
      return {
        status: "error",
        kind: "unavailable",
        message: { title: t.status.bankUnavailable, description: t.home.accountsNotLoaded },
      };
    case "SESSION_EXPIRED":
      return { status: "error", kind: "error", message: { title: t.status.sessionExpired, description: t.status.signInAgain } };
    default:
      return { status: "error", kind: "error", message: { title: t.home.loadFailed, description: t.status.tryAgain } };
  }
}
