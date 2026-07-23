import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '../../lib/analytics';

// SPA는 라우트가 바뀌어도 문서가 다시 로드되지 않아 GA 자동 page_view 가 최초 1회만 잡힌다.
// 경로가 바뀔 때마다 직접 page_view 를 보낸다.
export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    trackPageView(pathname + search);
  }, [pathname, search]);

  return null;
}
