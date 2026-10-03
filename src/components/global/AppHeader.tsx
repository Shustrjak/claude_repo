import { NavigationBar } from "@alfalab/core-components-navigation-bar";
import { ArrowLeftMIcon } from "@alfalab/icons-glyph/ArrowLeftMIcon";
import { useMessages } from "../../localization/LocalizationContext";
import { IconButton } from "../primitives";

type Props = {
  title: string;
  /** Shows the back button; where "back" leads is the router's business, not the header's. */
  onBack?: () => void;
};

export function AppHeader({ title, onBack }: Props) {
  const t = useMessages();
  return (
    <header>
      <NavigationBar
        title={title}
        align="center"
        leftAddons={onBack ? <IconButton icon={ArrowLeftMIcon} size={24} aria-label={t.common.back} onClick={onBack} /> : undefined}
      />
    </header>
  );
}
