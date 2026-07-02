import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import HomePage from './pages/HomePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import NicknamePage from './pages/NicknamePage';
import MyPage from './pages/MyPage';
import MapPage from './pages/MapPage';
import AdminPage from './pages/admin/AdminPage';
import InquiryPage from './pages/InquiryPage';
import CommunityPage from './pages/CommunityPage';
import NoticePage from './pages/NoticePage';
import FishingPostPage from './pages/FishingPostPage';
import MigratoryPostPage from './pages/MigratoryPostPage';
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
        <NicknameGuard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/oauth/naver/callback" element={<OAuthCallbackPage />} />
            <Route path="/nickname" element={<PrivateRoute><NicknamePage /></PrivateRoute>} />
            <Route path="/my" element={<PrivateRoute><MyPage /></PrivateRoute>} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
            <Route path="/inquiry" element={<PrivateRoute><InquiryPage /></PrivateRoute>} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/notices" element={<NoticePage />} />
            <Route path="/fishing-posts" element={<FishingPostPage />} />
            <Route path="/migratory-posts" element={<MigratoryPostPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
          <Footer />
        </NicknameGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}
