import { TabBar } from "@alfalab/core-components-tab-bar";
import type { ReactNode } from "react";
import { useMessages } from "../../localization/LocalizationContext";
import styles from "./BottomNavigation.module.css";

export type BottomNavigationItem = {
  id: string;
  label: string;
  icon: ReactNode;
  /** Shown but not selectable, e.g. a destination whose screen does not exist yet. */
  disabled?: boolean;
};

type Props = {
  items: readonly BottomNavigationItem[];
  /** The current item; the application layer derives it from the route. */
  active: string | null;
  onSelect: (id: string) => void;
};

const tabId = (id: string) => `nav-${id}`;

/** Bottom navigation (node N19). It renders items and reports a choice; it knows no routes or data. */
export function BottomNavigation({ items, active, onSelect }: Props) {
  const t = useMessages();
  return (
    <nav aria-label={t.navigation.label} className={styles.bar}>
      <TabBar selectedId={active === null ? "" : tabId(active)} border>
        {items.map((item) => (
          <TabBar.Tab
            key={item.id}
            id={tabId(item.id)}
            label={item.label}
            icon={item.icon}
            labelClassName={styles.label ?? ""}
            disabled={item.disabled === true}
            aria-current={item.id === active ? "page" : undefined}
            onClick={() => {
              if (!item.disabled) onSelect(item.id);
            }}
          />
        ))}
      </TabBar>
    </nav>
  );
}
