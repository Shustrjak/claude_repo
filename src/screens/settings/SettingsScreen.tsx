import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAppSession } from "../../app/AppSessionContext";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ListRow } from "../../components/semantic/ListRow";

/**
 * SET-01 Settings, reached from the bottom navigation (D-43). Logout is immediate (D-32) and
 * always closes the app session, whatever the bank answers (D-44). SET-04 waits for Q-17.
 */
export function SettingsScreen() {
  const adapter = useBankingAdapter();
  const session = useAppSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const logout = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    await adapter.logout().catch(() => undefined); // best effort on the bank side (D-44)
    session.signOut();
    navigate(paths.login, { replace: true });
  };

  return (
    <AppShell variant="main" header={<AppHeader title="Настройки" />}>
      <ListRow variant="link" title="Сменить MPIN" onPress={() => navigate(paths.changeMpin)} />
      <ListRow variant="link" title="Вход по биометрии" onPress={() => navigate(paths.biometricSettings)} />
      <ListRow variant="link" title="Язык" disabled />
      <ListRow variant="danger" title="Выйти" disabled={busy} onPress={() => void logout()} />
    </AppShell>
  );
}
