import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCctvList, type CctvMarker } from '../api/cctvApi';
import MapTypeControl from '../components/map/MapTypeControl';
import ImageLightbox from '../components/common/ImageLightbox';
import styles from './MapPage.module.css';

function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// CCTV 바이올렛 핀 (기존 AdminMapPage makePinUrl 패턴).
function makePinUrl(color: string, stroke: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function cctvInfoHtml(cam: CctvMarker): string {
  const caption = cam.capturedAt
    ? `${escapeHtml(cam.capturedAt)} 기준 · 10분 단위 갱신`
    : '10분 단위 갱신';
  const body = cam.imageUrl
    ? `<img src="${escapeHtml(cam.imageUrl)}" alt="${escapeHtml(cam.displayName)} CCTV"
         onclick="window.__openCctvImage('${encodeURIComponent(cam.imageUrl).replace(/'/g, '%27')}')"
         title="클릭하면 확대"
         style="display:block;width:100%;height:158px;object-fit:cover;border-radius:8px;background:#F8FAFF;cursor:zoom-in;" />`
    : `<div style="width:100%;height:158px;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#F8FAFF;color:#94A3B8;font-size:12.5px;">이미지 준비 중입니다</div>`;
  return `
    <div style="padding:12px 14px;width:280px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;">
      <strong style="font-size:14px;color:#7C3AED;display:block;">📹 ${escapeHtml(cam.displayName)}</strong>
      <div style="font-size:11px;color:#64748B;margin:3px 0 8px;">${caption}</div>
      ${body}
    </div>`;
}

export default function CctvMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // InfoWindow 이미지(<img onclick>)에서 호출하는 전역 핸들러 — 클릭 시 라이트박스로 확대.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__openCctvImage = (encoded: string) => {
      try { setLightboxUrl(decodeURIComponent(encoded)); } catch { /* 잘못된 값 무시 */ }
    };
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__openCctvImage;
    };
  }, []);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    // 지도 SDK와 CCTV 목록을 각각 로드. 목록 실패는 삼키지 않고 화면에 드러낸다.
    Promise.all([
      loadKakaoSDK(appKey),
      fetchCctvList(),
    ])
      .then(([, cameras]) => {
        if (cancelled || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });
          setMapForControl(map);

          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(map.getCenter());
          });

          const pinImage = new kakao.maps.MarkerImage(
            makePinUrl('#7C3AED', '#6D28D9'),
            new kakao.maps.Size(28, 38),
          );

          cameras.forEach((cam: CctvMarker) => {
            const position = new kakao.maps.LatLng(cam.latitude, cam.longitude);
            const marker = new kakao.maps.Marker({ map, position, image: pinImage });
            const infoWindow = new kakao.maps.InfoWindow({
              content: cctvInfoHtml(cam),
              removable: true,
            });
            kakao.maps.event.addListener(marker, 'click', () => {
              infoWindow.open(map, marker);
            });
          });

          if (cameras.length === 0) {
            setErrorMsg('표시할 CCTV가 없습니다. (서버에서 목록을 받지 못했어요)');
            setStatus('error');
            return;
          }
          setStatus('ready');
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg('CCTV 목록을 불러오지 못했습니다: ' + err.message);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [navigate]);

  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate(-1);
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleClose}>
          ✕ 닫기
        </button>
        <h1 className={styles.title}>실시간 CCTV</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        📹 마커를 클릭하면 주요 항만의 CCTV 화면(10분 단위 갱신)을 볼 수 있습니다
      </p>

      {status !== 'ready' && (
        <div className={styles.overlay}>
          {status === 'loading' ? (
            <>
              <div className={styles.spinner} />
              <p>지도를 불러오는 중...</p>
            </>
          ) : (
            <>
              <p className={styles.errorText}>⚠️ {errorMsg}</p>
              <button className={styles.retryBtn} onClick={handleClose}>
                닫기
              </button>
            </>
          )}
        </div>
      )}

      <div className={styles.mapWrapper}>
        <div ref={mapRef} className={styles.map} />
        <MapTypeControl map={mapForControl} />
      </div>

      {lightboxUrl && (
        <ImageLightbox
          images={[lightboxUrl]}
          index={0}
          onClose={() => setLightboxUrl(null)}
          onPrev={() => {}}
          onNext={() => {}}
        />
      )}
    </div>
  );
}
