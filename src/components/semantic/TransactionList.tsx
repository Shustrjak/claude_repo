import { useMessages } from "../../localization/LocalizationContext";
import { StatusMessage } from "./StatusMessage";
import styles from "./TransactionList.module.css";
import { TransactionRow } from "./TransactionRow";

type Item = {
  id: string;
  title: string;
  date: string;
  amount: { amount: number; currency: "RUB" };
  status: "success" | "pending" | "failure";
};

type Props = {
  /** In the order to show; the list never sorts or groups (D-53). */
  items: readonly Item[];
  /** `compact` — the mini statement; `full` waits for ACC-03 (SOURCE_REQUIRED). */
  variant: "compact";
};

/** A list of operations, or the empty state when there are none. It loads nothing itself. */
export function TransactionList({ items, variant }: Props) {
  const t = useMessages();
  if (items.length === 0) {
    return <StatusMessage kind="empty" title={t.transactions.empty} />;
  }
  return (
    <ul className={styles.list} aria-label={t.transactions.list} data-variant={variant}>
      {items.map((item) => (
        <li key={item.id}>
          <TransactionRow title={item.title} date={item.date} amount={item.amount} status={item.status} />
        </li>
      ))}
    </ul>
  );
}
