import type { ReactNode } from "react";
import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";
import { DeviceCapabilityContext } from "./DeviceCapabilityContext";

type Props = { device: DeviceCapabilityAdapter; children: ReactNode };

export function DeviceCapabilityProvider({ device, children }: Props) {
  return <DeviceCapabilityContext.Provider value={device}>{children}</DeviceCapabilityContext.Provider>;
}
