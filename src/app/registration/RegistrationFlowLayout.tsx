import { useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import type { OnboardingContext } from "../../adapters/banking/types";
import { paths } from "../paths";
import { RegistrationFlowContext, type RegistrationFlow, type RegistrationProgress } from "./RegistrationFlowContext";

/** How an entry point (AUTH-01 or ACC-07) starts registration: navigation state, not the URL. */
export type RegistrationEntryState = { onboardingContext: OnboardingContext };

function contextFrom(state: unknown): OnboardingContext | null {
  if (typeof state === "object" && state !== null && "onboardingContext" in state) {
    const value = state.onboardingContext;
    if (value === "existing_customer" || value === "new_customer") return value;
  }
  return null;
}

/** Holds registration progress for the registration routes; entering without a context goes to login. */
export function RegistrationFlowLayout() {
  const location = useLocation();
  const [initialContext] = useState(() => contextFrom(location.state));
  if (!initialContext) {
    return <Navigate to={paths.login} replace />;
  }
  return <RegistrationFlowProvider onboardingContext={initialContext} />;
}

function RegistrationFlowProvider({ onboardingContext }: { onboardingContext: OnboardingContext }) {
  const [progress, setProgress] = useState<RegistrationProgress>({
    onboardingContext,
    started: false,
    selectedSimId: null,
    simBound: false,
    detailsSubmitted: false,
    mpinSet: false,
    enableBiometricLogin: false,
  });
  // Actions only use the functional updater, so they stay the same across renders.
  const actions = useMemo<Omit<RegistrationFlow, keyof RegistrationProgress>>(
    () => ({
      // Starting (again) on AUTH-02 resets later steps: the adapter starts a new registration too.
      markStarted: () =>
        setProgress((p) => ({
          ...p,
          started: true,
          selectedSimId: null,
          simBound: false,
          detailsSubmitted: false,
          mpinSet: false,
        })),
      selectSim: (simId) => setProgress((p) => ({ ...p, selectedSimId: simId, simBound: false })),
      markSimBound: () => setProgress((p) => ({ ...p, simBound: true })),
      markDetailsSubmitted: () => setProgress((p) => ({ ...p, detailsSubmitted: true })),
      markMpinSet: (enableBiometricLogin) => setProgress((p) => ({ ...p, mpinSet: true, enableBiometricLogin })),
      // Called by AUTH-03 once AUTH-07 is gone, so AUTH-07's own guard never sees the reset.
      requireSimRebind: () => setProgress((p) => (p.simBound ? { ...p, simBound: false } : p)),
    }),
    [],
  );
  const flow = useMemo<RegistrationFlow>(() => ({ ...progress, ...actions }), [progress, actions]);
  return (
    <RegistrationFlowContext.Provider value={flow}>
      <Outlet />
    </RegistrationFlowContext.Provider>
  );
}
