import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useDeviceCapability } from "../../app/DeviceCapabilityContext";
import { paths } from "../../app/paths";
import { useRegistrationFlow } from "../../app/registration/RegistrationFlowContext";
import { AppHeader } from "../../components/global/AppHeader";
import { AppShell } from "../../components/global/AppShell";
import { ActionButton } from "../../components/semantic/ActionButton";
import { ListRow } from "../../components/semantic/ListRow";
import { OperationStatus } from "../../components/semantic/OperationStatus";

type BindState = "pending" | "bound" | "failed";

/**
 * AUTH-04 Bind SIM, a separate screen (D-38): binds the SIM chosen on AUTH-03 through the device
 * boundary (D-34). On failure it stays here with Retry and "Choose another SIM" (D-37).
 */
export function BindSimScreen() {
  const device = useDeviceCapability();
  const flow = useRegistrationFlow();
  const navigate = useNavigate();
  const [state, setState] = useState<BindState>("pending");
  const inFlight = useRef(false);
  const { selectedSimId, markSimBound } = flow;

  const bind = useCallback(async () => {
    if (inFlight.current || selectedSimId === null) return;
    inFlight.current = true;
    setState("pending");
    const outcome = await device.bindSim(selectedSimId).catch(() => "not_bound" as const);
    inFlight.current = false;
    if (outcome === "bound") {
      markSimBound();
      setState("bound");
    } else {
      setState("failed");
    }
  }, [device, selectedSimId, markSimBound]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // once per visit, also under StrictMode
    started.current = true;
    void bind();
  }, [bind]);

  return (
    <AppShell variant="auth" header={<AppHeader title="Привязка SIM-карты" />}>
      {state === "pending" && <OperationStatus status="pending" title="Привязываем SIM-карту" />}
      {state === "bound" && (
        <OperationStatus
          status="success"
          title="SIM-карта привязана"
          actions={<ActionButton action="next" onPress={() => navigate(paths.register.details, { replace: true })} />}
        />
      )}
      {state === "failed" && (
        <OperationStatus
          status="failure"
          title="Не удалось привязать SIM-карту"
          description="Попробуйте ещё раз или выберите другую SIM-карту."
          actions={
            <>
              <ActionButton action="retry" onPress={() => void bind()} />
              <ListRow
                variant="link"
                title="Выбрать другую SIM"
                onPress={() => navigate(paths.register.sim, { replace: true })}
              />
            </>
          }
        />
      )}
    </AppShell>
  );
}
