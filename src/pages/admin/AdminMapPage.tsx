import { useEffect, useRef, useState } from 'react';
import { fetchAdminMarineStations, fetchAdminBeachStations, type MarineStationMarker, type BeachStationMarker } from '../../api/marineStationApi';
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

function windDegToDir(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function fmt(val: number | null, unit: string, digits = 1): string {
  return val != null ? `${val.toFixed(digits)}${unit}` : '—';
}

function fmtObservedAt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function buildBeachInfoHtml(s: BeachStationMarker): string {
  const hasObs = s.cachedAt != null;
  const noonLabel = s.cachedNoonSeCd === 'AM' ? '오전' : s.cachedNoonSeCd === 'PM' ? '오후' : '';
  const rows = [
    ['최고풍속', fmt(s.maxWspd, 'm/s')],
    ['수온',     fmt(s.avgWtem, '°C')],
    ['최고파고', fmt(s.maxWvhgt, 'm')],
    ['기온',     fmt(s.avgArtmp, '°C')],
  ];
  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:3px 8px 3px 0;font-size:11px;color:#94A3B8;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:3px 0;font-size:12px;color:#1E293B;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`
  ).join('');

  return `
    <div style="padding:12px 16px;min-width:190px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">
      <div style="margin-bottom:8px;">
        <strong style="font-size:14px;color:#15803D;display:block;">${escapeHtml(s.beachName)}</strong>
        <span style="font-size:10px;color:#94A3B8;">${escapeHtml(s.beachCode)}</span>
      </div>
      ${hasObs
        ? `<table style="border-collapse:collapse;width:100%;">${rowsHtml}</table>
           <div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:10px;color:#CBD5E1;">
             예보기준: ${escapeHtml(noonLabel)} (${escapeHtml(fmtObservedAt(s.cachedAt))})
           </div>`
        : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 예보 데이터 없음</p>`
      }
    </div>`;
}

function buildStationInfoHtml(s: import('../../api/marineStationApi').MarineStationMarker): string {
  const hasObs = s.observedAt != null;
  const windDir = s.windDirection != null ? `${windDegToDir(s.windDirection)} (${s.windDirection}°)` : '—';
  const rows = [
    ['파고',     fmt(s.waveHeight, 'm')],
    ['풍속',     fmt(s.windSpeed, 'm/s')],
    ['순간최대', fmt(s.gustWindSpeed, 'm/s')],
    ['풍향',     windDir],
    ['수온',     fmt(s.waterTemp, '°C')],
    ['기온',     fmt(s.airTemp, '°C')],
    ['기압',     fmt(s.pressure, 'hPa', 0)],
    ['습도',     fmt(s.humidity, '%', 0)],
  ];

  const rowsHtml = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:3px 8px 3px 0;font-size:11px;color:#94A3B8;white-space:nowrap;">${escapeHtml(label)}</td>
      <td style="padding:3px 0;font-size:12px;color:#1E293B;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`
  ).join('');

  return `
    <div style="padding:12px 16px;min-width:200px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">
      <div style="margin-bottom:8px;">
        <strong style="font-size:14px;color:#C2185B;display:block;">${escapeHtml(s.stationName)}</strong>
        <span style="font-size:10px;color:#94A3B8;">${escapeHtml(s.stationCode)}</span>
      </div>
      ${hasObs
        ? `<table style="border-collapse:collapse;width:100%;">${rowsHtml}</table>
           <div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:10px;color:#CBD5E1;">
             관측시각: ${escapeHtml(fmtObservedAt(s.observedAt))}
           </div>`
        : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`
      }
    </div>`;
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
      fetchAdminBeachStations().catch(() => [] as BeachStationMarker[]),
    ])
      .then(([, stations, fishingPoints, beachStations]) => {
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
              content: buildStationInfoHtml(s),
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
                    ${escapeHtml(fp.region)} · ${fp.latitude.toFixed(5)}, ${fp.longitude.toFixed(5)}
                  </p>
                </div>`,
              removable: true,
            });
            kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
            return marker;
          });
          clusterer.addMarkers(fpMarkers);

          // ── 해수욕장 관측소 마커 (초록) ───────────────────────
          const beachMarkerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
            <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="#16A34A" stroke="#14532D" stroke-width="1.5"/>
            <circle cx="14" cy="14" r="5" fill="white"/>
          </svg>`;
          const beachMarkerUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(beachMarkerSvg);
          const beachMarkerSize = new kakao.maps.Size(28, 38);

          beachStations.forEach((bs: BeachStationMarker) => {
            const position = new kakao.maps.LatLng(bs.latitude, bs.longitude);
            const marker = new kakao.maps.Marker({
              position,
              image: new kakao.maps.MarkerImage(beachMarkerUrl, beachMarkerSize),
            });
            marker.setMap(map);

            const infoWindow = new kakao.maps.InfoWindow({
              content: buildBeachInfoHtml(bs),
              removable: true,
            });
            kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
          });

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
        <span className={styles.legendGreen}>● 해수욕장관측소</span>
        <span className={styles.legendBlue}>● 낚시 포인트</span>
      </div>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
