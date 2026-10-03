import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";

/**
 * HOME-01, partial shell: the authenticated destination of the login flow.
 * Accounts (Q-29), the mini statement (Q-10, Q-30), header actions and bottom navigation
 * are deliberately absent until their own increments.
 */
export function HomeScreen() {
  return <AppShell variant="main" header={<AppHeader title="Главная" />} />;
}
