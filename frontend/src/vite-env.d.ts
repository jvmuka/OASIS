/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MODO_DEMO?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

