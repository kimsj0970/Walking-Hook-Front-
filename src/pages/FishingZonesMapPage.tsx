import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchFishingZones, type FishingZone } from '../api/fishingZoneApi';
import MapTypeControl from '../components/map/MapTypeControl';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFishingZones(kakao: any, map: any, zones: FishingZone[]) {
  zones.forEach((zone) => {
    try {
      const parsed = JSON.parse(zone.geoJson);
      const ring: [number, number][] = parsed.coordinates[0];
      const path = ring.slice(0, -1).map(([lng, lat]: [number, number]) =>
        new kakao.maps.LatLng(lat, lng)
      );
      const color = zone.zoneType === 'PROHIBITED' ? '#DC2626' : '#EA580C';
      const poly = new kakao.maps.Polygon({
        map,
        path,
        strokeWeight: 2,
        strokeColor: color,
        strokeOpacity: 0.9,
        fillColor: color,
        fillOpacity: 0.2,
      });
      const infoWindow = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:12px 16px;width:220px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;word-break:keep-all;overflow-wrap:break-word;white-space:normal;">
            <strong style="font-size:14px;color:${color};display:block;">${escapeHtml(zone.name)}</strong>
            <div style="font-size:11px;color:#94A3B8;margin:3px 0 6px;">${zone.zoneType === 'PROHIBITED' ? '🔴 낚시금지구역' : '🟠 낚시제한구역'}</div>
            ${zone.description ? `<p style="font-size:12px;color:#334155;margin:0;line-height:1.5;">${escapeHtml(zone.description)}</p>` : ''}
          </div>`,
        removable: true,
      });
      kakao.maps.event.addListener(poly, 'click', (e: { latLng: unknown }) => {
        infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
      });
    } catch {
      // GeoJSON 파싱 실패 시 무시
    }
  });
}

export default function FishingZonesMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);

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
      fetchFishingZones().catch(() => [] as FishingZone[]),
    ])
      .then(([, zones]) => {
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

          renderFishingZones(kakao, map, zones);
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
        <h1 className={styles.title}>낚시금지구역</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        구역을 클릭하면 상세가 표시됩니다 · <span style={{ color: '#DC2626' }}>■</span> 낚시금지구역{' '}
        <span style={{ color: '#EA580C' }}>■</span> 낚시제한구역
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
    </div>
  );
}
