import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { BankingAdapterProvider } from "./app/BankingAdapterProvider";
import { createBankingAdapter } from "./app/createBankingAdapter";
import { router } from "./app/router";

// Composition root: the only place that chooses a BankingAdapter implementation.
const adapter = createBankingAdapter(import.meta.env.VITE_BANKING_ADAPTER);

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <BankingAdapterProvider adapter={adapter}>
      <RouterProvider router={router} />
    </BankingAdapterProvider>
  </StrictMode>,
);
