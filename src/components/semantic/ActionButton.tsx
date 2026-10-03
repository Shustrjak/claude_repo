import { useMessages } from "../../localization/LocalizationContext";
import { Button } from "../primitives";

/** Intents from the component spec; views are the proposed defaults [A], labels come from the dictionary. */
const VIEWS = {
  next: "accent",
  confirm: "accent",
  pay: "accent",
  retry: "secondary",
  cancel: "secondary",
  close: "accent",
} as const;

type Props = {
  action: keyof typeof VIEWS;
  /** Only to override the intent's standard label. */
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

/** The main action button: the intent picks label and look; no screen-specific variants. */
export function ActionButton({ action, label, disabled = false, loading = false, onPress }: Props) {
  const actions = useMessages().common.actions;
  return (
    <Button view={VIEWS[action]} block disabled={disabled || loading} loading={loading} onClick={onPress}>
      {label ?? actions[action]}
    </Button>
  );
}
