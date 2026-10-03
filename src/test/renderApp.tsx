import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";
import { NullDeviceAdapter } from "../adapters/device/NullDeviceAdapter";
import { AppSessionProvider } from "../app/AppSessionProvider";
import { BankingAdapterProvider } from "../app/BankingAdapterProvider";
import { BiometricLoginPreferenceProvider } from "../app/BiometricLoginPreferenceProvider";
import { DeviceCapabilityProvider } from "../app/DeviceCapabilityProvider";
import { routes } from "../app/routes";

type Options = {
  path?: string;
  authenticated?: boolean;
  device?: DeviceCapabilityAdapter;
  biometricLoginEnabled?: boolean;
};

/**
 * Renders the real routes with injected adapters and preference, the way the composition root
 * does. Defaults: no device capabilities, biometric login not enabled.
 */
export function renderApp(
  adapter: BankingAdapter,
  { path = "/", authenticated = false, device = new NullDeviceAdapter(), biometricLoginEnabled = false }: Options = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <BankingAdapterProvider adapter={adapter}>
      <DeviceCapabilityProvider device={device}>
        <BiometricLoginPreferenceProvider initiallyEnabled={biometricLoginEnabled}>
          <AppSessionProvider initiallyAuthenticated={authenticated}>
            <RouterProvider router={router} />
          </AppSessionProvider>
        </BiometricLoginPreferenceProvider>
      </DeviceCapabilityProvider>
    </BankingAdapterProvider>,
  );
  return { ...view, router };
}
