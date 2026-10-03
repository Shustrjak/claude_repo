import { describe, expect, it } from "vitest";
import { DemoAdapter } from "../adapters/banking/demo/DemoAdapter";
import { NullAdapter } from "../adapters/banking/NullAdapter";
import { createBankingAdapter } from "./createBankingAdapter";

describe("createBankingAdapter", () => {
  it("maps demo to DemoAdapter and null to NullAdapter", () => {
    expect(createBankingAdapter("demo")).toBeInstanceOf(DemoAdapter);
    expect(createBankingAdapter("null")).toBeInstanceOf(NullAdapter);
  });

  it("uses the demo adapter when the variable is unset or empty", () => {
    expect(createBankingAdapter(undefined)).toBeInstanceOf(DemoAdapter);
    expect(createBankingAdapter("")).toBeInstanceOf(DemoAdapter);
  });

  it("rejects an unknown value instead of falling back", () => {
    expect(() => createBankingAdapter("real")).toThrow('Unknown VITE_BANKING_ADAPTER "real". Expected one of: demo, null.');
    expect(() => createBankingAdapter("Demo")).toThrow(/Unknown VITE_BANKING_ADAPTER/);
  });
});
