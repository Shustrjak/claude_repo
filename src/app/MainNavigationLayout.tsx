import { CashMIcon } from "@alfalab/icons-glyph/CashMIcon";
import { GearMIcon } from "@alfalab/icons-glyph/GearMIcon";
import { HouseMIcon } from "@alfalab/icons-glyph/HouseMIcon";
import { LightningMIcon } from "@alfalab/icons-glyph/LightningMIcon";
import { QrCodeScannerMIcon } from "@alfalab/icons-glyph/QrCodeScannerMIcon";
import { Outlet, useLocation, useNavigate } from "react-router";
import { BottomNavigation, type BottomNavigationItem } from "../components/global/BottomNavigation";
import styles from "./MainNavigationLayout.module.css";
import { paths } from "./paths";

/** Items from the scheme (N19, flow H). Only destinations with an implemented screen have a path (D-43). */
const DESTINATIONS: readonly (BottomNavigationItem & { path: string | null })[] = [
  { id: "home", label: "Главная", icon: <HouseMIcon />, path: paths.home },
  { id: "pay", label: "Платежи", icon: <CashMIcon />, path: null }, // PAY-01: content SOURCE_REQUIRED
  { id: "scan-qr", label: "QR", icon: <QrCodeScannerMIcon />, path: null }, // PAY-03: not implemented
  { id: "settings", label: "Настройки", icon: <GearMIcon />, path: paths.settings },
  { id: "sbp", label: "Функции СБП", icon: <LightningMIcon />, path: null }, // SBP-02: candidate, SOURCE_REQUIRED
];

const ITEMS: readonly BottomNavigationItem[] = DESTINATIONS.map(({ id, label, icon, path }) => ({
  id,
  label,
  icon,
  disabled: path === null,
}));

/** Top-level screens after login: the screen plus the bottom navigation (D-43). */
export function MainNavigationLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const active = DESTINATIONS.find((item) => item.path === location.pathname)?.id ?? null;
  return (
    <div className={styles.layout}>
      <Outlet />
      <BottomNavigation
        items={ITEMS}
        active={active}
        onSelect={(id) => {
          const path = DESTINATIONS.find((item) => item.id === id)?.path;
          if (path && path !== location.pathname) navigate(path);
        }}
      />
    </div>
  );
}
