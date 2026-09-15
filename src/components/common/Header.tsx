import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';
import NotificationBell from './NotificationBell';
import styles from './Header.module.css';

type Props = {
  /**
   * 홈처럼 헤더 바로 아래가 딥블루 밴드인 화면에서 켠다.
   * 헤더까지 같은 색면으로 칠해 이음새를 없앤다. 기본은 흰 헤더 —
   * 밴드가 없는 다른 페이지에서 남색 헤더만 떠 있으면 어색하다.
   */
  onDark?: boolean;
};

export default function Header({ onDark = false }: Props) {
  const { isLoggedIn, isAdmin, isModerator, nickname, logout } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className={`${styles.header} ${onDark ? styles.headerOnDark : ''}`}>
        <div className={styles.inner}>
          {/* 로고 */}
          <button className={styles.logo} onClick={() => navigate('/')}>
            <span className={styles.logoIcon}>🎣</span>
            <span className={styles.logoText}>Walking Hook</span>
          </button>

          {/* 공개 메뉴 — 로그인 여부와 무관하게 보인다.
              비로그인 방문자와 검색엔진이 콘텐츠로 들어오는 유일한 통로라 지우면 안 된다. */}
          <nav className={styles.nav}>
            <button className={styles.navBtn} onClick={() => navigate('/guide')}>
              가이드
            </button>
            <button className={styles.noticeBtn} onClick={() => navigate('/community')}>
              커뮤니티
            </button>
            <button className={styles.noticeBtn} onClick={() => navigate('/notices')}>
              공지사항
            </button>
          </nav>

          {/* 우측 메뉴 */}
          <div className={styles.right}>
            {isLoggedIn ? (
              <>
                {(isAdmin || isModerator) && (
                  <button className={styles.adminBtn} onClick={() => navigate('/admin')}>
                    관리자 페이지
                  </button>
                )}
                <button className={styles.inquiryBtn} onClick={() => navigate('/inquiry')}>
                  고객센터
                </button>
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  로그아웃
                </button>
                <NotificationBell />
                <button
                  className={styles.profileBtn}
                  onClick={() => navigate('/my')}
                  title="마이페이지"
                >
                  <div className={styles.avatar}>
                    {nickname ? nickname.charAt(0).toUpperCase() : '?'}
                  </div>
                  <span className={styles.profileName}>{nickname}</span>
                </button>
              </>
            ) : (
              <button
                className={styles.loginBtn}
                onClick={() => setLoginOpen(true)}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
