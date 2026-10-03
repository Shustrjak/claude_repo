/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which banking adapter the app runs on: "demo" (default) or "null". */
  readonly VITE_BANKING_ADAPTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
