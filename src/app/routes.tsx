import type { ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router";
import { MiniStatementRoute } from "../screens/accounts/MiniStatementScreen";
import { OpenAccountScreen } from "../screens/accounts/OpenAccountScreen";
import { BindSimScreen } from "../screens/auth/BindSimScreen";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { OnboardingOtpScreen } from "../screens/auth/OnboardingOtpScreen";
import { PersonalDetailsScreen } from "../screens/auth/PersonalDetailsScreen";
import { RegisterPhoneScreen } from "../screens/auth/RegisterPhoneScreen";
import { SelectSimScreen } from "../screens/auth/SelectSimScreen";
import { SetMpinScreen } from "../screens/auth/SetMpinScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { BiometricSettingsScreen } from "../screens/settings/BiometricSettingsScreen";
import { ChangeMpinScreen } from "../screens/settings/ChangeMpinScreen";
import { LanguageSettingsScreen } from "../screens/settings/LanguageSettingsScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import { paths } from "./paths";
import { RegistrationFlowLayout } from "./registration/RegistrationFlowLayout";
import { RequireRegistrationStep } from "./registration/RequireRegistrationStep";
import { MainNavigationLayout } from "./MainNavigationLayout";
import { RequireSession } from "./RequireSession";

const step = (name: Parameters<typeof RequireRegistrationStep>[0]["step"], path: string, element: ReactNode): RouteObject => ({
  element: <RequireRegistrationStep step={name} />,
  children: [{ path, element }],
});

// Routes of the implemented flows only: login, open account, registration, settings and the Home shell.
export const routes: RouteObject[] = [
  { path: paths.login, element: <LoginScreen /> },
  { path: paths.openAccount, element: <OpenAccountScreen /> },
  {
    element: <RegistrationFlowLayout />,
    children: [
      { path: paths.register.phone, element: <RegisterPhoneScreen /> },
      step("sim", paths.register.sim, <SelectSimScreen />),
      step("bind", paths.register.bindSim, <BindSimScreen />),
      step("details", paths.register.details, <PersonalDetailsScreen />),
      step("mpin", paths.register.mpin, <SetMpinScreen />),
      step("otp", paths.register.otp, <OnboardingOtpScreen />),
    ],
  },
  {
    element: <RequireSession />,
    children: [
      // Top-level destinations get the bottom navigation; nested screens use "back" (D-43).
      {
        element: <MainNavigationLayout />,
        children: [
          { path: paths.home, element: <HomeScreen /> },
          { path: paths.settings, element: <SettingsScreen /> },
        ],
      },
      { path: paths.changeMpin, element: <ChangeMpinScreen /> },
      { path: paths.biometricSettings, element: <BiometricSettingsScreen /> },
      { path: paths.languageSettings, element: <LanguageSettingsScreen /> },
      { path: paths.accountTransactions, element: <MiniStatementRoute /> },
    ],
  },
  { path: "*", element: <Navigate to={paths.login} replace /> },
];
