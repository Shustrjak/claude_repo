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
  /** Makes the whole card one button; what it opens is the screen's business. */
  onPress?: () => void;
};

/**
 * Short account information: name, masked number, balance and status (D-21, D-25). It only shows
 * what it is given: where accounts come from, which ones and in what order is the screen's call.
 * With `onPress` the whole card is a native button (Enter and Space work), whatever the status.
 */
export function AccountCard({ name, maskedNumber, balance, status, onPress }: Props) {
  const t = useMessages();
  const content = (
    <>
      <span className={styles.head}>
        <Typography.Text tag="span" view="primary-medium" weight="medium" className={styles.name ?? ""}>
          {name}
        </Typography.Text>
        {status === "blocked" && <StatusBadge status="blocked" label={t.account.blocked} />}
      </span>
      <Typography.Text tag="span" view="primary-small" color="secondary" className={styles.line ?? ""}>
        {maskedNumber}
      </Typography.Text>
      <Typography.Text tag="span" view="primary-large" weight="bold" className={styles.line ?? ""}>
        <Money value={balance.amount} currency={balance.currency} minority={100} />
      </Typography.Text>
    </>
  );
  return (
    <article aria-label={name} data-status={status}>
      {onPress ? (
        <button type="button" className={`${styles.card} ${styles.button}`} onClick={onPress}>
          {content}
        </button>
      ) : (
        <div className={styles.card}>{content}</div>
      )}
    </article>
  );
}
