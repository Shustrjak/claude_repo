import { createBrowserRouter } from "react-router";
import { App } from "./App";

// One route until the first UI flow designs real routes; screen routes are not created up front.
export const router = createBrowserRouter([{ path: "/", element: <App /> }]);
