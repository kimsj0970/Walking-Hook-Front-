import { useEffect, useRef, useState } from 'react';
import { fetchAdminMarineStations, type MarineStationMarker } from '../../api/marineStationApi';
import { searchFishingPoints, type FishingPointSummary } from '../../api/fishingPointApi';
import styles from './AdminMapPage.module.css';

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

export default function AdminMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
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
      fetchAdminMarineStations().catch(() => [] as MarineStationMarker[]),
      searchFishingPoints().catch(() => [] as FishingPointSummary[]),
    ])
      .then(([, stations, fishingPoints]) => {
        if (cancelled || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });

          // ── 클러스터러 ────────────────────────────────────────
          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });

          // ── 관측소 마커 (핑크) ────────────────────────────────
          stations.forEach((s: MarineStationMarker) => {
            const position = new kakao.maps.LatLng(s.latitude, s.longitude);
            const marker = new kakao.maps.Marker({
              position,
              image: new kakao.maps.MarkerImage(
                'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
                new kakao.maps.Size(31, 35),
              ),
            });
            marker.setMap(map);

            const infoWindow = new kakao.maps.InfoWindow({
              content: `
                <div style="padding:10px 14px;min-width:160px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">
                  <strong style="font-size:13px;color:#C2185B">${escapeHtml(s.stationName)}</strong>
                  <p style="margin:4px 0 0;font-size:11px;color:#64748B">
                    ${s.latitude.toFixed(5)}, ${s.longitude.toFixed(5)}
                  </p>
                </div>`,
              removable: true,
            });
            kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
          });

          // ── 낚시 포인트 마커 (파란색) + 클러스터 ─────────────
          const fpMarkers = fishingPoints.map((fp: FishingPointSummary) => {
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
          clusterer.addMarkers(fpMarkers);

          setStatus('ready');
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles.mapWrap}>
      {status !== 'ready' && (
        <div className={styles.overlay}>
          {status === 'loading' ? (
            <>
              <div className={styles.spinner} />
              <p>지도를 불러오는 중...</p>
            </>
          ) : (
            <p className={styles.errorText}>⚠️ {errorMsg}</p>
          )}
        </div>
      )}
      <div className={styles.legend}>
        <span className={styles.legendPink}>● 해양관측소</span>
        <span className={styles.legendBlue}>● 낚시 포인트</span>
      </div>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
