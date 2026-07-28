/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_REST_API_KEY: string;
  readonly VITE_KAKAO_REDIRECT_URI: string;
  readonly VITE_NAVER_CLIENT_ID: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GA_MEASUREMENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
