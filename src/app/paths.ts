/** Application URLs. Screen IDs stay in the docs; URLs are plain paths. */
export const paths = {
  login: "/login",
  home: "/home",
  openAccount: "/open-account",
  register: {
    phone: "/register/phone",
    sim: "/register/sim",
    bindSim: "/register/sim/bind",
    details: "/register/details",
    mpin: "/register/mpin",
    otp: "/register/otp",
  },
} as const;
