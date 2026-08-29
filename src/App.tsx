import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Footer from './components/common/Footer';
import AgeConsentModal from './components/common/AgeConsentModal';
import TermsReconsentModal from './components/common/TermsReconsentModal';
import ScrollToTop from './components/common/ScrollToTop';
import AnalyticsTracker from './components/common/AnalyticsTracker';
import AnchorAdSlot from './components/common/AnchorAdSlot';
import HomePage from './pages/HomePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import NicknamePage from './pages/NicknamePage';
import MyPage from './pages/MyPage';
import MapPage from './pages/MapPage';
import CctvMapPage from './pages/CctvMapPage';
import FishingZonesMapPage from './pages/FishingZonesMapPage';
import AdminPage from './pages/admin/AdminPage';
import InquiryPage from './pages/InquiryPage';
import CommunityPage from './pages/CommunityPage';
import NoticePage from './pages/NoticePage';
import CatchPostPage from './pages/CatchPostPage';
import FreePostPage from './pages/FreePostPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AccountDeletionPage from './pages/AccountDeletionPage';
import GuideListPage from './pages/GuideListPage';
import GuideDetailPage from './pages/GuideDetailPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function NicknameGuard({ children }: { children: ReactNode }) {
  const { needsNickname, isInitializing } = useAuth();
  const { pathname } = useLocation();
  const exempt = pathname === '/nickname' || pathname.startsWith('/oauth') || pathname === '/terms' || pathname === '/privacy';
  if (!isInitializing && needsNickname && !exempt) {
    return <Navigate to="/nickname" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AnalyticsTracker />
        <NicknameGuard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/oauth/naver/callback" element={<OAuthCallbackPage />} />
            <Route path="/nickname" element={<PrivateRoute><NicknamePage /></PrivateRoute>} />
            <Route path="/my" element={<PrivateRoute><MyPage /></PrivateRoute>} />
            {/* 지도 데이터(포인트 좌표·낚시금지구역)는 로그인 필수 API 라 PrivateRoute 로 감싼다.
                감싸는 진짜 이유는 리다이렉트가 아니라 "대기"다 — 이 페이지들은 window.open 으로
                열리는 팝업이고, 팝업은 부모의 메모리 토큰을 물려받지 못해 AuthProvider 의
                silentRefresh(httpOnly refresh 쿠키)로 토큰을 새로 받는다. 그 사이에 지도가
                먼저 마운트되면 Authorization 헤더 없이 요청이 나가 401 이 된다.
                PrivateRoute 는 isInitializing 동안 렌더를 미루므로 그 경합이 사라진다.
                CCTV 는 정부 공개 데이터라 API 가 공개이므로 감싸지 않는다. */}
            <Route path="/map" element={<PrivateRoute><MapPage /></PrivateRoute>} />
            <Route path="/map/cctv" element={<CctvMapPage />} />
            <Route path="/map/fishing-zones" element={<PrivateRoute><FishingZonesMapPage /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
            <Route path="/inquiry" element={<PrivateRoute><InquiryPage /></PrivateRoute>} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/notices" element={<NoticePage />} />
            <Route path="/catch-posts" element={<CatchPostPage />} />
            <Route path="/free-posts" element={<FreePostPage />} />
            {/* 공개 가이드 — 로그인 없이 읽힌다. 검색엔진·광고 심사가 보는 화면. */}
            <Route path="/guide" element={<GuideListPage />} />
            <Route path="/guide/:slug" element={<GuideDetailPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            {/* Play Console 데이터 안전 설문의 "계정 삭제 요청 URL" 로 제출한다. 로그인 없이
                접근할 수 있어야 하므로 PrivateRoute 로 감싸면 안 된다. */}
            <Route path="/account-deletion" element={<AccountDeletionPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <Footer />
          {/* 앱의 앵커 배너와 같은 자리. Routes 바깥이라 화면을 옮겨도 유지된다. */}
          <AnchorAdSlot />
          <TermsReconsentModal />
          <AgeConsentModal />
        </NicknameGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}
