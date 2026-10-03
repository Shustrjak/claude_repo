import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import { stubBankingAdapter } from "../adapters/banking/testing/fixtures";
import { App } from "./App";
import { useBankingAdapter } from "./BankingAdapterContext";
import { BankingAdapterProvider } from "./BankingAdapterProvider";

function Consumer({ expected }: { expected: BankingAdapter }) {
  const adapter = useBankingAdapter();
  return <span>{adapter === expected ? "injected" : "other"}</span>;
}

describe("BankingAdapterProvider", () => {
  it("hands consumers the injected BankingAdapter, whatever its implementation", () => {
    const { adapter } = stubBankingAdapter();
    const html = renderToString(
      <BankingAdapterProvider adapter={adapter}>
        <Consumer expected={adapter} />
      </BankingAdapterProvider>,
    );
    expect(html).toContain("injected");
  });

  it("fails loudly when a consumer is rendered outside the provider", () => {
    const { adapter } = stubBankingAdapter();
    expect(() => renderToString(<Consumer expected={adapter} />)).toThrow(/BankingAdapterProvider/);
  });

  it("renders the app shell without calling any banking operation", () => {
    const { adapter, calls } = stubBankingAdapter();
    const html = renderToString(
      <BankingAdapterProvider adapter={adapter}>
        <App />
      </BankingAdapterProvider>,
    );
    expect(html).toContain("Banking Shell");
    expect(calls).toEqual([]);
  });
});
