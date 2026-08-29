import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './AnchorAdSlot.module.css';

// 화면 하단에 고정되는 배너. 앱(`app_shell.dart` 의 `AdBannerSlot(anchored: true)`)과
// 같은 자리·같은 모양이다. 라우트 바깥에서 렌더되므로 화면을 옮겨도 살아남는다.
//
// ⚠️ 앱과 결정적으로 다른 점 — AdMob 은 어느 화면에 배너가 떠도 무방하지만,
//    AdSense 는 "게시자 콘텐츠가 없는 화면에 게재된 광고"를 별도 위반으로 본다.
//    그래서 여기서는 **본문이 확실히 있는 경로에서만** 렌더한다. 아래 화이트리스트를
//    늘릴 때는 "로그인 없이 열었을 때도 읽을 글이 있는가"를 기준으로 판단할 것.
const AD_PATH_ALLOWLIST = [
  '/guide',
  '/notices',
  '/catch-posts',
  '/free-posts',
  '/community',
];

// 명시적으로 제외 — 지도는 텍스트가 없고, 인증/약관 화면은 광고를 붙일 자리가 아니다.
const AD_PATH_DENYLIST = [
  '/login',
  '/oauth',
  '/map',
  '/nickname',
  '/account-deletion',
  '/admin',
];

const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const SLOT = import.meta.env.VITE_ADSENSE_SLOT_ANCHOR as string | undefined;
const enabled = !!CLIENT && !!SLOT;

function ensureScript() {
  const id = 'adsbygoogle-js';
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

function isAdPath(pathname: string): boolean {
  if (AD_PATH_DENYLIST.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return AD_PATH_ALLOWLIST.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function AnchorAdSlot() {
  const { pathname } = useLocation();
  const show = enabled && isAdPath(pathname);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!show) return;
    // SPA 는 라우트가 바뀌어도 페이지 로드가 일어나지 않는다. 새 경로마다 한 번씩
    // 다시 요청해 줘야 그 화면의 내용에 맞는 광고가 채워진다.
    // 같은 <ins> 에 두 번 push 하면 AdSense 가 에러를 뱉으므로 경로당 1회로 막는다.
    if (pushedFor.current === pathname) return;
    ensureScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedFor.current = pathname;
    } catch {
      // 광고 차단기 등으로 실패해도 화면 동작에는 영향이 없다.
    }
  }, [show, pathname]);

  if (!show) return null;

  return (
    <>
      {/* 고정 배너가 본문 마지막 줄과 푸터를 가리지 않도록 그 높이만큼 자리를 비운다. */}
      <div className={styles.spacer} aria-hidden="true" />
      <div className={styles.bar}>
        <ins
          key={pathname}
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '100%' }}
          data-ad-client={CLIENT}
          data-ad-slot={SLOT}
          data-ad-format="horizontal"
          data-full-width-responsive="true"
        />
      </div>
    </>
  );
}
