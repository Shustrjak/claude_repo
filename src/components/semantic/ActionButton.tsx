import { Button } from "../primitives";

/** Intents from the component spec; labels and views are the proposed defaults [A]. */
const INTENTS = {
  next: { label: "Далее", view: "accent" },
  confirm: { label: "Подтвердить", view: "accent" },
  pay: { label: "Оплатить", view: "accent" },
  retry: { label: "Повторить", view: "secondary" },
  cancel: { label: "Отмена", view: "secondary" },
  close: { label: "Готово", view: "accent" },
} as const;

type Props = {
  action: keyof typeof INTENTS;
  /** Only to override the intent's standard label. */
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

/** The main action button: the intent picks label and look; no screen-specific variants. */
export function ActionButton({ action, label, disabled = false, loading = false, onPress }: Props) {
  const intent = INTENTS[action];
  return (
    <Button view={intent.view} block disabled={disabled || loading} loading={loading} onClick={onPress}>
      {label ?? intent.label}
    </Button>
  );
}
