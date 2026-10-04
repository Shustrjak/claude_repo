import type { ContractError } from "../../adapters/banking/types";
import type { AsyncContentState } from "../../components/semantic/AsyncContent";
import type { Messages } from "../../localization/messages";

type Failure = Extract<AsyncContentState, { status: "error" }> & { retryable: boolean };

/**
 * Why the operations could not be loaded, in the current language (D-53). An unknown account is not
 * retried: asking again gives the same answer, and no other account is ever substituted.
 */
export function statementFailure(error: ContractError, t: Messages): Failure {
  if (error.code === "VALIDATION_FAILED" && error.fields?.includes("accountId")) {
    return {
      status: "error",
      kind: "error",
      message: { title: t.statement.unknownAccount, description: t.statement.backHome },
      retryable: false,
    };
  }
  switch (error.code) {
    case "UNAVAILABLE":
      return {
        status: "error",
        kind: "unavailable",
        message: { title: t.status.bankUnavailable, description: t.statement.notLoaded },
        retryable: true,
      };
    case "SESSION_EXPIRED":
      return {
        status: "error",
        kind: "error",
        message: { title: t.status.sessionExpired, description: t.status.signInAgain },
        retryable: true,
      };
    default:
      return {
        status: "error",
        kind: "error",
        message: { title: t.statement.loadFailed, description: t.status.tryAgain },
        retryable: true,
      };
  }
}
