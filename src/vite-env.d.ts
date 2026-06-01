/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
  import type { SWResponse } from 'vite-plugin-pwa';
  export function useRegisterSW(options?: object): {
    needRefresh: [boolean, (value: boolean) => void];
    offlineReady: [boolean, (value: boolean) => void];
    updateServiceWorker: (reloadPage?: boolean) => Promise<SWResponse>;
  };
}

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_PUSH_ENDPOINT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
