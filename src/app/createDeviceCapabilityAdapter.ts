import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";
import { DemoDeviceAdapter } from "../adapters/device/DemoDeviceAdapter";
import { NullDeviceAdapter } from "../adapters/device/NullDeviceAdapter";

export const DEVICE_ADAPTER_MODES = ["demo", "null"] as const;
export type DeviceAdapterMode = (typeof DEVICE_ADAPTER_MODES)[number];
export const DEFAULT_DEVICE_ADAPTER_MODE: DeviceAdapterMode = "demo";

function isMode(value: string): value is DeviceAdapterMode {
  return (DEVICE_ADAPTER_MODES as readonly string[]).includes(value);
}

/**
 * Maps `VITE_DEVICE_ADAPTER` to an implementation, independently of the banking adapter.
 * Unset or empty means the default; any other unknown value is a configuration error.
 */
export function createDeviceCapabilityAdapter(mode: string | undefined): DeviceCapabilityAdapter {
  const selected = mode === undefined || mode === "" ? DEFAULT_DEVICE_ADAPTER_MODE : mode;
  if (!isMode(selected)) {
    throw new Error(`Unknown VITE_DEVICE_ADAPTER "${selected}". Expected one of: ${DEVICE_ADAPTER_MODES.join(", ")}.`);
  }
  switch (selected) {
    case "demo":
      return new DemoDeviceAdapter();
    case "null":
      return new NullDeviceAdapter();
  }
}
