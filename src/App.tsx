import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Footer from './components/common/Footer';
import AgeConsentModal from './components/common/AgeConsentModal';
import TermsReconsentModal from './components/common/TermsReconsentModal';
import ScrollToTop from './components/common/ScrollToTop';
import AnalyticsTracker from './components/common/AnalyticsTracker';
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
            <Route path="/map" element={<MapPage />} />
            <Route path="/map/cctv" element={<CctvMapPage />} />
            <Route path="/map/fishing-zones" element={<FishingZonesMapPage />} />
            <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
            <Route path="/inquiry" element={<PrivateRoute><InquiryPage /></PrivateRoute>} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/notices" element={<NoticePage />} />
            <Route path="/catch-posts" element={<CatchPostPage />} />
            <Route path="/free-posts" element={<FreePostPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <Footer />
          <TermsReconsentModal />
          <AgeConsentModal />
        </NicknameGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}
