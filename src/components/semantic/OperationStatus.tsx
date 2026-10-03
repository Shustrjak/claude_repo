import type { ReactNode } from "react";
import { Spinner, Typography } from "../primitives";

type Props = {
  status: "pending" | "success" | "failure";
  title: string;
  description?: string;
  /** Actions come in through this slot, e.g. ActionButton(next | retry). */
  actions?: ReactNode;
};

/** Progress and outcome of an operation. It shows what it is given and starts nothing itself. */
export function OperationStatus({ status, title, description, actions }: Props) {
  return (
    <section role={status === "failure" ? "alert" : "status"} aria-busy={status === "pending"} data-status={status}>
      {status === "pending" && <Spinner visible preset={48} />}
      <Typography.Title tag="h2" view="small">
        {title}
      </Typography.Title>
      {description && (
        <Typography.Text tag="p" view="primary-medium">
          {description}
        </Typography.Text>
      )}
      {actions}
    </section>
  );
}
