import { Navigate, type RouteObject } from "react-router";
import { HomeScreen } from "../screens/home/HomeScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { paths } from "./paths";
import { RequireSession } from "./RequireSession";

// Only the routes of the login slice. Other screens get routes when they are implemented.
export const routes: RouteObject[] = [
  { path: paths.login, element: <LoginScreen /> },
  { element: <RequireSession />, children: [{ path: paths.home, element: <HomeScreen /> }] },
  { path: "*", element: <Navigate to={paths.login} replace /> },
];
