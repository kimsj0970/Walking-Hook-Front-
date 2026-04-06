import { useEffect } from 'react';
import styles from './LoginModal.module.css';

const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY as string;
const KAKAO_REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI as string;

/** 랜덤 state 생성 및 카카오 로그인 URL 반환 */
function buildKakaoLoginUrl(): string {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_provider', 'kakao');
  return (
    `https://kauth.kakao.com/oauth/authorize` +
    `?client_id=${KAKAO_REST_API_KEY}` +
    `&redirect_uri=${encodeURIComponent(KAKAO_REDIRECT_URI)}` +
    `&response_type=code` +
    `&state=${state}`
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: Props) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // 배경 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleKakaoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.href = buildKakaoLoginUrl();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>

        <div className={styles.header}>
          <span className={styles.headerIcon}>🎣</span>
          <h2 className={styles.title}>Walking Hook 로그인</h2>
          <p className={styles.subtitle}>소셜 계정으로 간편하게 시작하세요</p>
        </div>

        <div className={styles.providers}>
          {/* 카카오 */}
          <a
            href="#"
            onClick={handleKakaoClick}
            className={`${styles.providerBtn} ${styles.kakao}`}
          >
            <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.48 3 2 6.69 2 11.25c0 2.91 1.82 5.47 4.58 6.96l-.93 3.46c-.08.3.26.54.52.36l4.18-2.76c.52.07 1.06.1 1.65.1 5.52 0 10-3.69 10-8.25S17.52 3 12 3z"/>
            </svg>
            <span>카카오로 시작하기</span>
          </a>

          {/* 네이버 (준비 중) */}
          <button className={`${styles.providerBtn} ${styles.naver} ${styles.disabled}`} disabled>
            <svg className={styles.providerIcon} viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
            </svg>
            <span>네이버로 시작하기</span>
            <span className={styles.badge}>준비 중</span>
          </button>

          {/* 구글 (준비 중) */}
          <button className={`${styles.providerBtn} ${styles.google} ${styles.disabled}`} disabled>
            <svg className={styles.providerIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Google로 시작하기</span>
            <span className={styles.badge}>준비 중</span>
          </button>
        </div>

        <p className={styles.terms}>
          로그인 시 <span>이용약관</span>과 <span>개인정보처리방침</span>에 동의합니다.
        </p>
      </div>
    </div>
  );
}
