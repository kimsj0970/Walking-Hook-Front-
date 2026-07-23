import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPublicFishingPointsForMap, type FishingPointMapMarker } from '../api/fishingPointApi';
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

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedName, setSelectedName] = useState('');
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
          setMapForControl(map);

          // 생성 시점에 컨테이너 레이아웃이 아직 확정되지 않으면 지도 타일이
          // 실제 크기보다 작게 잡혀 아래쪽이 빈 칸으로 보이는 문제가 있어 보정한다.
          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(map.getCenter());
          });

          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });

          // 마우스 오버 시 이름만 표시하는 공유 InfoWindow
          const hoverInfoWindow = new kakao.maps.InfoWindow({ removable: false });

          const markers = fishingPoints.map((fp: FishingPointMapMarker) => {
            const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
            const marker = new kakao.maps.Marker({ position });

            kakao.maps.event.addListener(marker, 'mouseover', () => {
              hoverInfoWindow.setContent(
                `<div style="padding:5px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">${escapeHtml(fp.name)}</div>`
              );
              hoverInfoWindow.open(map, marker);
            });

            kakao.maps.event.addListener(marker, 'mouseout', () => {
              hoverInfoWindow.close();
            });

            kakao.maps.event.addListener(marker, 'click', () => {
              hoverInfoWindow.close();
              setSelectedName(fp.name);

              // 메인 페이지(부모 창)에 포인트 선택 메시지 전송 후 팝업 닫기
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(
                  { type: 'fishing-point-selected', pointId: fp.id, pointName: fp.name },
                  window.location.origin,
                );
                window.close();
              }
            });

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

  const handleClose = () => {
    // window.open으로 띄운 창(팝업/모바일 새 탭)이면 그대로 닫고,
    // SPA 내부 이동으로 들어온 경우에만 이전 화면으로 돌아간다.
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
        <h1 className={styles.title}>낚시 포인트 지도</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        {selectedName
          ? `✅ "${selectedName}" 선택됨 — 메인 페이지에서 조황 분석을 확인하세요`
          : '📍 마커를 클릭하면 메인 페이지에서 해당 포인트의 조황 분석이 표시됩니다'}
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
