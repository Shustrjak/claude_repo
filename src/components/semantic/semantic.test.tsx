// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuthMethodSelector } from "./AuthMethodSelector";
import { MPINInput } from "./MPINInput";

describe("MPINInput", () => {
  it("reports exactly four digits once and ignores a fifth", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<MPINInput mode="create" onComplete={onComplete} />);
    const group = screen.getByRole("group", { name: "Придумайте MPIN" });
    group.focus();
    await user.keyboard("12345");
    expect(onComplete).toHaveBeenCalledExactlyOnceWith("1234");
  });

  it("ignores input while disabled and exposes the error accessibly", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<MPINInput mode="enter" disabled error="Неверный MPIN" onComplete={onComplete} />);
    const group = screen.getByRole("group", { name: "Введите MPIN" });
    group.focus();
    await user.keyboard("1234");
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Неверный MPIN");
    expect(group.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });
});

describe("AuthMethodSelector", () => {
  const noop = () => undefined;

  it("shows only the MPIN input without biometrics", () => {
    render(
      <AuthMethodSelector methods={["biometric", "mpin"]} current="mpin" biometricAvailable={false} onSelect={noop} onBiometricRequest={noop}>
        <span>mpin-slot</span>
      </AuthMethodSelector>,
    );
    expect(screen.getByText("mpin-slot")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Войти по биометрии" })).toBeNull();
  });

  it("asks for biometrics by event and switches methods, without checking anything itself", async () => {
    const user = userEvent.setup();
    const onBiometricRequest = vi.fn();
    const onSelect = vi.fn();
    render(
      <AuthMethodSelector methods={["biometric", "mpin"]} current="biometric" biometricAvailable onSelect={onSelect} onBiometricRequest={onBiometricRequest}>
        <span>mpin-slot</span>
      </AuthMethodSelector>,
    );
    expect(screen.queryByText("mpin-slot")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Войти по биометрии" }));
    expect(onBiometricRequest).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Войти по MPIN" }));
    expect(onSelect).toHaveBeenCalledWith("mpin");
  });
});
