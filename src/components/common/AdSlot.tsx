import { useEffect, useRef } from 'react';
import styles from './AdSlot.module.css';

// Google AdSense 광고 한 칸.
//
// AdMob(앱)과 달리 AdSense 에는 테스트 게시자 ID가 없다. 가짜 ca-pub-... 값을
// 넣어도 아무것도 렌더되지 않고 심사에도 도움이 안 된다. 그래서 승인 전까지는
// 게시자 ID를 비워 두고, 개발 빌드에서만 자리를 확인할 수 있는 플레이스홀더를
// 그린다. 승인 후 .env 에 ID를 채우면 코드 수정 없이 실제 광고가 채워진다.
const CLIENT = import.meta.env.VITE_ADSENSE_CLIENT as string | undefined;
const enabled = !!CLIENT;

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** adsbygoogle.js 를 1회만 주입한다. 광고 슬롯이 처음 마운트될 때 호출한다. */
function ensureScript() {
  if (!enabled) return;
  const id = 'adsbygoogle-js';
  if (document.getElementById(id)) return;

  const s = document.createElement('script');
  s.id = id;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  document.head.appendChild(s);
}

interface Props {
  /** AdSense 광고 슬롯 ID (콘솔에서 광고 단위를 만들면 발급된다). */
  slot?: string;
}

export default function AdSlot({ slot }: Props) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!enabled || !slot || pushed.current) return;
    ensureScript();
    try {
      // 같은 <ins> 에 두 번 push 하면 AdSense 가 콘솔 에러를 뱉으므로 1회로 막는다.
      // React StrictMode 는 개발 중 effect 를 두 번 실행한다.
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // 광고 차단기 등으로 실패해도 페이지 동작에는 영향이 없다.
    }
  }, [slot]);

  // 게시자 ID가 없으면(=승인 전) 프로덕션에서는 아무것도 그리지 않는다.
  // 개발 중에는 레이아웃 확인용 플레이스홀더를 보여 준다.
  if (!enabled || !slot) {
    if (import.meta.env.PROD) return null;
    return (
      <div className={styles.wrap}>
        <div className={styles.label}>광고</div>
        <div className={styles.placeholder}>
          AdSense 미설정 — VITE_ADSENSE_CLIENT / VITE_ADSENSE_SLOT_HOME 을 채우면 실제 광고가 표시됩니다.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.label}>광고</div>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
