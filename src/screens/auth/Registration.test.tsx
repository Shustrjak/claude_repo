// @vitest-environment jsdom
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DemoAdapter } from "../../adapters/banking/demo/DemoAdapter";
import { createMemoryStorage, type DemoStorage } from "../../adapters/banking/demo/storage";
import type { PersonalDetails } from "../../adapters/banking/types";
import { DemoDeviceAdapter } from "../../adapters/device/DemoDeviceAdapter";
import type { DeviceCapabilityAdapter, SimBinding, SimCard } from "../../adapters/device/DeviceCapabilityAdapter";
import { APP_PREFERENCES_KEY } from "../../app/appPreferencesStorage";
import { memoryPreferenceStorage, renderApp } from "../../test/renderApp";

type User = ReturnType<typeof userEvent.setup>;
const NOW = () => new Date("2026-10-01T12:00:00Z");
const CODE = "123456"; // DemoAdapter demo code for email and OTP

function demoBanking(storage: DemoStorage = createMemoryStorage()) {
  return new DemoAdapter({ storage, now: NOW });
}

/** Presses «Далее» once it is enabled: Alfa's Button stays disabled briefly after `loading`. */
async function next(user: User) {
  const button = await screen.findByRole("button", { name: "Далее" });
  await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false));
  await user.click(button);
}

async function typeCode(user: User, code: string) {
  await user.click(await screen.findByLabelText(/^Код 1 из/));
  await user.keyboard(code);
}

async function typeMpin(user: User, digits: string) {
  for (const digit of digits) {
    await user.click(screen.getByRole("button", { name: digit }));
  }
}

async function enterPhone(user: User, digits = "9990000077") {
  const input = await screen.findByLabelText("Номер телефона");
  await user.click(input);
  await user.paste(digits);
  await next(user);
}

async function chooseSim(user: User, title = "SIM 1") {
  await user.click(await screen.findByRole("radio", { name: title }));
  await next(user);
}

async function confirmBinding(user: User) {
  await screen.findByText("SIM-карта привязана");
  await next(user);
}

const DETAILS: [string, string][] = [
  ["Имя", "Анна"],
  ["Фамилия", "Смирнова"],
  ["Дата рождения (ДД.ММ.ГГГГ)", "12.04.1990"],
  ["Индекс", "101000"],
  ["Регион", "Москва"],
  ["Город", "Москва"],
  ["Район", "Центральный"],
  ["Улица", "Тверская"],
  ["Дом", "1"],
];

async function fillDetails(user: User, { card = false, birthDate }: { card?: boolean; birthDate?: string } = {}) {
  await screen.findByLabelText("Имя");
  for (const [label, value] of DETAILS) {
    const text = label.startsWith("Дата") && birthDate ? birthDate : value;
    await user.type(screen.getByLabelText(label), text);
  }
  await user.type(screen.getByLabelText("Почта"), "anna@example.com");
  await user.click(screen.getByRole("button", { name: "Получить код на почту" }));
  await typeCode(user, CODE);
  await screen.findByText("Почта подтверждена");
  await user.click(screen.getByLabelText("Согласен получать push-уведомления"));
  if (card) {
    await user.type(screen.getByLabelText("Номер карты"), "2200123412341234");
    await user.type(screen.getByLabelText("Срок действия (ММ/ГГ)"), "08/29");
  }
}

async function setMpinTwice(user: User, digits = "4321", { biometric = false } = {}) {
  await screen.findByRole("group", { name: "Придумайте MPIN" });
  await typeMpin(user, digits);
  await screen.findByRole("group", { name: "Повторите MPIN" });
  await typeMpin(user, digits);
  if (biometric) await user.click(screen.getByLabelText("Входить по биометрии"));
  await next(user);
}

async function expectHome(router: { state: { location: { pathname: string } } }) {
  await screen.findByText("Главная");
  expect(router.state.location.pathname).toBe("/home");
}

describe("Registration: existing customer (AUTH-01 → AUTH-02 … AUTH-07 → HOME-01)", () => {
  it("registers with card details, enables biometrics and keeps the preference across a restart", async () => {
    const user = userEvent.setup();
    const bankStorage = createMemoryStorage();
    const preferenceStorage = memoryPreferenceStorage();
    const banking = demoBanking(bankStorage);
    const calls = {
      start: vi.spyOn(banking, "startRegistration"),
      sendEmail: vi.spyOn(banking, "sendEmailCode"),
      verifyEmail: vi.spyOn(banking, "verifyEmailCode"),
      details: vi.spyOn(banking, "submitPersonalDetails"),
      mpin: vi.spyOn(banking, "setMpin"),
      requestOtp: vi.spyOn(banking, "requestOtp"),
      verifyOtp: vi.spyOn(banking, "verifyOtp"),
    };
    const device = new DemoDeviceAdapter();
    const { router, unmount } = renderApp(banking, { path: "/login", device, preferenceStorage });

    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    await enterPhone(user);
    expect(calls.start).toHaveBeenCalledExactlyOnceWith({ phone: "+79990000077", onboardingContext: "existing_customer" });
    await chooseSim(user, "SIM 2");
    await confirmBinding(user);
    await fillDetails(user, { card: true });
    expect(calls.sendEmail).toHaveBeenCalledWith({ email: "anna@example.com" });
    expect(calls.verifyEmail).toHaveBeenCalledWith({ code: CODE });
    await next(user);
    const expected: PersonalDetails = {
      firstName: "Анна",
      lastName: "Смирнова",
      birthDate: "1990-04-12",
      address: {
        postalCode: "101000",
        region: "Москва",
        city: "Москва",
        district: "Центральный",
        street: "Тверская",
        house: "1",
        apartment: "",
      },
      email: "anna@example.com",
      consents: { push: true, marketing: false },
      card: { number: "2200123412341234", expiry: "08/29" },
    };
    expect(calls.details).toHaveBeenCalledExactlyOnceWith(expected);
    await setMpinTwice(user, "4321", { biometric: true });
    expect(calls.mpin).toHaveBeenCalledExactlyOnceWith({ mpin: "4321" });
    await screen.findByText(/Код отправлен/);
    expect(calls.requestOtp).toHaveBeenCalledExactlyOnceWith({ purpose: "onboarding" });
    await typeCode(user, CODE);
    expect(calls.verifyOtp).toHaveBeenCalledExactlyOnceWith({ purpose: "onboarding", code: CODE });
    await expectHome(router);
    // Email and OTP stayed separate operations.
    expect(calls.requestOtp.mock.calls.every(([req]) => req.purpose === "onboarding")).toBe(true);

    // The preference is stored in its own record; nothing personal or secret is in it.
    expect(JSON.parse(preferenceStorage.items.get(APP_PREFERENCES_KEY) ?? "null")).toEqual({
      version: 1,
      biometricLoginEnabled: true,
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    unmount();

    // "Reload": new providers on the same storages. No session; biometrics offered; new MPIN works.
    const restarted = renderApp(demoBanking(bankStorage), { path: "/home", device, preferenceStorage });
    expect(restarted.router.state.location.pathname).toBe("/login");
    expect(await screen.findByRole("button", { name: "Войти по биометрии" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Войти по MPIN" }));
    await typeMpin(user, "4321");
    await expectHome(restarted.router);
  });
});

describe("Registration: new customer (AUTH-01 → ACC-07 → AUTH-02 … AUTH-07 → HOME-01)", () => {
  it("registers without card fields and opens no product", async () => {
    const user = userEvent.setup();
    const banking = demoBanking();
    const start = vi.spyOn(banking, "startRegistration");
    const details = vi.spyOn(banking, "submitPersonalDetails");
    const { router } = renderApp(banking, { path: "/login", device: new DemoDeviceAdapter() });

    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    expect(router.state.location.pathname).toBe("/open-account");
    for (const name of ["Сберегательный счёт", "Текущий счёт", "Кредиты"]) {
      expect(screen.getByRole("button", { name }).hasAttribute("disabled")).toBe(true);
    }
    await next(user);
    await enterPhone(user);
    expect(start).toHaveBeenCalledWith({ phone: "+79990000077", onboardingContext: "new_customer" });
    await chooseSim(user);
    await confirmBinding(user);
    await fillDetails(user);
    expect(screen.queryByLabelText("Номер карты")).toBeNull();
    expect(screen.queryByLabelText("Срок действия (ММ/ГГ)")).toBeNull();
    await next(user);
    expect(details.mock.calls[0]?.[0]).not.toHaveProperty("card");
    await setMpinTwice(user);
    await typeCode(user, CODE);
    await expectHome(router);
    expect(await banking.getAccounts()).toEqual({ ok: true, data: [] }); // D-18: no product opened
  });
});

/** A device double with two SIMs and scripted binding outcomes. */
function simDevice(outcomes: SimBinding[]) {
  const bindSim = vi.fn(async () => outcomes.shift() ?? "bound");
  const device: DeviceCapabilityAdapter = {
    isBiometricAvailable: async () => false,
    verifyBiometric: async () => "not_verified",
    getSimCards: async () => [
      { id: "sim-1", slot: 1 },
      { id: "sim-2", slot: 2 },
    ],
    bindSim,
  };
  return { device, bindSim };
}

async function reachSim(user: User, device: DeviceCapabilityAdapter) {
  const view = renderApp(demoBanking(), { path: "/login", device });
  await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
  await enterPhone(user);
  return view;
}

describe("AUTH-03 / AUTH-04: SIM", () => {
  it("does not pre-select a SIM and binds the chosen one", async () => {
    const user = userEvent.setup();
    const { device, bindSim } = simDevice(["bound"]);
    const { router } = await reachSim(user, device);
    await screen.findByRole("radio", { name: "SIM 1" });
    expect(screen.getByRole("button", { name: "Далее" }).hasAttribute("disabled")).toBe(true);
    await chooseSim(user, "SIM 2");
    await confirmBinding(user);
    expect(bindSim).toHaveBeenCalledExactlyOnceWith("sim-2");
    expect(router.state.location.pathname).toBe("/register/details");
  });

  it("stays on AUTH-04 after a failed binding; Retry binds the same SIM again", async () => {
    const user = userEvent.setup();
    const { device, bindSim } = simDevice(["not_bound", "bound"]);
    const { router } = await reachSim(user, device);
    await chooseSim(user, "SIM 2");
    expect((await screen.findByRole("alert")).textContent).toContain("Не удалось привязать SIM-карту");
    expect(router.state.location.pathname).toBe("/register/sim/bind");
    await user.click(screen.getByRole("button", { name: "Повторить" }));
    await confirmBinding(user);
    expect(bindSim.mock.calls).toEqual([["sim-2"], ["sim-2"]]);
    expect(router.state.location.pathname).toBe("/register/details");
  });

  it("«Выбрать другую SIM» returns to AUTH-03 and the new choice is bound", async () => {
    const user = userEvent.setup();
    const { device, bindSim } = simDevice(["not_bound", "bound"]);
    const { router } = await reachSim(user, device);
    await chooseSim(user, "SIM 1");
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Выбрать другую SIM" }));
    expect(router.state.location.pathname).toBe("/register/sim");
    await chooseSim(user, "SIM 2");
    await confirmBinding(user);
    expect(bindSim.mock.calls).toEqual([["sim-1"], ["sim-2"]]);
  });

  it("D-40: without a SIM stays on AUTH-03, searches again on request and then continues", async () => {
    const user = userEvent.setup();
    const lists: SimCard[][] = [[], [], [{ id: "sim-1", slot: 1 }]];
    const getSimCards = vi.fn(async () => lists.shift() ?? []);
    const device: DeviceCapabilityAdapter = { ...simDevice([]).device, getSimCards };
    const banking = demoBanking();
    const start = vi.spyOn(banking, "startRegistration");
    const { router } = renderApp(banking, { path: "/login", device });
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    await enterPhone(user);

    expect(await screen.findByText("SIM-карта не найдена")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Далее" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Повторить поиск" }));
    await waitFor(() => expect(getSimCards).toHaveBeenCalledTimes(2));
    expect(screen.getByText("SIM-карта не найдена")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/register/sim");

    const retry = screen.getByRole("button", { name: "Повторить поиск" });
    await waitFor(() => expect(retry.hasAttribute("disabled")).toBe(false));
    await user.click(retry);
    await chooseSim(user, "SIM 1");
    await confirmBinding(user);
    expect(getSimCards).toHaveBeenCalledTimes(3);
    expect(start).toHaveBeenCalledOnce(); // registration was not restarted
    expect(router.state.location.pathname).toBe("/register/details");
  });
});

async function reachDetails(user: User, context: "existing" | "new" = "new") {
  const banking = demoBanking();
  const view = renderApp(banking, { path: "/login", device: new DemoDeviceAdapter() });
  if (context === "existing") {
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
  } else {
    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    await next(user);
  }
  await enterPhone(user);
  await chooseSim(user);
  await confirmBinding(user);
  return { ...view, banking };
}

describe("AUTH-02: phone", () => {
  it("does not start registration with an incomplete number", async () => {
    const user = userEvent.setup();
    const banking = demoBanking();
    const start = vi.spyOn(banking, "startRegistration");
    renderApp(banking, { path: "/login" });
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    await enterPhone(user, "99900");
    expect(screen.getByText("Введите номер полностью: +7 и 10 цифр")).toBeTruthy();
    expect(start).not.toHaveBeenCalled();
  });
});

describe("AUTH-05: personal details", () => {
  it("requires the fields, a verified email and leaves the apartment optional", async () => {
    const user = userEvent.setup();
    const { banking } = await reachDetails(user);
    const details = vi.spyOn(banking, "submitPersonalDetails");
    await next(user);
    expect(screen.getAllByText("Заполните поле")).toHaveLength(9);
    expect(details).not.toHaveBeenCalled();
    for (const [label, value] of DETAILS) await user.type(screen.getByLabelText(label), value);
    await user.type(screen.getByLabelText("Почта"), "anna@example.com");
    await next(user);
    expect(screen.getByText("Подтвердите почту кодом из письма")).toBeTruthy();
    expect(details).not.toHaveBeenCalled();
  });

  it("shows a controlled error for a wrong email code and accepts the right one", async () => {
    const user = userEvent.setup();
    await reachDetails(user);
    await user.type(screen.getByLabelText("Почта"), "anna@example.com");
    await user.click(screen.getByRole("button", { name: "Получить код на почту" }));
    await typeCode(user, "000000");
    expect(await screen.findByText("Неверный код")).toBeTruthy();
    await typeCode(user, CODE);
    expect(await screen.findByText("Почта подтверждена")).toBeTruthy();
  });

  it("maps the adapter's age rule to the birth date field", async () => {
    const user = userEvent.setup();
    const { router } = await reachDetails(user);
    await fillDetails(user, { birthDate: "01.01.2015" });
    await next(user);
    expect(await screen.findByText("Регистрация доступна с 18 лет")).toBeTruthy();
    expect(router.state.location.pathname).toBe("/register/details");
  });

  it("shows card fields only for an existing client and has no password field", async () => {
    const user = userEvent.setup();
    await reachDetails(user, "existing");
    expect(screen.getByLabelText("Номер карты")).toBeTruthy();
    expect(screen.queryByLabelText(/Пароль/i)).toBeNull();
  });
});

describe("AUTH-06: MPIN and biometric preference", () => {
  async function reachMpin(user: User, device: DeviceCapabilityAdapter = new DemoDeviceAdapter()) {
    const view = renderApp(demoBanking(), { path: "/login", device });
    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    await next(user);
    await enterPhone(user);
    await chooseSim(user);
    await confirmBinding(user);
    await fillDetails(user);
    await next(user);
    await screen.findByRole("group", { name: "Придумайте MPIN" });
    return view;
  }

  it("asks again when the two MPINs differ", async () => {
    const user = userEvent.setup();
    await reachMpin(user);
    await typeMpin(user, "1111");
    await screen.findByRole("group", { name: "Повторите MPIN" });
    await typeMpin(user, "2222");
    expect((await screen.findByRole("alert")).textContent).toContain("MPIN не совпадают");
    expect(screen.getByRole("button", { name: "Далее" }).hasAttribute("disabled")).toBe(true);
  });

  it("cannot enable biometrics the device does not have, and leaves the preference off", async () => {
    const user = userEvent.setup();
    const { router, preferenceStorage } = await reachMpin(user, new DemoDeviceAdapter({ biometric: "unavailable" }));
    const toggle = screen.getByLabelText(/Входить по биометрии/);
    expect(toggle.hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Недоступно на этом устройстве")).toBeTruthy();
    await setMpinTwice(user);
    await typeCode(user, CODE);
    await expectHome(router);
    expect(JSON.parse(preferenceStorage.getItem(APP_PREFERENCES_KEY) ?? "null")).toEqual({
      version: 1,
      biometricLoginEnabled: false,
    });
  });
});

describe("AUTH-07: onboarding OTP", () => {
  it("D-41: a wrong code → AUTH-03 → AUTH-04 → straight back to AUTH-07; nothing else is repeated", async () => {
    const user = userEvent.setup();
    const banking = demoBanking();
    const calls = {
      start: vi.spyOn(banking, "startRegistration"),
      details: vi.spyOn(banking, "submitPersonalDetails"),
      mpin: vi.spyOn(banking, "setMpin"),
      requestOtp: vi.spyOn(banking, "requestOtp"),
      verifyOtp: vi.spyOn(banking, "verifyOtp"),
    };
    const bindSim = vi.fn(async () => "bound" as const);
    const device: DeviceCapabilityAdapter = {
      isBiometricAvailable: async () => true,
      verifyBiometric: async () => "verified",
      getSimCards: async () => [
        { id: "sim-1", slot: 1 },
        { id: "sim-2", slot: 2 },
      ],
      bindSim,
    };
    const { router, preferenceStorage } = renderApp(banking, { path: "/login", device });
    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    await next(user);
    await enterPhone(user);
    await chooseSim(user, "SIM 1");
    await confirmBinding(user);
    await fillDetails(user);
    await next(user);
    await setMpinTwice(user, "4321", { biometric: true });
    await typeCode(user, "000000");

    await screen.findByText("Код не подошёл");
    expect(router.state.location.pathname).toBe("/register/sim");
    expect(preferenceStorage.getItem(APP_PREFERENCES_KEY)).toBeNull(); // the choice is still pending
    await chooseSim(user, "SIM 2");
    await confirmBinding(user);
    expect(router.state.location.pathname).toBe("/register/otp");
    expect(bindSim.mock.calls).toEqual([["sim-1"], ["sim-2"]]);

    await screen.findByText(/Код отправлен/);
    await typeCode(user, CODE);
    await expectHome(router);
    expect(calls.start).toHaveBeenCalledOnce();
    expect(calls.details).toHaveBeenCalledOnce();
    expect(calls.mpin).toHaveBeenCalledOnce();
    expect(calls.requestOtp).toHaveBeenCalledTimes(2);
    expect(calls.verifyOtp.mock.calls).toEqual([
      [{ purpose: "onboarding", code: "000000" }],
      [{ purpose: "onboarding", code: CODE }],
    ]);
    expect(JSON.parse(preferenceStorage.getItem(APP_PREFERENCES_KEY) ?? "null")).toEqual({
      version: 1,
      biometricLoginEnabled: true,
    });
  });

  it("opens no session after a wrong code", async () => {
    const user = userEvent.setup();
    const { router } = renderApp(demoBanking(), { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(screen.getByRole("button", { name: "Открыть счёт" }));
    await next(user);
    await enterPhone(user);
    await chooseSim(user);
    await confirmBinding(user);
    await fillDetails(user);
    await next(user);
    await setMpinTwice(user);
    await typeCode(user, "000000");
    await screen.findByText("Код не подошёл");
    await act(() => router.navigate("/home"));
    expect(router.state.location.pathname).toBe("/login");
  });
});

describe("Registration step guards", () => {
  it.each(["/register/phone", "/register/sim", "/register/sim/bind", "/register/details", "/register/mpin", "/register/otp"])(
    "sends a direct visit to %s without a started flow to login",
    (path) => {
      const { router } = renderApp(demoBanking(), { path });
      expect(router.state.location.pathname).toBe("/login");
    },
  );
});

describe("Duplicate submission", () => {
  it("starts registration once even when «Далее» is pressed twice", async () => {
    const user = userEvent.setup();
    const banking = demoBanking();
    let release: () => void = () => undefined;
    const start = vi.spyOn(banking, "startRegistration").mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true, data: undefined });
        }),
    );
    renderApp(banking, { path: "/login", device: new DemoDeviceAdapter() });
    await user.click(screen.getByRole("button", { name: "Зарегистрироваться" }));
    const input = await screen.findByLabelText("Номер телефона");
    await user.click(input);
    await user.paste("9990000077");
    const button = screen.getByRole("button", { name: "Далее" });
    await user.click(button);
    await user.click(button);
    expect(start).toHaveBeenCalledOnce();
    await act(async () => release());
  });
});
