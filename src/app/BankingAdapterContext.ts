import { createContext, useContext } from "react";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";

export const BankingAdapterContext = createContext<BankingAdapter | null>(null);

/** The only way UI code reaches the banking core. It sees the interface, never an implementation. */
export function useBankingAdapter(): BankingAdapter {
  const adapter = useContext(BankingAdapterContext);
  if (!adapter) {
    throw new Error("useBankingAdapter must be used inside <BankingAdapterProvider>");
  }
  return adapter;
}
