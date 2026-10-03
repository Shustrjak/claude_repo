import { Cell } from "../primitives";
import styles from "./ListRow.module.css";

type Props = {
  /** Only the `link` variant exists so far; `toggle`, `value` and `danger` arrive with their screens. */
  variant: "link";
  title: string;
  disabled?: boolean;
  onPress?: () => void;
};

const noop = () => undefined;

/** A list row. A disabled row stays visible but cannot be activated (D-11 convention). */
export function ListRow({ title, disabled = false, onPress }: Props) {
  return (
    <Cell className={styles.row ?? ""} tag="button" type="button" disabled={disabled} onClick={onPress ?? noop}>
      <Cell.Content>
        <Cell.Main>
          <Cell.Text titleColor={disabled ? "disabled" : "primary"} view="component-primary">
            {title}
          </Cell.Text>
        </Cell.Main>
      </Cell.Content>
    </Cell>
  );
}
