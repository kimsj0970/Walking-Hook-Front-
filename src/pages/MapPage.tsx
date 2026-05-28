import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicFishingPointsForMap, type FishingPointMapMarker } from '../api/fishingPointApi';
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

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    Promise.all([
      loadKakaoSDK(appKey),
      fetchPublicFishingPointsForMap().catch(() => [] as FishingPointMapMarker[]),
    ])
      .then(([, fishingPoints]) => {
        if (cancelled || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });

          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });

          const markers = fishingPoints.map((fp: FishingPointMapMarker) => {
            const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
            const marker = new kakao.maps.Marker({ position });

            const infoWindow = new kakao.maps.InfoWindow({
              content: `
                <div style="padding:10px 14px;min-width:160px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">
                  <strong style="font-size:13px;color:#0B3D91">${escapeHtml(fp.name)}</strong>
                  <p style="margin:4px 0 0;font-size:11px;color:#64748B">
                    ${fp.latitude.toFixed(5)}, ${fp.longitude.toFixed(5)}
                  </p>
                </div>`,
              removable: true,
            });
            kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
            return marker;
          });

          clusterer.addMarkers(markers);
          setStatus('ready');
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [navigate]);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>
        <h1 className={styles.title}>낚시 포인트 지도</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        📍 마커를 클릭하면 포인트 이름과 위치를 확인할 수 있습니다
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
              <button className={styles.retryBtn} onClick={() => window.close()}>
                창 닫기
              </button>
            </>
          )}
        </div>
      )}

      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
