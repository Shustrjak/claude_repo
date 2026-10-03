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
    otpFailed: false,
  });
  const flow = useMemo<RegistrationFlow>(
    () => ({
      ...progress,
      // Starting (again) on AUTH-02 resets later steps: the adapter starts a new registration too.
      markStarted: () =>
        setProgress((p) => ({
          ...p,
          started: true,
          selectedSimId: null,
          simBound: false,
          detailsSubmitted: false,
          mpinSet: false,
          otpFailed: false,
        })),
      selectSim: (simId) => setProgress((p) => ({ ...p, selectedSimId: simId, simBound: false })),
      markSimBound: () => setProgress((p) => ({ ...p, simBound: true, otpFailed: false })),
      markDetailsSubmitted: () => setProgress((p) => ({ ...p, detailsSubmitted: true })),
      markMpinSet: (enableBiometricLogin) => setProgress((p) => ({ ...p, mpinSet: true, enableBiometricLogin })),
      // Only a mark: rebinding happens because AUTH-03 leads to AUTH-04 again. Resetting `simBound`
      // here would let the still-mounted AUTH-07 guard bounce to login before the route changes.
      reportOtpFailure: () => setProgress((p) => ({ ...p, otpFailed: true })),
    }),
    [progress],
  );
  return (
    <RegistrationFlowContext.Provider value={flow}>
      <Outlet />
    </RegistrationFlowContext.Provider>
  );
}
