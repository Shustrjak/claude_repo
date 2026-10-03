import { NavigationBar } from "@alfalab/core-components-navigation-bar";

type Props = { title: string };

/** Screen header. Back button and right-side actions are added when a screen needs them. */
export function AppHeader({ title }: Props) {
  return (
    <header>
      <NavigationBar title={title} align="center" />
    </header>
  );
}
