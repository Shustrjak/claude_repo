import { Cell, Switch } from "../primitives";
import styles from "./ListRow.module.css";

type Props =
  | { variant: "link"; title: string; subtitle?: string | undefined; disabled?: boolean; onPress?: () => void }
  | {
      variant: "toggle";
      title: string;
      subtitle?: string | undefined;
      disabled?: boolean;
      checked: boolean;
      onToggle: (checked: boolean) => void;
    };

const noop = () => undefined;

/** A list row: `link` leads on, `toggle` switches a setting. `value` and `danger` arrive with their screens. */
export function ListRow(props: Props) {
  const { title, subtitle, disabled = false } = props;
  if (props.variant === "toggle") {
    return (
      <Switch
        block
        label={title}
        hint={subtitle}
        checked={props.checked}
        disabled={disabled}
        onChange={(_event, payload) => props.onToggle(payload.checked)}
      />
    );
  }
  return (
    <Cell
      className={styles.row ?? ""}
      tag="button"
      type="button"
      disabled={disabled}
      onClick={props.onPress ?? noop}
    >
      <Cell.Content>
        <Cell.Main>
          <Cell.Text titleColor={disabled ? "disabled" : "primary"} view="component-primary" value={subtitle}>
            {title}
          </Cell.Text>
        </Cell.Main>
      </Cell.Content>
    </Cell>
  );
}
