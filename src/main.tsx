import { StrictMode } from "react";
import "@alfalab/core-components-vars/index.css";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AppSessionProvider } from "./app/AppSessionProvider";
import { BankingAdapterProvider } from "./app/BankingAdapterProvider";
import { createBankingAdapter } from "./app/createBankingAdapter";
import { createDeviceCapabilityAdapter } from "./app/createDeviceCapabilityAdapter";
import { DeviceCapabilityProvider } from "./app/DeviceCapabilityProvider";
import { router } from "./app/router";

// Composition root: the only place that chooses implementations. The two boundaries are independent.
const adapter = createBankingAdapter(import.meta.env.VITE_BANKING_ADAPTER);
const device = createDeviceCapabilityAdapter(import.meta.env.VITE_DEVICE_ADAPTER);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <BankingAdapterProvider adapter={adapter}>
      <DeviceCapabilityProvider device={device}>
        <AppSessionProvider>
          <RouterProvider router={router} />
        </AppSessionProvider>
      </DeviceCapabilityProvider>
    </BankingAdapterProvider>
  </StrictMode>,
);
