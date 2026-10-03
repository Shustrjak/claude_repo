import { Navigate, Outlet } from "react-router";
import { useAppSession } from "./AppSessionContext";
import { paths } from "./paths";

/** Route guard: screens behind it need a logged-in session, otherwise the user lands on login. */
export function RequireSession() {
  const { isAuthenticated } = useAppSession();
  return isAuthenticated ? <Outlet /> : <Navigate to={paths.login} replace />;
}
