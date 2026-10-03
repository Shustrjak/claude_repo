import type { ContractError } from "../../adapters/banking/types";

/** What AUTH-01 shows for a failed login: an MPIN error, or a status message. */
export type LoginFailure =
  | { target: "mpin"; message: string }
  | { target: "status"; kind: "error" | "unavailable"; title: string; description: string };

/** Maps contract errors of `login` to UI state. Raw codes never reach the user. */
export function loginFailure(error: ContractError): LoginFailure {
  switch (error.code) {
    case "MPIN_INVALID":
      return { target: "mpin", message: "Неверный MPIN. Попробуйте ещё раз." };
    case "UNAVAILABLE":
      return {
        target: "status",
        kind: "unavailable",
        title: "Банк сейчас недоступен",
        description: "Банковское ядро не подключено, войти не получится.",
      };
    case "STATE_CONFLICT":
      return {
        target: "status",
        kind: "error",
        title: "На этом устройстве нет регистрации",
        description: "Сначала зарегистрируйтесь в мобильном банке.",
      };
    default:
      return { target: "status", kind: "error", title: "Не удалось войти", description: "Попробуйте ещё раз." };
  }
}
