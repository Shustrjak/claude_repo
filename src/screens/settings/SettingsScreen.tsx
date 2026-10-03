import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAppSession } from "../../app/AppSessionContext";
import { useBankingAdapter } from "../../app/BankingAdapterContext";
import { paths } from "../../app/paths";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ListRow } from "../../components/semantic/ListRow";
import { StatusMessage } from "../../components/semantic/StatusMessage";

/**
 * SET-01 Settings. Logout is immediate, without confirmation (D-32): logout() → session closed
 * → AUTH-01. SET-02 and SET-04 are not implemented yet, so their rows are visible but disabled.
 * How users reach this screen is open (Q-38): the source enters it from the bottom navigation.
 */
export function SettingsScreen() {
  const adapter = useBankingAdapter();
  const session = useAppSession();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const logout = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    const result = await adapter.logout().catch(() => ({ ok: false }) as const);
    inFlight.current = false;
    setBusy(false);
    if (result.ok) {
      session.signOut();
      navigate(paths.login, { replace: true });
      return;
    }
    // Q-39: the contract does not say whether to close the local session when logout fails.
    // Until decided, the session stays open and the user sees that logout did not happen.
    setFailed(true);
  };

  return (
    <AppShell variant="main" header={<AppHeader title="Настройки" />}>
      <ListRow variant="link" title="Сменить MPIN" disabled />
      <ListRow variant="link" title="Вход по биометрии" onPress={() => navigate(paths.biometricSettings)} />
      <ListRow variant="link" title="Язык" disabled />
      <ListRow variant="danger" title="Выйти" disabled={busy} onPress={() => void logout()} />
      {failed && <StatusMessage kind="error" title="Не удалось выйти" description="Попробуйте ещё раз." />}
    </AppShell>
  );
}
