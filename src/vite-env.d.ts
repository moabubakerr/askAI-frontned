/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 'true' resolves every request from the sample fixtures. Anything else (the
   * default) calls the service on the same origin, at /api/ask and /api/health.
   *
   * There is deliberately no variable for an API host or port: a base URL baked
   * into the bundle is a cross-origin request waiting to happen, and the proxy
   * in front of this app is what makes the API same-origin.
   */
  readonly VITE_USE_FIXTURES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
