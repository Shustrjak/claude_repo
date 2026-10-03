import { createContext, useContext } from "react";

export type AppSession = {
  isAuthenticated: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const AppSessionContext = createContext<AppSession | null>(null);

/** Whether this page has a logged-in session. Lives in memory only: a reload starts at login. */
export function useAppSession(): AppSession {
  const session = useContext(AppSessionContext);
  if (!session) {
    throw new Error("useAppSession must be used inside <AppSessionProvider>");
  }
  return session;
}
