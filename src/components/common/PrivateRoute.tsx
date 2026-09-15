import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { setPostLoginRedirect } from '../../lib/postLoginRedirect';

interface Props {
  children: React.ReactNode;
}

/**
 * 인증 필요 라우트 — 미로그인 시 **로그인 화면으로** 보낸다.
 *
 * 예전에는 홈(`/`)으로 되돌렸는데, 주소를 직접 치거나 북마크로 들어온 사람은
 * 아무 설명 없이 홈에 떨어져 "왜 안 열리지"가 된다. 로그인 화면으로 보내면
 * 무엇이 필요한지가 화면 자체로 전달되고, 로그인 후 원래 가려던 곳으로 돌아간다.
 */
export default function PrivateRoute({ children }: Props) {
  const { isLoggedIn, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) return null; // silentRefresh 완료 대기

  if (!isLoggedIn) {
    setPostLoginRedirect(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
