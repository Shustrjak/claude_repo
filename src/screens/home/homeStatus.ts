import type { ContractError } from "../../adapters/banking/types";
import type { AsyncContentState } from "../../components/semantic/AsyncContent";

/** Why the accounts could not be loaded, in words for the user. Raw codes never reach the screen. */
export function accountsFailure(error: ContractError): Extract<AsyncContentState, { status: "error" }> {
  switch (error.code) {
    case "UNAVAILABLE":
      return {
        status: "error",
        kind: "unavailable",
        message: { title: "Банк сейчас недоступен", description: "Не удалось загрузить счета." },
      };
    case "SESSION_EXPIRED":
      return { status: "error", kind: "error", message: { title: "Сессия истекла", description: "Войдите снова." } };
    default:
      return {
        status: "error",
        kind: "error",
        message: { title: "Не удалось загрузить счета", description: "Попробуйте ещё раз." },
      };
  }
}
