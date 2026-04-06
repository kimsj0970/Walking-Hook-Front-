import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

/** 인증 필요 라우트 — 미로그인 시 홈으로 리다이렉트 */
export default function PrivateRoute({ children }: Props) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <>{children}</> : <Navigate to="/" replace />;
}
