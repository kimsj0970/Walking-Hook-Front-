import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/common/Header';
import PointManagementPage from './PointManagementPage';
import UserManagementPage from './UserManagementPage';
import DocumentManagementPage from './DocumentManagementPage';
import AdminMapPage from './AdminMapPage';
import AiChatPage from './AiChatPage';
import AdminInquiryManagement from './AdminInquiryManagement';
import AdminNoticeManagement from './AdminNoticeManagement';
import MigratoryPointManagementPage from './MigratoryPointManagementPage';
import FishingZoneManagementPage from './FishingZoneManagementPage';
import AdminReportPage from './AdminReportPage';
import AdminDeletedContentPage from './AdminDeletedContentPage';
import styles from './AdminPage.module.css';

type AdminTab = 'points' | 'migratory-points' | 'users' | 'documents' | 'inquiries' | 'notices' | 'map' | 'fishing-zones' | 'ai' | 'reports' | 'deleted-contents';

const ALL_NAV_ITEMS: { tab: AdminTab; label: string; adminOnly: boolean }[] = [
  { tab: 'points',           label: 'AI 분석 포인트',     adminOnly: false },
  { tab: 'migratory-points', label: '조황 포인트 관리',    adminOnly: false },
  { tab: 'fishing-zones',    label: '낚시 금지구역 추가',  adminOnly: false },
  { tab: 'documents',        label: 'RAG 문서 관리',      adminOnly: true  },
  { tab: 'users',            label: '사용자 관리',        adminOnly: false },
  { tab: 'inquiries',        label: '고객센터 관리',      adminOnly: false },
  { tab: 'notices',          label: '공지사항 관리',      adminOnly: false },
  { tab: 'reports',          label: '신고 관리',          adminOnly: false },
  { tab: 'deleted-contents', label: '신고·삭제 콘텐츠',    adminOnly: false },
  { tab: 'map',              label: '지도 보기',          adminOnly: false },
  { tab: 'ai',               label: 'AI에게 질문',       adminOnly: true  },
];

export default function AdminPage() {
  const { isLoggedIn, isAdmin, isModerator, isInitializing } = useAuth();
  const navigate = useNavigate();

  const canAccess = isAdmin || isModerator;
  const navItems = ALL_NAV_ITEMS.filter(item => isAdmin || !item.adminOnly);
  const [activeTab, setActiveTab] = useState<AdminTab>(() =>
    isAdmin ? 'points' : 'users'
  );

  useEffect(() => {
    if (!isInitializing && (!isLoggedIn || !canAccess)) {
      navigate('/', { replace: true });
    }
  }, [isLoggedIn, canAccess, isInitializing, navigate]);

  if (isInitializing) {
    return (
      <div className={styles.initLoading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (!isLoggedIn || !canAccess) return null;

  return (
    <div className={styles.page}>
      <Header />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>관리</p>
          {isModerator && !isAdmin && (
            <p className={styles.sidebarRole}>중간관리자</p>
          )}
          <nav className={styles.nav}>
            {navItems.map(({ tab, label }) => (
              <button
                key={tab}
                className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>
        <main className={`${styles.content} ${(activeTab === 'map' || activeTab === 'fishing-zones') ? styles.contentMap : ''}`}>
          {activeTab === 'points'           && <PointManagementPage />}
          {activeTab === 'migratory-points' && <MigratoryPointManagementPage />}
          {activeTab === 'fishing-zones'    && <FishingZoneManagementPage />}
          {activeTab === 'documents'        && <DocumentManagementPage />}
          {activeTab === 'users'            && <UserManagementPage />}
          {activeTab === 'inquiries'        && <AdminInquiryManagement />}
          {activeTab === 'notices'          && <AdminNoticeManagement />}
          {activeTab === 'reports'          && <AdminReportPage />}
          {activeTab === 'deleted-contents' && <AdminDeletedContentPage />}
          {activeTab === 'map'              && <AdminMapPage />}
          {activeTab === 'ai'              && <AiChatPage />}
        </main>
      </div>
    </div>
  );
}
