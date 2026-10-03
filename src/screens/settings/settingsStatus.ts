import type { ContractError } from "../../adapters/banking/types";

export type SettingsStatus = { kind: "error" | "unavailable"; title: string; description: string };

/** Banking errors on settings screens that no field owns. Raw codes never reach the user. */
export function settingsStatusFor(error: ContractError): SettingsStatus {
  switch (error.code) {
    case "UNAVAILABLE":
      return { kind: "unavailable", title: "Банк сейчас недоступен", description: "Банковское ядро не подключено." };
    case "SESSION_EXPIRED":
      return { kind: "error", title: "Сессия истекла", description: "Войдите снова и повторите." };
    case "STATE_CONFLICT":
      return { kind: "error", title: "Сначала подтвердите код", description: "Запросите код и введите его снова." };
    default:
      return { kind: "error", title: "Что-то пошло не так", description: "Попробуйте ещё раз." };
  }
}
