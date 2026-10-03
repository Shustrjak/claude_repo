import type { ContractError } from "../../adapters/banking/types";

/** A status message for a registration screen. */
export type ScreenStatus = { kind: "error" | "unavailable"; title: string; description: string };

/** Banking errors that no field owns. Field errors are mapped by each screen itself. */
export function statusFor(error: ContractError): ScreenStatus {
  switch (error.code) {
    case "UNAVAILABLE":
      return { kind: "unavailable", title: "Банк сейчас недоступен", description: "Банковское ядро не подключено." };
    case "STATE_CONFLICT":
      return {
        kind: "error",
        title: "Шаг регистрации сейчас недоступен",
        description: "Начните регистрацию заново с экрана входа.",
      };
    default:
      return { kind: "error", title: "Что-то пошло не так", description: "Попробуйте ещё раз." };
  }
}
