import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { SimCard } from "../../adapters/device/DeviceCapabilityAdapter";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { ChoiceList } from "../../components/semantic/ChoiceList";
import { StatusMessage } from "../../components/semantic/StatusMessage";

/** AUTH-03 Select SIM: the device offers SIM slots (D-34); the flow keeps the user's choice. */
export function SelectSimScreen() {
  const device = useDeviceCapability();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const [sims, setSims] = useState<SimCard[] | null>(null);

  useEffect(() => {
    let active = true;
    device
      .getSimCards()
      .catch(() => [])
      .then((list) => {
        if (active) setSims(list);
      });
    return () => {
      active = false;
    };
  }, [device]);

  const selected = sims?.some((sim) => sim.id === flow.selectedSimId) ? flow.selectedSimId : null;

  return (
    <AppShell variant="auth" header={<AppHeader title="Выбор SIM-карты" onBack={() => navigate(-1)} />}>
      {flow.otpFailed && (
        <StatusMessage
          kind="error"
          title="Код не подошёл"
          description="Выберите SIM-карту и пройдите шаги регистрации ещё раз."
        />
      )}
      {sims === null ? null : sims.length === 0 ? (
        // Q-36: what happens without a SIM is not decided; registration cannot continue here.
        <StatusMessage kind="empty" title="SIM-карта не найдена" description="Без SIM-карты регистрацию не продолжить." />
      ) : (
        <>
          <ChoiceList
            label="SIM-карта"
            items={sims.map((sim) => ({ id: sim.id, title: `SIM ${sim.slot}` }))}
            value={selected}
            onChange={(id) => flow.selectSim(id)}
          />
          <ActionButton action="next" disabled={selected === null} onPress={() => navigate(paths.register.bindSim)} />
        </>
      )}
    </AppShell>
  );
}
