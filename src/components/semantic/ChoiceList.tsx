import { Radio, Typography } from "../primitives";

export type ChoiceItem = { id: string; title: string; description?: string };

type Props = {
  /** Accessible name of the group. */
  label: string;
  items: readonly ChoiceItem[];
  value: string | null;
  disabled?: boolean;
  onChange: (id: string) => void;
};

/** Pick one option from a short list. It does not know what the options are (SIM, language…). */
export function ChoiceList({ label, items, value, disabled = false, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label={label}>
      {items.map((item) => (
        <Radio
          key={item.id}
          name={label}
          value={item.id}
          checked={item.id === value}
          disabled={disabled}
          block
          label={item.title}
          hint={item.description ? <Typography.Text view="primary-small">{item.description}</Typography.Text> : undefined}
          onChange={() => onChange(item.id)}
        />
      ))}
    </div>
  );
}
