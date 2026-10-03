import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";
import { NullDeviceAdapter } from "../adapters/device/NullDeviceAdapter";
import { AppSessionProvider } from "../app/AppSessionProvider";
import { BankingAdapterProvider } from "../app/BankingAdapterProvider";
import { DeviceCapabilityProvider } from "../app/DeviceCapabilityProvider";
import { routes } from "../app/routes";

type Options = { path?: string; authenticated?: boolean; device?: DeviceCapabilityAdapter };

/** Renders the real routes with injected adapters, the way the composition root does. No device by default. */
export function renderApp(
  adapter: BankingAdapter,
  { path = "/", authenticated = false, device = new NullDeviceAdapter() }: Options = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <BankingAdapterProvider adapter={adapter}>
      <DeviceCapabilityProvider device={device}>
        <AppSessionProvider initiallyAuthenticated={authenticated}>
          <RouterProvider router={router} />
        </AppSessionProvider>
      </DeviceCapabilityProvider>
    </BankingAdapterProvider>,
  );
  return { ...view, router };
}
