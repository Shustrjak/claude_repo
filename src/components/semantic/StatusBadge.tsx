import { Status } from "@alfalab/core-components-status";

/** Neutral statuses from the component spec; the colours are the proposed look [A]. */
const COLORS = {
  success: "green",
  pending: "orange",
  failure: "red",
  blocked: "grey",
  frozen: "blue",
} as const;

type Props = {
  status: keyof typeof COLORS;
  label: string;
};

/** The status of an operation, card or account. What the status means is not its concern. */
export function StatusBadge({ status, label }: Props) {
  return (
    <span data-status={status}>
      <Status color={COLORS[status]} view="muted-alt" uppercase={false}>
        {label}
      </Status>
    </span>
  );
}
