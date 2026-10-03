import { render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import type { DeviceCapabilityAdapter } from "../adapters/device/DeviceCapabilityAdapter";
import { NullDeviceAdapter } from "../adapters/device/NullDeviceAdapter";
import { saveAppPreferences, type PreferenceStorage } from "../app/appPreferencesStorage";
import { AppSessionProvider } from "../app/AppSessionProvider";
import { BankingAdapterProvider } from "../app/BankingAdapterProvider";
import { BiometricLoginPreferenceProvider } from "../app/BiometricLoginPreferenceProvider";
import { DeviceCapabilityProvider } from "../app/DeviceCapabilityProvider";
import { routes } from "../app/routes";

export function memoryPreferenceStorage(): PreferenceStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return { items, getItem: (key) => items.get(key) ?? null, setItem: (key, value) => void items.set(key, value) };
}

type Options = {
  path?: string;
  authenticated?: boolean;
  device?: DeviceCapabilityAdapter;
  /** Seeds the preference storage; ignored when `preferenceStorage` is given. */
  biometricLoginEnabled?: boolean;
  preferenceStorage?: PreferenceStorage;
};

/**
 * Renders the real routes with injected adapters and preference storage, the way the composition
 * root does. Defaults: no device capabilities, biometric login not enabled, in-memory preferences.
 */
export function renderApp(
  adapter: BankingAdapter,
  { path = "/", authenticated = false, device = new NullDeviceAdapter(), biometricLoginEnabled = false, preferenceStorage }: Options = {},
) {
  const storage = preferenceStorage ?? memoryPreferenceStorage();
  if (!preferenceStorage && biometricLoginEnabled) {
    saveAppPreferences(storage, { biometricLoginEnabled: true });
  }
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <BankingAdapterProvider adapter={adapter}>
      <DeviceCapabilityProvider device={device}>
        <BiometricLoginPreferenceProvider storage={storage}>
          <AppSessionProvider initiallyAuthenticated={authenticated}>
            <RouterProvider router={router} />
          </AppSessionProvider>
        </BiometricLoginPreferenceProvider>
      </DeviceCapabilityProvider>
    </BankingAdapterProvider>,
  );
  return { ...view, router, preferenceStorage: storage };
}

/** The current screen's title, from its header: titles can repeat elsewhere (e.g. bottom navigation). */
export function findScreenTitle(title: string): Promise<HTMLElement> {
  // Re-query the header each time: the previous screen's header disappears on navigation.
  return waitFor(() => within(screen.getByRole("banner")).getByText(title));
}
