import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import type { SimCard } from "../../adapters/device/DeviceCapabilityAdapter";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { ChoiceList } from "../../components/semantic/ChoiceList";
import { StatusMessage } from "../../components/semantic/StatusMessage";

/** Navigation state when AUTH-07 sends the user back here after a wrong OTP. */
export type SelectSimState = { otpFailed: true };

function cameFromOtpFailure(state: unknown): boolean {
  return typeof state === "object" && state !== null && "otpFailed" in state && state.otpFailed === true;
}

/**
 * AUTH-03 Select SIM: the device offers SIM slots (D-34); the flow keeps the user's choice.
 * Without a SIM it stays here and offers to search again (D-40).
 */
export function SelectSimScreen() {
  const device = useDeviceCapability();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const location = useLocation();
  const otpFailed = cameFromOtpFailure(location.state);
  const [sims, setSims] = useState<SimCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const { requireSimRebind } = flow;

  const search = useCallback(async () => {
    const list = await device.getSimCards().catch(() => []);
    setSims(list);
  }, [device]);

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

  useEffect(() => {
    if (otpFailed) requireSimRebind(); // D-41: the SIM is bound again before AUTH-07
  }, [otpFailed, requireSimRebind]);

  const searchAgain = async () => {
    if (searching) return;
    setSearching(true);
    await search();
    setSearching(false);
  };

  const selected = sims?.some((sim) => sim.id === flow.selectedSimId) ? flow.selectedSimId : null;

  return (
    <AppShell variant="auth" header={<AppHeader title="Выбор SIM-карты" onBack={() => navigate(-1)} />}>
      {otpFailed && (
        <StatusMessage kind="error" title="Код не подошёл" description="Выберите SIM-карту ещё раз, затем введите новый код." />
      )}
      {sims === null ? null : sims.length === 0 ? (
        <StatusMessage
          kind="empty"
          title="SIM-карта не найдена"
          description="Сейчас на устройстве нет доступной SIM-карты."
          action={<ActionButton action="retry" label="Повторить поиск" loading={searching} onPress={() => void searchAgain()} />}
        />
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
