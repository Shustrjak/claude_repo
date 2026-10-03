import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import { DemoAdapter } from "../adapters/banking/demo/DemoAdapter";
import { NullAdapter } from "../adapters/banking/NullAdapter";

export const BANKING_ADAPTER_MODES = ["demo", "null"] as const;
export type BankingAdapterMode = (typeof BANKING_ADAPTER_MODES)[number];
export const DEFAULT_BANKING_ADAPTER_MODE: BankingAdapterMode = "demo";

function isMode(value: string): value is BankingAdapterMode {
  return (BANKING_ADAPTER_MODES as readonly string[]).includes(value);
}

/**
 * Maps the `VITE_BANKING_ADAPTER` value to an implementation. Unset or empty means the default;
 * any other unknown value is a configuration error, never a silent fallback.
 */
export function createBankingAdapter(mode: string | undefined): BankingAdapter {
  const selected = mode === undefined || mode === "" ? DEFAULT_BANKING_ADAPTER_MODE : mode;
  if (!isMode(selected)) {
    throw new Error(
      `Unknown VITE_BANKING_ADAPTER "${selected}". Expected one of: ${BANKING_ADAPTER_MODES.join(", ")}.`,
    );
  }
  switch (selected) {
    case "demo":
      return new DemoAdapter();
    case "null":
      return new NullAdapter();
  }
}
