import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type Props = {
  /** `auth` before login, `main` after. The bottom navigation comes from the route layout (D-43). */
  variant: "auth" | "main";
  header: ReactNode;
  children?: ReactNode;
};

export function AppShell({ variant, header, children }: Props) {
  return (
    <div className={styles.shell} data-variant={variant}>
      {header}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
