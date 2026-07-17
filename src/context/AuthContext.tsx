import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  logoutApi,
  deleteUserApi,
  updateNicknameApi,
  setInitialNicknameApi,
  agreeToAgeApi,
  agreeToTermsApi,
  silentRefresh,
  setInMemoryToken,
  parseJwtUserId,
} from '../api/authApi';

interface AuthContextType {
  accessToken: string | null;
  nickname: string | null;
  userId: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  role: string;
  needsNickname: boolean;
  needsAgeConsent: boolean;
  needsTermsConsent: boolean;
  isInitializing: boolean;
  login: (token: string, nickname: string | null, role?: string, needsAgeAgreement?: boolean, needsTermsAgreement?: boolean) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  setInitialNickname: (nickname: string) => Promise<void>;
  setNickname: (nickname: string) => Promise<void>;
  confirmAgeConsent: () => Promise<void>;
  confirmTermsReconsent: (marketingAgreed: boolean) => Promise<void>;
  markAgeConsented: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [nickname, setNicknameState] = useState<string | null>(
    () => localStorage.getItem('nickname')
  );
  const [userId, setUserIdState] = useState<string | null>(
    () => localStorage.getItem('userId')
  );
  const [role, setRoleState] = useState<string>(
    () => localStorage.getItem('role') ?? 'USER'
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [needsAgeConsent, setNeedsAgeConsent] = useState(false);
  const [needsTermsConsent, setNeedsTermsConsent] = useState(false);

  // 앱 시작 시 httpOnly 쿠키로 조용히 토큰 복원
  useEffect(() => {
    silentRefresh().then((result) => {
      if (result) {
        setInMemoryToken(result.accessToken);
        setAccessToken(result.accessToken);
        if (result.nickName) {
          localStorage.setItem('nickname', result.nickName);
          setNicknameState(result.nickName);
        }
        if (result.role) {
          localStorage.setItem('role', result.role);
          setRoleState(result.role);
        }
        if (result.userId) {
          localStorage.setItem('userId', result.userId);
          setUserIdState(result.userId);
        }
        setNeedsAgeConsent(result.needsAgeAgreement);
        setNeedsTermsConsent(result.needsTermsAgreement);
      }
    }).finally(() => {
      setIsInitializing(false);
    });
  }, []);

  useEffect(() => {
    const handleRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail as { accessToken: string; nickname: string | null; role?: string; userId?: string };
      setAccessToken(detail.accessToken);
      if (detail.nickname) {
        localStorage.setItem('nickname', detail.nickname);
        setNicknameState(detail.nickname);
      }
      if (detail.role) {
        localStorage.setItem('role', detail.role);
        setRoleState(detail.role);
      }
      if (detail.userId) {
        localStorage.setItem('userId', detail.userId);
        setUserIdState(detail.userId);
      }
    };
    const handleExpired = () => {
      setAccessToken(null);
      setNicknameState(null);
      setUserIdState(null);
      setRoleState('USER');
      setNeedsAgeConsent(false);
      setNeedsTermsConsent(false);
      localStorage.removeItem('nickname');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
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

  const login = useCallback((token: string, nick: string | null, r?: string, needsAgeAgreement?: boolean, needsTermsAgreement?: boolean) => {
    setInMemoryToken(token);
    setAccessToken(token);
    if (nick) {
      localStorage.setItem('nickname', nick);
      setNicknameState(nick);
    } else {
      localStorage.removeItem('nickname');
      setNicknameState(null);
    }
    const newRole = r ?? 'USER';
    localStorage.setItem('role', newRole);
    setRoleState(newRole);
    const uid = parseJwtUserId(token);
    if (uid) { localStorage.setItem('userId', uid); setUserIdState(uid); }
    setNeedsAgeConsent(needsAgeAgreement ?? false);
    setNeedsTermsConsent(needsTermsAgreement ?? false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } catch {
      // 서버 실패해도 로컬은 정리
    } finally {
      setInMemoryToken(null);
      setAccessToken(null);
      setNicknameState(null);
      setUserIdState(null);
      setRoleState('USER');
      setNeedsAgeConsent(false);
      setNeedsTermsConsent(false);
      localStorage.removeItem('nickname');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
    }
  }, []);

  const deleteAccount = useCallback(async () => {
    await deleteUserApi();
    setInMemoryToken(null);
    setAccessToken(null);
    setNicknameState(null);
    setUserIdState(null);
    setRoleState('USER');
    setNeedsAgeConsent(false);
    setNeedsTermsConsent(false);
    localStorage.removeItem('nickname');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
  }, []);

  const setInitialNickname = useCallback(async (nick: string) => {
    await setInitialNicknameApi(nick);
    localStorage.setItem('nickname', nick);
    setNicknameState(nick);
  }, []);

  const setNickname = useCallback(async (nick: string) => {
    await updateNicknameApi(nick);
    localStorage.setItem('nickname', nick);
    setNicknameState(nick);
  }, []);

  // 기존 가입자용: 만 14세 이상 확인 동의를 서버에 기록
  const confirmAgeConsent = useCallback(async () => {
    await agreeToAgeApi();
    setNeedsAgeConsent(false);
  }, []);

  // 탈퇴 후 복구(재가입) 사용자용: 약관 전체 재동의 — 만 14세 확인·연령 동의까지 함께 기록됨
  const confirmTermsReconsent = useCallback(async (marketingAgreed: boolean) => {
    await agreeToTermsApi({ ageAgreed: true, termsAgreed: true, privacyAgreed: true, marketingAgreed });
    setNeedsTermsConsent(false);
    setNeedsAgeConsent(false);
  }, []);

  // 신규 가입 약관 동의(ageAgreed 포함) 완료 시 로컬 플래그만 해제
  const markAgeConsented = useCallback(() => {
    setNeedsAgeConsent(false);
  }, []);

  const isLoggedIn = !!accessToken;
  const isAdmin = isLoggedIn && role === 'ADMIN';
  const isModerator = isLoggedIn && role === 'MIDDLE_ADMIN';
  const needsNickname = isLoggedIn && !nickname;

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        nickname,
        userId,
        isLoggedIn,
        isAdmin,
        isModerator,
        role,
        needsNickname,
        needsAgeConsent,
        needsTermsConsent,
        isInitializing,
        login,
        logout,
        deleteAccount,
        setInitialNickname,
        setNickname,
        confirmAgeConsent,
        confirmTermsReconsent,
        markAgeConsented,
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
