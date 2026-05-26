import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import PointManagementPage from './PointManagementPage';
import UserManagementPage from './UserManagementPage';
import DocumentManagementPage from './DocumentManagementPage';
import styles from './AdminPage.module.css';

type AdminTab = 'points' | 'users' | 'documents';

const NAV_ITEMS: { tab: AdminTab; icon: string; label: string }[] = [
  { tab: 'points',    icon: '📍', label: '포인트 관리' },
  { tab: 'documents', icon: '📄', label: 'RAG 문서 관리' },
  { tab: 'users',     icon: '👥', label: '사용자 관리' },
];

export default function AdminPage() {
  const { isLoggedIn, isAdmin, isInitializing } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('points');

  useEffect(() => {
    if (!isInitializing && (!isLoggedIn || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, isAdmin, isInitializing, navigate]);

  if (isInitializing) {
    return (
      <div className={styles.initLoading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>관리</p>
          <nav className={styles.nav}>
            {NAV_ITEMS.map(({ tab, icon, label }) => (
              <button
                key={tab}
                className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <span className={styles.navIcon}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <main className={styles.content}>
          {activeTab === 'points'    && <PointManagementPage />}
          {activeTab === 'documents' && <DocumentManagementPage />}
          {activeTab === 'users'     && <UserManagementPage />}
        </main>
      </div>
    </div>
  );
}
