import { createContext, useContext } from "react";
import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";

export const DeviceCapabilityContext = createContext<DeviceCapabilityAdapter | null>(null);

/** The only way UI code reaches device capabilities. It sees the interface, never an implementation. */
export function useDeviceCapability(): DeviceCapabilityAdapter {
  const device = useContext(DeviceCapabilityContext);
  if (!device) {
    throw new Error("useDeviceCapability must be used inside <DeviceCapabilityProvider>");
  }
  return device;
}
