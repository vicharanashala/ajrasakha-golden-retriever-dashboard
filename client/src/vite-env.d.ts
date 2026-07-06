/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RETRIEVAL_API_V1_URL?: string;
  readonly VITE_RETRIEVAL_API_V2_URL?: string;
  readonly VITE_RETRIEVAL_API_TIMEOUT_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
