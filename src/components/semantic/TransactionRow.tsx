import { formatDayMonth } from "../../localization/format";
import { useLanguage, useMessages } from "../../localization/LocalizationContext";
import { Money, Typography } from "../primitives";
import { StatusBadge } from "./StatusBadge";
import styles from "./TransactionList.module.css";

type Props = {
  /** Bank data, shown as it came: never translated. */
  title: string;
  /** ISO 8601 date-time; shown as day and month in the interface language (D-53). */
  date: string;
  /** Signed integer minor units: income positive, spending negative. */
  amount: { amount: number; currency: "RUB" };
  status: "success" | "pending" | "failure";
};

/** One operation in a list. Not pressable: there are no operation details yet. */
export function TransactionRow({ title, date, amount, status }: Props) {
  const t = useMessages();
  const language = useLanguage();
  return (
    <div className={styles.row} data-status={status}>
      <span className={styles.main}>
        <Typography.Text tag="span" view="primary-medium" className={styles.title ?? ""}>
          {title}
        </Typography.Text>
        <span className={styles.meta}>
          <Typography.Text tag="span" view="primary-small" color="secondary">
            {formatDayMonth(date, language)}
          </Typography.Text>
          {status !== "success" && <StatusBadge status={status} label={t.transactions[status]} />}
        </span>
      </span>
      <Typography.Text tag="span" view="primary-medium" weight="medium" className={styles.amount ?? ""}>
        <Money value={amount.amount} currency={amount.currency} minority={100} showPlus />
      </Typography.Text>
    </div>
  );
}
