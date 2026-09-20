import { useAuth } from '../../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

/**
 * PrivateRoute 의 체험판 변형 — 체험판 기간에는 로그인 여부와 무관하게 통과.
 *
 * PrivateRoute 를 고치지 않고 따로 두는 이유: 체험판이 끝나면 App.tsx 에서 이 이름을
 * PrivateRoute 로 되돌리고 이 파일을 지우면 끝이다. 원래 게이트는 손댄 적이 없다.
 * isInitializing 만 기다리는 건, 로그인 복구가 끝나기 전에 그리면 비로그인으로 오판해
 * 회원 요청이 /demo 로 나가기 때문이다.
 */
export default function DemoRoute({ children }: Props) {
  const { isInitializing } = useAuth();
  if (isInitializing) return null;
  return <>{children}</>;
}
