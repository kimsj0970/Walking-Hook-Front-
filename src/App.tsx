import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/common/PrivateRoute';
import './App.css';

import HomePage from './pages/HomePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import NicknamePage from './pages/NicknamePage';
import MyPage from './pages/MyPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/nickname" element={<PrivateRoute><NicknamePage /></PrivateRoute>} />
          <Route path="/my" element={<PrivateRoute><MyPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
