import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import type { ContractError, Transaction } from "../../adapters/banking/types";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { AsyncContent, type AsyncContentState } from "../../components/semantic/AsyncContent";
import { TransactionList } from "../../components/semantic/TransactionList";
import { useMessages } from "../../localization/LocalizationContext";
import { statementFailure } from "./statementStatus";

/** The mini statement shows at most the latest 10 operations (D-53). */
export const MINI_STATEMENT_LIMIT = 10;

type Operations =
  | { status: "loading" }
  | { status: "loaded"; transactions: Transaction[] }
  | { status: "failed"; error: ContractError };

/** The route supplies the account; a new account means a fresh screen, never stale operations. */
export function MiniStatementRoute() {
  const { accountId = "" } = useParams();
  return <MiniStatementScreen key={accountId} accountId={accountId} />;
}

/**
 * ACC-02 Mini Statement of one account (D-23, D-51…D-53): `getRecentTransactions` for exactly the
 * account in the address, limit 10, in the adapter's order. No account data is needed, so
 * `getAccounts` is not called. «Назад» → HOME-01; no bottom navigation (D-43).
 */
export function MiniStatementScreen({ accountId }: { accountId: string }) {
  const adapter = useBankingAdapter();
  const navigate = useNavigate();
  const t = useMessages();
  const [operations, setOperations] = useState<Operations>({ status: "loading" });
  const [request, setRequest] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => adapter.getRecentTransactions({ accountId, limit: MINI_STATEMENT_LIMIT }))
      .then(
        (result): Operations =>
          result.ok ? { status: "loaded", transactions: result.data } : { status: "failed", error: result.error },
        (): Operations => ({ status: "failed", error: { code: "UNKNOWN" } }),
      )
      .then((next) => {
        if (active) setOperations(next);
      });
    return () => {
      active = false;
    };
  }, [adapter, accountId, request]);

  const retry = () => {
    setOperations({ status: "loading" });
    setRequest((count) => count + 1);
  };

  const failure = operations.status === "failed" ? statementFailure(operations.error, t) : null;
  const state: AsyncContentState =
    operations.status === "loading" ? operations : failure ? failure : { status: "data" };

  return (
    <AppShell variant="main" header={<AppHeader title={t.statement.title} onBack={() => navigate(paths.home)} />}>
      <AsyncContent state={state} {...(failure?.retryable === false ? {} : { onRetry: retry })}>
        {operations.status === "loaded" && <TransactionList variant="compact" items={operations.transactions} />}
      </AsyncContent>
    </AppShell>
  );
}
