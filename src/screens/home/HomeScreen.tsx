import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { AccountSummary, ContractError } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { accountTransactionsPath } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AccountCard } from "../../components/semantic/AccountCard";
import { AsyncContent, type AsyncContentState } from "../../components/semantic/AsyncContent";
import { useMessages } from "../../localization/LocalizationContext";
import styles from "./HomeScreen.module.css";
import { accountsFailure } from "./homeStatus";

/** The failure is kept as the contract error and put into words while rendering, in the current language. */
type Accounts =
  | { status: "loading" }
  | { status: "loaded"; accounts: AccountSummary[] }
  | { status: "failed"; error: ContractError };

/**
 * HOME-01: every account `getAccounts()` returns, as `AccountCard` × N in the adapter's order (D-47).
 * No sorting, filtering or "main" account; an empty list is a valid, empty home. A card opens its
 * own account's mini statement (D-51); Home shows no operations itself (D-52). No header actions.
 */
export function HomeScreen() {
  const adapter = useBankingAdapter();
  const t = useMessages();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Accounts>({ status: "loading" });
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => adapter.getAccounts())
      .then(
        (result): Accounts =>
          result.ok ? { status: "loaded", accounts: result.data } : { status: "failed", error: result.error },
        (): Accounts => ({ status: "failed", error: { code: "UNKNOWN" } }),
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
    accounts.status === "loading"
      ? accounts
      : accounts.status === "failed"
        ? accountsFailure(accounts.error, t)
        : accounts.accounts.length === 0
          ? { status: "empty" }
          : { status: "data" };

  return (
    <AppShell variant="main" header={<AppHeader title={t.home.title} />}>
      <AsyncContent state={state} empty={{ title: t.home.noAccounts }} onRetry={retry}>
        {accounts.status === "loaded" && (
          <ul className={styles.accounts} aria-label={t.home.accounts}>
            {accounts.accounts.map((account) => (
              <li key={account.id}>
                <AccountCard
                  name={account.name}
                  maskedNumber={account.maskedNumber}
                  balance={account.balance}
                  status={account.status}
                  // D-51: the whole card opens this account's mini statement, blocked or not.
                  onPress={() => navigate(accountTransactionsPath(account.id))}
                />
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </AppShell>
  );
}
