import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import HomePage from './pages/HomePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import NicknamePage from './pages/NicknamePage';
import MyPage from './pages/MyPage';
import MapPage from './pages/MapPage';
import AdminPage from './pages/admin/AdminPage';
import InquiryPage from './pages/InquiryPage';
import './App.css';

function NicknameGuard({ children }: { children: ReactNode }) {
  const { needsNickname, isInitializing } = useAuth();
  const { pathname } = useLocation();
  const exempt = pathname === '/nickname' || pathname.startsWith('/oauth');
  if (!isInitializing && needsNickname && !exempt) {
    return <Navigate to="/nickname" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NicknameGuard>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/nickname" element={<PrivateRoute><NicknamePage /></PrivateRoute>} />
            <Route path="/my" element={<PrivateRoute><MyPage /></PrivateRoute>} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
            <Route path="/inquiry" element={<PrivateRoute><InquiryPage /></PrivateRoute>} />
          </Routes>
        </NicknameGuard>
      </BrowserRouter>
    </AuthProvider>
  );
}
