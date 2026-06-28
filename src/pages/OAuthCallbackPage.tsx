import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { oauthLogin } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const savedState = sessionStorage.getItem('oauth_state');

    if (!code) {
      alert('인증 코드가 없습니다.');
      navigate('/');
      return;
    }

    // OAuth state 검증 (CSRF 방지)
    if (!returnedState || returnedState !== savedState) {
      alert('잘못된 인증 요청입니다. 다시 시도해 주세요.');
      sessionStorage.removeItem('oauth_state');
      navigate('/');
      return;
    }
    sessionStorage.removeItem('oauth_state');

    // sessionStorage에서 provider 판별 (다중 provider 지원)
    const provider = sessionStorage.getItem('oauth_provider');
    sessionStorage.removeItem('oauth_provider');

    if (!provider) {
      alert('로그인 제공자를 확인할 수 없습니다. 다시 시도해 주세요.');
      navigate('/');
      return;
    }

    oauthLogin(provider, code, returnedState ?? undefined)
      .then(({ accessToken, nickName, role }) => {
        login(accessToken, nickName, role);
        // 닉네임 없으면 닉네임 설정 페이지로
        if (!nickName) {
          navigate('/nickname', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch(() => {
        alert('로그인에 실패했습니다. 다시 시도해 주세요.');
        navigate('/');
      });
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      gap: '16px',
      backgroundColor: 'var(--color-bg)',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid var(--color-border)',
        borderTop: '3px solid var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
        로그인 처리 중...
      </p>
    </div>
  );
}
