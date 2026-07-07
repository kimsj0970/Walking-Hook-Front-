import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!BASE_URL) {
  console.error('[authApi] VITE_API_BASE_URL 환경변수가 설정되지 않았습니다. Vercel 대시보드 → Settings → Environment Variables에 추가하세요.');
}

// accessToken은 메모리에만 보관 (XSS 탈취 방지)
let inMemoryToken: string | null = null;

// csrfToken은 sessionStorage에 보관 (페이지 새로고침 시 유지, 탭 닫으면 초기화)
let inMemoryCsrfToken: string | null = sessionStorage.getItem('csrfToken');

export function setInMemoryToken(token: string | null) {
  inMemoryToken = token;
}

export function getInMemoryToken(): string | null {
  return inMemoryToken;
}

function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token;
  if (token) {
    sessionStorage.setItem('csrfToken', token);
  } else {
    sessionStorage.removeItem('csrfToken');
  }
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

interface ReissueData {
  accessToken: string;
  csrfToken: string;
  userNickName: string | null;
  needsAgeAgreement: boolean;
}

// silentRefresh와 401 인터셉터가 공유하는 단일 reissue 요청 — race condition 방지
let reissuePromise: Promise<ReissueData> | null = null;

function callReissue(): Promise<ReissueData> {
  if (!reissuePromise) {
    reissuePromise = axios
      .post(
        `${BASE_URL}/user/reissue`,
        {},
        {
          withCredentials: true,
          headers: inMemoryCsrfToken ? { 'X-CSRF-Token': inMemoryCsrfToken } : {},
        }
      )
      .then(({ data }) => ({
        accessToken: data.data.accessToken as string,
        csrfToken: data.data.csrfToken as string,
        userNickName: (data.data.userNickName as string | null) ?? null,
        needsAgeAgreement: (data.data.needsAgeAgreement as boolean) ?? false,
      }))
      .finally(() => {
        reissuePromise = null;
      });
  }
  return reissuePromise;
}

// auth-expired 이벤트 중복 발행 방지 — 동시 401로 catch 블록이 여러 번 진입해도 1번만 알림
let authExpiredFired = false;

// 401 시 자동 토큰 재발급 후 재시도
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry && inMemoryToken) {
      original._retry = true;

      try {
        const { accessToken, csrfToken, userNickName } = await callReissue();

        setInMemoryToken(accessToken);
        setCsrfToken(csrfToken);
        authExpiredFired = false;

        window.dispatchEvent(
          new CustomEvent('token-refreshed', {
            detail: { accessToken, nickname: userNickName, role: parseJwtRole(accessToken), userId: parseJwtUserId(accessToken) },
          })
        );

        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        setInMemoryToken(null);
        setCsrfToken(null);
        if (!authExpiredFired) {
          authExpiredFired = true;
          window.dispatchEvent(new Event('auth-expired'));
        }
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
  needsAgeAgreement: boolean;
}

/** 탈퇴 후 3개월 이내 계정 — 로그인 대신 복구 여부 확인이 필요한 상태 */
export interface RecoveryAvailableResult {
  recoveryAvailable: true;
  recoveryToken: string;
}

export function isRecoveryAvailable(
  result: AuthResult | RecoveryAvailableResult
): result is RecoveryAvailableResult {
  return 'recoveryAvailable' in result && result.recoveryAvailable === true;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

/** OAuth 로그인 */
export async function oauthLogin(
  provider: string,
  code: string,
  state?: string
): Promise<AuthResult | RecoveryAvailableResult> {
  const { data } = await api.post(`/oauth/${provider}`, { code, state });

  // 탈퇴 3개월 이내 계정: 토큰 대신 복구 확인용 recoveryToken이 내려온다
  if (data.data.recoveryAvailable) {
    return {
      recoveryAvailable: true,
      recoveryToken: data.data.recoveryToken as string,
    };
  }

  const accessToken: string = data.data.accessToken;
  setCsrfToken(data.data.csrfToken);
  return {
    accessToken,
    nickName: data.data.userNickName ?? null,
    role: parseJwtRole(accessToken),
    userId: parseJwtUserId(accessToken),
    needsAgeAgreement: (data.data.needsAgeAgreement as boolean) ?? false,
  };
}

/** 탈퇴 계정 복구 신청 — 로그인 응답으로 받은 recoveryToken으로 관리자 승인 대기 상태를 만든다 */
export async function requestAccountRecoveryApi(recoveryToken: string): Promise<void> {
  await api.post('/oauth/recovery', { recoveryToken });
}

/** 앱 시작 시 silent refresh (httpOnly 쿠키 → 메모리 토큰 복원) */
export async function silentRefresh(): Promise<AuthResult | null> {
  try {
    const { accessToken, csrfToken, userNickName, needsAgeAgreement } = await callReissue();
    setInMemoryToken(accessToken);
    setCsrfToken(csrfToken);
    return {
      accessToken,
      nickName: userNickName,
      role: parseJwtRole(accessToken),
      userId: parseJwtUserId(accessToken),
      needsAgeAgreement,
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
  ageAgreed: boolean;
  termsAgreed: boolean;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
}): Promise<void> {
  await api.post('/user/terms', params);
}

/** 만 14세 이상 확인 동의 (연령 확인 기록이 없는 기존 가입자용) */
export async function agreeToAgeApi(): Promise<void> {
  await api.post('/user/terms/age');
}

/** 로그아웃 */
export async function logoutApi(): Promise<void> {
  try {
    await api.post('/user/logout');
  } finally {
    setCsrfToken(null);
  }
}

/** 회원 탈퇴 */
export async function deleteUserApi(): Promise<void> {
  try {
    await api.delete('/user/delete');
  } finally {
    setCsrfToken(null);
  }
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
  age?: string | null;
  birthyear?: string | null;
}

export async function getMyInfoApi(): Promise<UserInfoResponse> {
  const { data } = await api.get('/user/mypage');
  return data.data as UserInfoResponse;
}

export default api;
