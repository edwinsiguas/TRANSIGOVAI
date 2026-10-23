interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_JAVA_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
