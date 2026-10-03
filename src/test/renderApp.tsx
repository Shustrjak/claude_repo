import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import type { BankingAdapter } from "../adapters/banking/BankingAdapter";
import { AppSessionProvider } from "../app/AppSessionProvider";
import { BankingAdapterProvider } from "../app/BankingAdapterProvider";
import { routes } from "../app/routes";

/** Renders the real routes with an injected adapter, the way the composition root does. */
export function renderApp(adapter: BankingAdapter, { path = "/", authenticated = false } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const view = render(
    <BankingAdapterProvider adapter={adapter}>
      <AppSessionProvider initiallyAuthenticated={authenticated}>
        <RouterProvider router={router} />
      </AppSessionProvider>
    </BankingAdapterProvider>,
  );
  return { ...view, router };
}
