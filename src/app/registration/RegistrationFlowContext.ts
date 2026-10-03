import { createContext, useContext } from "react";
import type { OnboardingContext } from "../../adapters/banking/types";

/**
 * What the registration steps AUTH-02…AUTH-07 hand to each other. Memory only; no personal
 * details, phone or MPIN: the banking adapter keeps registration data itself (G-1).
 */
export type RegistrationProgress = {
  onboardingContext: OnboardingContext;
  started: boolean;
  /** Chosen by the user on AUTH-03; the device boundary does not own the choice. */
  selectedSimId: string | null;
  simBound: boolean;
  detailsSubmitted: boolean;
  mpinSet: boolean;
  /** The AUTH-06 choice, kept pending until a successful OTP commits it (D-33, D-41). */
  enableBiometricLogin: boolean;
};

export type RegistrationFlow = RegistrationProgress & {
  markStarted: () => void;
  selectSim: (simId: string) => void;
  markSimBound: () => void;
  markDetailsSubmitted: () => void;
  markMpinSet: (enableBiometricLogin: boolean) => void;
  /** After a wrong OTP: the SIM must be bound again; earlier steps stay done (D-41). */
  requireSimRebind: () => void;
};

export const RegistrationFlowContext = createContext<RegistrationFlow | null>(null);

export function useRegistrationFlow(): RegistrationFlow {
  const flow = useContext(RegistrationFlowContext);
  if (!flow) {
    throw new Error("useRegistrationFlow must be used inside the registration routes");
  }
  return flow;
}
