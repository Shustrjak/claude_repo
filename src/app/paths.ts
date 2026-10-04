/** Application URLs. Screen IDs stay in the docs; URLs are plain paths. */
export const paths = {
  login: "/login",
  home: "/home",
  openAccount: "/open-account",
  /** ACC-02 of one account; the account is `AccountSummary.id` (D-51). */
  accountTransactions: "/accounts/:accountId/transactions",
  settings: "/settings",
  changeMpin: "/settings/mpin",
  biometricSettings: "/settings/biometric",
  languageSettings: "/settings/language",
  register: {
    phone: "/register/phone",
    sim: "/register/sim",
    bindSim: "/register/sim/bind",
    details: "/register/details",
    mpin: "/register/mpin",
    otp: "/register/otp",
  },
} as const;

/** The address of one account's mini statement: the id goes in as it is, only URL-encoded. */
export function accountTransactionsPath(accountId: string): string {
  return paths.accountTransactions.replace(":accountId", encodeURIComponent(accountId));
}
