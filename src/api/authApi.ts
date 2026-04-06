import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // refresh token 쿠키 자동 전송
});

// 요청마다 Authorization 헤더 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
        // 이미 재발급 중이면 기존 Promise 재사용
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/user/reissue`, {}, { withCredentials: true })
            .then(({ data }) => {
              const newToken: string = data.data.accessToken;
              const newNickname: string | null = data.data.userNickName ?? null;

              localStorage.setItem('accessToken', newToken);
              if (newNickname) localStorage.setItem('nickname', newNickname);

              window.dispatchEvent(
                new CustomEvent('token-refreshed', {
                  detail: { accessToken: newToken, nickname: newNickname },
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('nickname');
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  accessToken: string;
  nickName: string | null;
}

// ─── API 함수 ─────────────────────────────────────────────────────────────────

/** OAuth 로그인 */
export async function oauthLogin(provider: string, code: string): Promise<AuthResult> {
  const { data } = await api.post(`/oauth/${provider}`, { code });
  return {
    accessToken: data.data.accessToken,
    nickName: data.data.userNickName ?? null,
  };
}

/** 닉네임 설정 / 변경 */
export async function updateNicknameApi(nickName: string): Promise<void> {
  await api.patch('/user/update', { nickName });
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
}

export async function getMyInfoApi(): Promise<UserInfoResponse> {
  const { data } = await api.get('/user/mypage');
  return data.data as UserInfoResponse;
}

export default api;
