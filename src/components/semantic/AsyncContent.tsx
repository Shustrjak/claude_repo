import type { ReactNode } from "react";
import { useMessages } from "../../localization/LocalizationContext";
import { Spinner } from "../primitives";
import { ActionButton } from "./ActionButton";
import { StatusMessage } from "./StatusMessage";

type Message = { title: string; description?: string };

export type AsyncContentState =
  | { status: "loading" }
  | { status: "error"; kind: "error" | "unavailable"; message: Message }
  | { status: "empty" }
  | { status: "data" };

type Props = {
  state: AsyncContentState;
  /** Needed only when the state can be `empty`. */
  empty?: Message;
  /** Shown as ActionButton(retry) in the error message. */
  onRetry?: () => void;
  children?: ReactNode;
};

/** Picks what to show: loading, error, emptiness or the content. It loads nothing itself. */
export function AsyncContent({ state, empty, onRetry, children }: Props) {
  const t = useMessages();
  switch (state.status) {
    case "loading":
      return (
        <div role="status" aria-busy="true" aria-label={t.common.loading}>
          <Spinner visible preset={48} />
        </div>
      );
    case "error":
      return (
        <StatusMessage
          kind={state.kind}
          {...state.message}
          action={onRetry && <ActionButton action="retry" onPress={onRetry} />}
        />
      );
    case "empty":
      return empty ? <StatusMessage kind="empty" {...empty} /> : null;
    case "data":
      return children;
  }
}
