import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useHasAdContent } from './AdContent';
import styles from './AnchorAdSlot.module.css';

// 화면 하단에 고정되는 배너. 앱(`app_shell.dart` 의 `AdBannerSlot(anchored: true)`)과
// 같은 자리·같은 모양이다. 라우트 바깥에서 렌더되므로 화면을 옮겨도 살아남는다.
//
// ⚠️ 앱과 결정적으로 다른 점 — AdMob 은 어느 화면에 배너가 떠도 무방하지만,
//    AdSense 는 "게시자 콘텐츠가 없는 화면에 게재된 광고"를 위반으로 보고
//    **사이트 전체**를 반려한다. 2026-10-13 실제로 이 사유로 반려됐다.
//
// 예전에는 경로 문자열 allowlist 로 막았는데, 접두사 매칭이라 아래가 다 새어 나갔다.
//    /catch-posts/123   게시물 상세는 URL 이 없다(같은 주소의 모달) → 백지 + 광고
//    /free-posts/*, /notices/*, /community/*   위와 동일
//    /guide/없는슬러그   "존재하지 않는 가이드입니다" 한 줄 + 광고
// 경로는 "본문이 있을 것 같다"는 추측일 뿐이다. 그래서 판단을 화면에 넘겼다 —
// 본문을 그린 화면이 useAdContent(true) 로 직접 선언한다(AdContent.tsx).
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

export default function AnchorAdSlot() {
  const { pathname } = useLocation();
  const hasContent = useHasAdContent();
  const show = enabled && hasContent;
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
