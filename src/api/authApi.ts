import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!BASE_URL) {
  console.error('[authApi] VITE_API_BASE_URL 환경변수가 설정되지 않았습니다. Vercel 대시보드 → Settings → Environment Variables에 추가하세요.');
}

// accessToken은 메모리에만 보관 (XSS 탈취 방지)
let inMemoryToken: string | null = null;

export function setInMemoryToken(token: string | null) {
  inMemoryToken = token;
}

export function getInMemoryToken(): string | null {
  return inMemoryToken;
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // refresh token 쿠키 자동 전송
});

// 요청마다 Authorization 헤더 자동 추가
api.interceptors.request.use((config) => {
  if (inMemoryToken) {
    config.headers.Authorization = `Bearer ${inMemoryToken}`;
  }
  return config;
});

// 토큰 재발급 중복 요청 방지 (Queue 패턴)
let refreshPromise: Promise<string> | null = null;

// 401 시 자동 토큰 재발급 후 재시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/user/reissue`, {}, { withCredentials: true })
            .then(({ data }) => {
              const newToken: string = data.data.accessToken;
              const newNickname: string | null = data.data.userNickName ?? null;

              setInMemoryToken(newToken);

              window.dispatchEvent(
                new CustomEvent('token-refreshed', {
                  detail: { accessToken: newToken, nickname: newNickname, role: parseJwtRole(newToken), userId: parseJwtUserId(newToken) },
                })
              );

              return newToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        setInMemoryToken(null);
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── JWT 파싱 ────────────────────────────────────────────────────────────────

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

function parseJwtRole(token: string): string {
  return (parseJwtPayload(token).role as string) ?? 'USER';
}

export function parseJwtUserId(token: string): string | null {
  return (parseJwtPayload(token).sub as string) ?? null;
}

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  accessToken: string;
  nickName: string | null;
  role: string;
  userId: string | null;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

/** OAuth 로그인 */
export async function oauthLogin(provider: string, code: string): Promise<AuthResult> {
  const { data } = await api.post(`/oauth/${provider}`, { code });
  const accessToken: string = data.data.accessToken;
  return {
    accessToken,
    nickName: data.data.userNickName ?? null,
    role: parseJwtRole(accessToken),
    userId: parseJwtUserId(accessToken),
  };
}

/** 앱 시작 시 silent refresh (httpOnly 쿠키 → 메모리 토큰 복원) */
export async function silentRefresh(): Promise<AuthResult | null> {
  try {
    const { data } = await axios.post(
      `${BASE_URL}/user/reissue`,
      {},
      { withCredentials: true }
    );
    const accessToken: string = data.data.accessToken;
    return {
      accessToken,
      nickName: data.data.userNickName ?? null,
      role: parseJwtRole(accessToken),
      userId: parseJwtUserId(accessToken),
    };
  } catch {
    return null;
  }
}

/** 최초 닉네임 설정 (쿨다운 없음) */
export async function setInitialNicknameApi(nickName: string): Promise<void> {
  await api.patch('/user/nickname', { nickName });
}

/** 닉네임 변경 (30일 쿨다운 적용) */
export async function updateNicknameApi(nickName: string): Promise<void> {
  await api.patch('/user/update', { nickName });
}

/** 약관 동의 */
export async function agreeToTermsApi(params: {
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}): Promise<void> {
  await api.post('/user/terms', params);
}

/** 로그아웃 */
export async function logoutApi(): Promise<void> {
  await api.post('/user/logout');
}

/** 회원 탈퇴 */
export async function deleteUserApi(): Promise<void> {
  await api.delete('/user/delete');
}

/** 마이페이지 정보 조회 */
export interface UserInfoResponse {
  name: string;
  nickName: string;
  provider: string;
  email: string;
  point: number;
  role?: string;
  nicknameChangedAt?: string | null;
}

export async function getMyInfoApi(): Promise<UserInfoResponse> {
  const { data } = await api.get('/user/mypage');
  return data.data as UserInfoResponse;
}

export default api;
