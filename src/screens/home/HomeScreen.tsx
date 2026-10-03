import { useEffect, useState } from "react";
import type { AccountSummary } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AccountCard } from "../../components/semantic/AccountCard";
import { AsyncContent, type AsyncContentState } from "../../components/semantic/AsyncContent";
import styles from "./HomeScreen.module.css";
import { accountsFailure } from "./homeStatus";

type Accounts = { status: "loading" } | { status: "loaded"; accounts: AccountSummary[] } | Extract<AsyncContentState, { status: "error" }>;

/**
 * HOME-01: every account `getAccounts()` returns, as `AccountCard` × N in the adapter's order (D-47).
 * No sorting, filtering or "main" account; an empty list is a valid, empty home. Cards only show
 * data: how ACC-02 opens is Q-30. The mini statement (Q-10, Q-30) and header actions are absent.
 */
export function HomeScreen() {
  const adapter = useBankingAdapter();
  const [accounts, setAccounts] = useState<Accounts>({ status: "loading" });
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => adapter.getAccounts())
      .then(
        (result): Accounts => (result.ok ? { status: "loaded", accounts: result.data } : accountsFailure(result.error)),
        (): Accounts => accountsFailure({ code: "UNKNOWN" }),
      )
      .then((next) => {
        if (active) setAccounts(next);
      });
    return () => {
      active = false;
    };
  }, [adapter, request]);

  const retry = () => {
    setAccounts({ status: "loading" });
    setRequest((count) => count + 1);
  };

  const state: AsyncContentState =
    accounts.status !== "loaded" ? accounts : accounts.accounts.length === 0 ? { status: "empty" } : { status: "data" };

  return (
    <AppShell variant="main" header={<AppHeader title="Главная" />}>
      <AsyncContent state={state} empty={{ title: "Счетов пока нет" }} onRetry={retry}>
        {accounts.status === "loaded" && (
          <ul className={styles.accounts} aria-label="Счета">
            {accounts.accounts.map((account) => (
              <li key={account.id}>
                <AccountCard
                  name={account.name}
                  maskedNumber={account.maskedNumber}
                  balance={account.balance}
                  status={account.status}
                />
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </AppShell>
  );
}
