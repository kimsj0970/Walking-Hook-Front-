import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';
import styles from './Header.module.css';

export default function Header() {
  const { isLoggedIn, isAdmin, nickname, logout } = useAuth();
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* 로고 */}
          <button className={styles.logo} onClick={() => navigate('/')}>
            <span className={styles.logoIcon}>🎣</span>
            <span className={styles.logoText}>Walking Hook</span>
          </button>

          {/* 우측 메뉴 */}
          <div className={styles.right}>
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <button className={styles.adminBtn} onClick={() => navigate('/admin')}>
                    관리자 페이지
                  </button>
                )}
                <button className={styles.logoutBtn} onClick={handleLogout}>
                  로그아웃
                </button>
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
