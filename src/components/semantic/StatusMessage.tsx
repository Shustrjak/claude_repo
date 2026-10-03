import { SystemMessage } from "@alfalab/core-components-system-message";
import type { ReactNode } from "react";

type Props = {
  kind: "empty" | "error" | "unavailable";
  title: string;
  description?: string;
  /** Optional action slot, e.g. ActionButton(retry). */
  action?: ReactNode;
};

/** A message shown instead of content. `unavailable` covers "no banking core is connected". */
export function StatusMessage({ kind, title, description, action }: Props) {
  return (
    <div role={kind === "empty" ? "status" : "alert"} data-kind={kind}>
      <SystemMessage>
        <SystemMessage.Title>{title}</SystemMessage.Title>
        {description && <SystemMessage.Subtitle>{description}</SystemMessage.Subtitle>}
        {action && <SystemMessage.Controls>{action}</SystemMessage.Controls>}
      </SystemMessage>
    </div>
  );
}
