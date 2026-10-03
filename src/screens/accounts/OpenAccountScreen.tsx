import { useNavigate } from "react-router";
import { paths } from "../../app/paths";
import type { RegistrationEntryState } from "../../app/registration/RegistrationFlowLayout";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { ListRow } from "../../components/semantic/ListRow";
import { useMessages } from "../../localization/LocalizationContext";

const NEW_CUSTOMER: RegistrationEntryState = { onboardingContext: "new_customer" };

/**
 * ACC-07 Open Account: only the entry into registration for someone who is not yet a client
 * (D-08, D-18). No product is opened; the three account types are disabled navigation items (D-11).
 */
export function OpenAccountScreen() {
  const navigate = useNavigate();
  const t = useMessages();
  return (
    <AppShell variant="auth" header={<AppHeader title={t.openAccount.title} onBack={() => navigate(paths.login)} />}>
      <ListRow variant="link" title={t.openAccount.savings} disabled />
      <ListRow variant="link" title={t.openAccount.current} disabled />
      <ListRow variant="link" title={t.openAccount.loans} disabled />
      <ActionButton action="next" onPress={() => navigate(paths.register.phone, { state: NEW_CUSTOMER })} />
    </AppShell>
  );
}
