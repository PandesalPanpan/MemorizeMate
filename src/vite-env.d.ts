/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_PUSH_ENDPOINT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
