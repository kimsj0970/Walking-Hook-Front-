import { useEffect, useRef, useState } from 'react';
import styles from './MyLocationControl.module.css';

/**
 * 지도 오른쪽 아래 "현위치" 버튼 (조준경 모양).
 *
 * 위치는 이 브라우저 안에서 지도 표시에만 쓴다. 서버·로그·분석 도구로 절대 보내지 않는다.
 * 위치정보법상 위치기반서비스사업 신고 대상에서 벗어나는 전제가 이것이고,
 * 개인정보처리방침(PrivacyPage)에도 그렇게 적혀 있다. 좌표를 다른 곳으로 넘기는
 * 코드를 추가하면 그 전제가 깨진다.
 *
 * 권한은 브라우저가 직접 묻는다. 우리 쪽 동의 창은 두지 않는다(2026-10-19 결정).
 * 한 번 차단하면 브라우저는 다시 묻지 않으므로 그때는 자물쇠 안내만 띄운다.
 */

/** 확대 목표 — 레벨 4 ≈ 휴대폰 화면 폭 약 1km. 방파제와 금지구역 경계가 같이 보인다. */
const TARGET_LEVEL = 4;
const TOAST_MS = 3500;

type Status = 'idle' | 'locating' | 'shown';

interface MyLocationControlProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any;
}

const MSG = {
  denied: '위치 권한이 없어서 내 위치를 표시할 수 없어요.',
  blocked: '위치가 차단되어 있어요. 주소창 왼쪽 자물쇠 아이콘을 눌러 위치를 허용해 주세요.',
  failed: '현재 위치를 찾지 못했어요. 잠시 후 다시 시도해 주세요.',
  unsupported: '이 브라우저에서는 위치를 사용할 수 없어요.',
};

async function isBlocked(): Promise<boolean> {
  try {
    const result = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    return result?.state === 'denied';
  } catch {
    return false;
  }
}

export default function MyLocationControl({ map }: MyLocationControlProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [toast, setToast] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overlayRef = useRef<{ dot: any; circle: any } | null>(null);
  const toastTimer = useRef<number | null>(null);
  const busy = useRef(false);

  const showToast = (text: string) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  };

  // 지도가 바뀌거나 화면을 떠나면 내 위치 표시를 지운다.
  useEffect(() => {
    return () => {
      overlayRef.current?.dot.setMap(null);
      overlayRef.current?.circle.setMap(null);
      overlayRef.current = null;
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [map]);

  if (!map) return null;

  const draw = (lat: number, lng: number, accuracy: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;
    const pos = new kakao.maps.LatLng(lat, lng);

    if (!overlayRef.current) {
      const el = document.createElement('div');
      el.className = styles.dot;
      el.setAttribute('aria-label', '내 위치');
      const dot = new kakao.maps.CustomOverlay({ position: pos, content: el, zIndex: 10, yAnchor: 0.5, xAnchor: 0.5 });
      const circle = new kakao.maps.Circle({
        center: pos,
        radius: accuracy,
        strokeWeight: 1,
        strokeColor: '#1D4FBF',
        strokeOpacity: 0.35,
        fillColor: '#1D4FBF',
        fillOpacity: 0.12,
        zIndex: 9,
      });
      dot.setMap(map);
      circle.setMap(map);
      overlayRef.current = { dot, circle };
    } else {
      overlayRef.current.dot.setPosition(pos);
      overlayRef.current.circle.setPosition(pos);
      overlayRef.current.circle.setRadius(accuracy);
    }

    // 이미 더 확대해 둔 상태면 축소하지 않고 위치만 옮긴다.
    if (map.getLevel() > TARGET_LEVEL) {
      map.setLevel(TARGET_LEVEL, { anchor: pos, animate: { duration: 300 } });
    }
    map.panTo(pos);
  };

  const handleClick = () => {
    if (busy.current) return;
    if (!('geolocation' in navigator) || !window.isSecureContext) {
      showToast(MSG.unsupported);
      return;
    }
    busy.current = true;
    setStatus('locating');

    navigator.geolocation.getCurrentPosition(
      (p) => {
        busy.current = false;
        // 정확도 원이 화면을 덮지 않게 상한을 둔다.
        draw(p.coords.latitude, p.coords.longitude, Math.min(Math.max(p.coords.accuracy, 10), 2000));
        setStatus('shown');
      },
      async (err) => {
        busy.current = false;
        setStatus(overlayRef.current ? 'shown' : 'idle');
        if (err.code === err.PERMISSION_DENIED) {
          showToast((await isBlocked()) ? MSG.blocked : MSG.denied);
        } else {
          showToast(MSG.failed);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  return (
    <>
      {toast && (
        <div className={styles.toast} role="status">
          {toast}
        </div>
      )}
      <button
        type="button"
        className={`${styles.btn} ${status !== 'idle' ? styles.active : ''} ${status === 'locating' ? styles.locating : ''}`}
        onClick={handleClick}
        aria-label="현위치 보기"
        title="현위치 보기"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>
    </>
  );
}
