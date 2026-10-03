/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which banking adapter the app runs on: "demo" (default) or "null". */
  readonly VITE_BANKING_ADAPTER?: string;
  /** Which device capability adapter the app runs on: "demo" (default) or "null". */
  readonly VITE_DEVICE_ADAPTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
