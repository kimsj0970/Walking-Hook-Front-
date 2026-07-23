// Google Analytics 4 (gtag.js) 연동.
// 측정 ID가 없거나 프로덕션 빌드가 아니면 스크립트를 아예 로드하지 않는다.
// 로컬 개발·프리뷰 트래픽이 통계를 오염시키는 것을 막기 위함이다.

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const enabled = import.meta.env.PROD && !!MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** gtag.js 스크립트를 주입하고 초기화한다. 앱 진입점에서 1회만 호출한다. */
export function initAnalytics() {
  if (!enabled || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  // GA 공식 스니펫은 arguments 객체를 그대로 push 한다(배열로 바꾸면 파싱되지 않는다).
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // SPA라 최초 1회 자동 page_view 를 끄고 라우트 변경마다 직접 보낸다(중복 방지).
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

/** 라우트 변경 시 page_view 를 전송한다. */
export function trackPageView(path: string) {
  if (!enabled) return;
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * GA User-ID 를 설정한다. 앱(Flutter)에서도 동일한 사용자 PK를 넣어야
 * 웹·앱을 오간 사용자가 GA4에서 한 명으로 합쳐진다.
 * 로그아웃 시 null 을 넘겨 해제한다.
 */
export function setAnalyticsUserId(userId: string | null) {
  if (!enabled) return;
  window.gtag?.('set', { user_id: userId });
}

/** 커스텀 이벤트 전송(예: AI 분석 요청, 게시글 작성). */
export function trackEvent(name: string, params?: Record<string, unknown>) {
  if (!enabled) return;
  window.gtag?.('event', name, params);
}
