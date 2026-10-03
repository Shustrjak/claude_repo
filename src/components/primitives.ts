// Layer A: Alfa core-components primitives (R30) under the names the component inventory uses.
// Semantic and global components, and screen compositions, import primitives from here;
// nothing imports Alfa packages directly except these re-exports and the components that
// the inventory lets use an Alfa package directly (StatusMessage, StatusBadge, AppHeader).
export { Button } from "@alfalab/core-components-button";
export { Checkbox } from "@alfalab/core-components-checkbox";
export { CodeInput } from "@alfalab/core-components-code-input";
export { Gap } from "@alfalab/core-components-gap";
export { Amount as Money } from "@alfalab/core-components-amount";
export { IconButton } from "@alfalab/core-components-icon-button";
export { Input } from "@alfalab/core-components-input";
export { PassCode } from "@alfalab/core-components-pass-code";
// D-15: only Russian numbers (+7), so the masked phone input, not the international one.
export { PhoneInput } from "@alfalab/core-components-phone-input";
export { PureCell as Cell } from "@alfalab/core-components-pure-cell";
export { Radio } from "@alfalab/core-components-radio";
export { Spinner } from "@alfalab/core-components-spinner";
export { Switch } from "@alfalab/core-components-switch";
export { Typography } from "@alfalab/core-components-typography";
