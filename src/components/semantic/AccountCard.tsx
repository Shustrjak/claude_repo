import { useMessages } from "../../localization/LocalizationContext";
import { Money, Typography } from "../primitives";
import styles from "./AccountCard.module.css";
import { StatusBadge } from "./StatusBadge";

type Props = {
  name: string;
  maskedNumber: string;
  /** Integer minor units (kopecks) and currency, as the bank gives them. */
  balance: { amount: number; currency: "RUB" };
  status: "active" | "blocked";
};

/**
 * Short account information: name, masked number, balance and status (D-21, D-25). It only shows
 * what it is given: where accounts come from, which ones and in what order is the screen's call.
 */
export function AccountCard({ name, maskedNumber, balance, status }: Props) {
  const t = useMessages();
  return (
    <article className={styles.card} aria-label={name} data-status={status}>
      <div className={styles.head}>
        <Typography.Text tag="div" view="primary-medium" weight="medium" className={styles.name ?? ""}>
          {name}
        </Typography.Text>
        {status === "blocked" && <StatusBadge status="blocked" label={t.account.blocked} />}
      </div>
      <Typography.Text tag="div" view="primary-small" color="secondary">
        {maskedNumber}
      </Typography.Text>
      <Typography.Text tag="div" view="primary-large" weight="bold">
        <Money value={balance.amount} currency={balance.currency} minority={100} />
      </Typography.Text>
    </article>
  );
}
