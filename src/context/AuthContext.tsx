import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { logoutApi, deleteUserApi, updateNicknameApi } from '../api/authApi';

interface AuthContextType {
  accessToken: string | null;
  nickname: string | null;
  isLoggedIn: boolean;
  needsNickname: boolean;
  login: (token: string, nickname: string | null) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken')
  );
  const [nickname, setNicknameState] = useState<string | null>(
    () => localStorage.getItem('nickname')
  );

  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail as { accessToken: string; nickname: string | null };
      setAccessToken(detail.accessToken);
      if (detail.nickname) setNicknameState(detail.nickname);
    };
    const handleExpired = () => {
      setAccessToken(null);
      setNicknameState(null);
      // 리프레시 토큰 만료 → 알림 후 홈으로 리다이렉트
      alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
      window.location.href = '/';
    };

    window.addEventListener('token-refreshed', handleRefresh);
    window.addEventListener('auth-expired', handleExpired);
    return () => {
      window.removeEventListener('token-refreshed', handleRefresh);
      window.removeEventListener('auth-expired', handleExpired);
    };
  }, []);

  const login = useCallback((token: string, nick: string | null) => {
    localStorage.setItem('accessToken', token);
    setAccessToken(token);
    if (nick) {
      localStorage.setItem('nickname', nick);
      setNicknameState(nick);
    } else {
      localStorage.removeItem('nickname');
      setNicknameState(null);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // 서버 실패해도 로컬은 정리
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('nickname');
      setAccessToken(null);
      setNicknameState(null);
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteUserApi();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('nickname');
    setAccessToken(null);
    setNicknameState(null);
  }, []);

  const setNickname = useCallback(async (nick: string) => {
    await updateNicknameApi(nick);
    localStorage.setItem('nickname', nick);
    setNicknameState(nick);
  }, []);

  const isLoggedIn = !!accessToken;
  const needsNickname = isLoggedIn && !nickname;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        nickname,
        isLoggedIn,
        needsNickname,
        login,
        logout,
        deleteAccount,
        setNickname,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
