import type { ContractError } from "../../adapters/banking/types";
import type { Messages } from "../../localization/messages";

export type SettingsStatus = { kind: "error" | "unavailable"; title: string; description: string };

/** Banking errors on settings screens that no field owns, in the current language. Raw codes never reach the user. */
export function settingsStatusFor(error: ContractError, t: Messages): SettingsStatus {
  switch (error.code) {
    case "UNAVAILABLE":
      return { kind: "unavailable", title: t.status.bankUnavailable, description: t.status.coreNotConnected };
    case "SESSION_EXPIRED":
      return { kind: "error", title: t.status.sessionExpired, description: t.status.signInAgainAndRetry };
    case "STATE_CONFLICT":
      return { kind: "error", title: t.settings.confirmCodeFirst, description: t.settings.requestCodeAgain };
    default:
      return { kind: "error", title: t.status.somethingWrong, description: t.status.tryAgain };
  }
}
