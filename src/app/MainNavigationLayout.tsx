import { CashMIcon } from "@alfalab/icons-glyph/CashMIcon";
import { GearMIcon } from "@alfalab/icons-glyph/GearMIcon";
import { HouseMIcon } from "@alfalab/icons-glyph/HouseMIcon";
import { LightningMIcon } from "@alfalab/icons-glyph/LightningMIcon";
import { QrCodeScannerMIcon } from "@alfalab/icons-glyph/QrCodeScannerMIcon";
import type { ReactNode } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { BottomNavigation } from "../components/global/BottomNavigation";
import { useMessages } from "../localization/LocalizationContext";
import type { Messages } from "../localization/messages";
import styles from "./MainNavigationLayout.module.css";
import { paths } from "./paths";

type Destination = {
  id: string;
  label: Exclude<keyof Messages["navigation"], "label">;
  icon: ReactNode;
  path: string | null;
};

/** Items from the scheme (N19, flow H). Only destinations with an implemented screen have a path (D-43). */
const DESTINATIONS: readonly Destination[] = [
  { id: "home", label: "home", icon: <HouseMIcon />, path: paths.home },
  { id: "pay", label: "pay", icon: <CashMIcon />, path: null }, // PAY-01: content SOURCE_REQUIRED
  { id: "scan-qr", label: "scanQr", icon: <QrCodeScannerMIcon />, path: null }, // PAY-03: not implemented
  { id: "settings", label: "settings", icon: <GearMIcon />, path: paths.settings },
  { id: "sbp", label: "sbp", icon: <LightningMIcon />, path: null }, // SBP-02: candidate, SOURCE_REQUIRED
];

/** Top-level screens after login: the screen plus the bottom navigation (D-43). */
export function MainNavigationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useMessages();
  const items = DESTINATIONS.map(({ id, label, icon, path }) => ({
    id,
    label: t.navigation[label],
    icon,
    disabled: path === null,
  }));
  const active = DESTINATIONS.find((item) => item.path === location.pathname)?.id ?? null;
  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomNavigation
        items={items}
        active={active}
        onSelect={(id) => {
          const path = DESTINATIONS.find((item) => item.id === id)?.path;
          if (path && path !== location.pathname) navigate(path);
        }}
      />
    </div>
  );
}
