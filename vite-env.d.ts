
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly API_KEY: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
