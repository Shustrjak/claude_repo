import { useMemo, useState, type ReactNode } from "react";
import { AppSessionContext, type AppSession } from "./AppSessionContext";

type Props = { children: ReactNode; initiallyAuthenticated?: boolean };

export function AppSessionProvider({ children, initiallyAuthenticated = false }: Props) {
  const [isAuthenticated, setAuthenticated] = useState(initiallyAuthenticated);
  const session = useMemo<AppSession>(
    () => ({ isAuthenticated, signIn: () => setAuthenticated(true), signOut: () => setAuthenticated(false) }),
    [isAuthenticated],
  );
  return <AppSessionContext.Provider value={session}>{children}</AppSessionContext.Provider>;
}
