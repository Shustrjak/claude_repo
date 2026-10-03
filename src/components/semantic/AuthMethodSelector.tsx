import { BiometricsFaceMIcon } from "@alfalab/icons-glyph/BiometricsFaceMIcon";
import type { ReactNode } from "react";
import { Cell, IconButton, Typography } from "../primitives";
import styles from "./AuthMethodSelector.module.css";

export type AuthMethod = "biometric" | "mpin";

type Props = {
  methods: readonly AuthMethod[];
  current: AuthMethod;
  /** Reported by the device boundary (D-14); the component never checks the hardware. */
  biometricAvailable: boolean;
  disabled?: boolean;
  onSelect: (method: AuthMethod) => void;
  onBiometricRequest: () => void;
  /** The MPIN input, shown while MPIN is the current method. */
  children: ReactNode;
};

/** Biometrics OR MPIN, never both in a row (D-13). Without biometrics only MPIN remains. */
export function AuthMethodSelector({
  methods,
  current,
  biometricAvailable,
  disabled = false,
  onSelect,
  onBiometricRequest,
  children,
}: Props) {
  const biometric = biometricAvailable && methods.includes("biometric");
  if (!biometric || !methods.includes("mpin")) {
    return biometric ? <BiometricAction disabled={disabled} onPress={onBiometricRequest} /> : <>{children}</>;
  }
  if (current === "biometric") {
    return (
      <div>
        <BiometricAction disabled={disabled} onPress={onBiometricRequest} />
        <SwitchMethod label="Войти по MPIN" disabled={disabled} onPress={() => onSelect("mpin")} />
      </div>
    );
  }
  return (
    <div>
      {children}
      <SwitchMethod label="Войти по биометрии" disabled={disabled} onPress={() => onSelect("biometric")} />
    </div>
  );
}

function BiometricAction({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <IconButton icon={BiometricsFaceMIcon} size={56} aria-label="Войти по биометрии" disabled={disabled} onClick={onPress} />
  );
}

function SwitchMethod({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Cell className={styles.row ?? ""} tag="button" type="button" disabled={disabled} onClick={onPress}>
      <Cell.Content>
        <Cell.Main>
          <Typography.Text view="primary-medium" color="accent">
            {label}
          </Typography.Text>
        </Cell.Main>
      </Cell.Content>
    </Cell>
  );
}
