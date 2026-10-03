import type { ReactNode } from "react";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import { BankingAdapterContext } from "./BankingAdapterContext";

type Props = { adapter: BankingAdapter; children: ReactNode };

export function BankingAdapterProvider({ adapter, children }: Props) {
  return <BankingAdapterContext.Provider value={adapter}>{children}</BankingAdapterContext.Provider>;
}
