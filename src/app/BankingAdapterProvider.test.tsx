import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import { stubBankingAdapter } from "../adapters/banking/testing/fixtures";
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
});
