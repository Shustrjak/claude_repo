import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type Props = {
  /** `auth` has no bottom navigation; `main` will get BottomNavigation with its first routes. */
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
