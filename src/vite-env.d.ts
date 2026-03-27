/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PUBLIC_APP_URL?: string;
  readonly VITE_NOMINATIM_SEARCH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
