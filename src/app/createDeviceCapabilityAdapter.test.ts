import { describe, expect, it } from "vitest";
import { DemoAdapter } from "../adapters/banking/demo/DemoAdapter";
import { NullAdapter } from "../adapters/banking/NullAdapter";
import { DemoDeviceAdapter } from "../adapters/device/DemoDeviceAdapter";
import { NullDeviceAdapter } from "../adapters/device/NullDeviceAdapter";
import { createBankingAdapter } from "./createBankingAdapter";
import { createDeviceCapabilityAdapter } from "./createDeviceCapabilityAdapter";

describe("createDeviceCapabilityAdapter", () => {
  it("maps demo and null, and uses demo when unset or empty", () => {
    expect(createDeviceCapabilityAdapter("demo")).toBeInstanceOf(DemoDeviceAdapter);
    expect(createDeviceCapabilityAdapter("null")).toBeInstanceOf(NullDeviceAdapter);
    expect(createDeviceCapabilityAdapter(undefined)).toBeInstanceOf(DemoDeviceAdapter);
    expect(createDeviceCapabilityAdapter("")).toBeInstanceOf(DemoDeviceAdapter);
  });

  it("rejects an unknown value instead of falling back", () => {
    expect(() => createDeviceCapabilityAdapter("webauthn")).toThrow(
      'Unknown VITE_DEVICE_ADAPTER "webauthn". Expected one of: demo, null.',
    );
  });

  it("is independent of the banking adapter selection", () => {
    const combinations = [
      ["demo", "demo", DemoAdapter, DemoDeviceAdapter],
      ["demo", "null", DemoAdapter, NullDeviceAdapter],
      ["null", "demo", NullAdapter, DemoDeviceAdapter],
      ["null", "null", NullAdapter, NullDeviceAdapter],
    ] as const;
    for (const [banking, device, Banking, Device] of combinations) {
      expect(createBankingAdapter(banking)).toBeInstanceOf(Banking);
      expect(createDeviceCapabilityAdapter(device)).toBeInstanceOf(Device);
    }
  });
});
