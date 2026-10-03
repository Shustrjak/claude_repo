import { Navigate, Outlet } from "react-router";
import { paths } from "../paths";
import { useRegistrationFlow, type RegistrationProgress } from "./RegistrationFlowContext";

/** What each step needs from the earlier ones. */
const PREREQUISITES = {
  sim: (p: RegistrationProgress) => p.started,
  bind: (p: RegistrationProgress) => p.started && p.selectedSimId !== null,
  details: (p: RegistrationProgress) => p.simBound,
  mpin: (p: RegistrationProgress) => p.simBound && p.detailsSubmitted,
  otp: (p: RegistrationProgress) => p.simBound && p.detailsSubmitted && p.mpinSet,
} as const;

/** Step guard: jumping into the middle of registration lands on login, the safe entry point. */
export function RequireRegistrationStep({ step }: { step: keyof typeof PREREQUISITES }) {
  const flow = useRegistrationFlow();
  return PREREQUISITES[step](flow) ? <Outlet /> : <Navigate to={paths.login} replace />;
}
