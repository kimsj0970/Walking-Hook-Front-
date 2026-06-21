import { useEffect, useRef, useState } from 'react';
import {
  fetchAdminMarineStations, fetchAdminBeachStations,
  fetchAdminKhoaTwStations, fetchAdminAwsStations, fetchAdminNifsStations,
  fetchAdminNmpntStations,
  type MarineStationMarker, type BeachStationMarker,
  type KhoaTwStationMarker, type AwsStationMarker, type NifsStationMarker,
  type NmpntStationMarker,
} from '../../api/marineStationApi';
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

function typeColor(stationType: string): string {
  switch (stationType) {
    case 'KMA_BUOY':  return '#C2185B';
    case 'KMA_BEACH': return '#16A34A';
    case 'KHOA_TW':   return '#0891B2';
    case 'AWS':       return '#EA580C';
    case 'NIFS':      return '#7C3AED';
    case 'NMPNT':     return '#D97706';
    default:          return '#64748B';
  }
}

function typeLabel(stationType: string): string {
  switch (stationType) {
    case 'KMA_BUOY':  return 'KMA 해양부이';
    case 'KMA_BEACH': return 'KMA 해수욕장';
    case 'KHOA_TW':   return 'KHOA 연안수온';
    case 'AWS':       return 'KMA AWS';
    case 'NIFS':      return 'NIFS 수산과학원';
    case 'NMPNT':     return 'NMPNT 등대·등부표';
    default:          return stationType;
  }
}

function makePinUrl(color: string, stroke: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="${stroke}" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="white"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function infoHeader(name: string, code: string, stationType: string): string {
  const color = typeColor(stationType);
  const label = typeLabel(stationType);
  return `
    <div style="margin-bottom:8px;">
      <strong style="font-size:14px;color:${color};display:block;">${escapeHtml(name)}</strong>
      <div style="display:flex;align-items:center;gap:6px;margin-top:3px;">
        <span style="font-size:10px;color:#94A3B8;">${escapeHtml(code)}</span>
        <span style="font-size:10px;font-weight:600;color:${color};background:${color}18;padding:1px 6px;border-radius:4px;">${escapeHtml(label)}</span>
      </div>
    </div>`;
}

function buildRows(rows: [string, string][]): string {
  return `<table style="border-collapse:collapse;width:100%;">` +
    rows.map(([label, value]) =>
      `<tr>
        <td style="padding:3px 8px 3px 0;font-size:11px;color:#94A3B8;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:3px 0;font-size:12px;color:#1E293B;font-weight:600;">${escapeHtml(value)}</td>
      </tr>`
    ).join('') + `</table>`;
}

function buildObsFooter(observedAt: string | null): string {
  return `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:10px;color:#CBD5E1;">
    관측시각: ${escapeHtml(fmtObservedAt(observedAt))}
  </div>`;
}

function wrapInfoHtml(content: string): string {
  return `<div style="padding:12px 16px;min-width:200px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">${content}</div>`;
}

function buildMarineInfoHtml(s: MarineStationMarker): string {
  const windDir = s.windDirection != null ? `${windDegToDir(s.windDirection)} (${s.windDirection}°)` : '—';
  const rows: [string, string][] = [
    ['파고',     fmt(s.waveHeight, 'm')],
    ['풍속',     fmt(s.windSpeed, 'm/s')],
    ['순간최대', fmt(s.gustWindSpeed, 'm/s')],
    ['풍향',     windDir],
    ['수온',     fmt(s.waterTemp, '°C')],
    ['기온',     fmt(s.airTemp, '°C')],
    ['기압',     fmt(s.pressure, 'hPa', 0)],
    ['습도',     fmt(s.humidity, '%', 0)],
  ];
  return wrapInfoHtml(
    infoHeader(s.stationName, s.stationCode, s.stationType) +
    (s.observedAt ? buildRows(rows) + buildObsFooter(s.observedAt) : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`)
  );
}

function buildBeachInfoHtml(s: BeachStationMarker): string {
  const noonLabel = s.cachedNoonSeCd === 'AM' ? '오전' : s.cachedNoonSeCd === 'PM' ? '오후' : '';
  const rows: [string, string][] = [
    ['최고풍속', fmt(s.maxWspd, 'm/s')],
    ['수온',     fmt(s.avgWtem, '°C')],
    ['최고파고', fmt(s.maxWvhgt, 'm')],
    ['기온',     fmt(s.avgArtmp, '°C')],
  ];
  const footer = s.cachedAt
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid #E2E8F0;font-size:10px;color:#CBD5E1;">
        예보기준: ${escapeHtml(noonLabel)} (${escapeHtml(fmtObservedAt(s.cachedAt))})
      </div>`
    : '';
  return wrapInfoHtml(
    infoHeader(s.beachName, s.beachCode, s.stationType) +
    (s.cachedAt ? buildRows(rows) + footer : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 예보 데이터 없음</p>`)
  );
}

function buildKhoaTwInfoHtml(s: KhoaTwStationMarker): string {
  const windDir = s.windDirection != null ? `${windDegToDir(s.windDirection)} (${s.windDirection}°)` : '—';
  const rows: [string, string][] = [
    ['기온',     fmt(s.airTemp, '°C')],
    ['수온',     fmt(s.waterTemp, '°C')],
    ['파고',     fmt(s.waveHeight, 'm')],
    ['파주기',   fmt(s.wavePeriod, 's')],
    ['풍속',     fmt(s.windSpeed, 'm/s')],
    ['순간최대', fmt(s.gustWindSpeed, 'm/s')],
    ['풍향',     windDir],
    ['유속',     fmt(s.currentSpeed, 'm/s')],
    ['염분',     fmt(s.salinity, 'psu')],
  ];
  return wrapInfoHtml(
    infoHeader(s.stationName, s.obsCode, s.stationType) +
    (s.observedAt ? buildRows(rows) + buildObsFooter(s.observedAt) : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`)
  );
}

function buildAwsInfoHtml(s: AwsStationMarker): string {
  const windDir = s.windDirection != null ? `${windDegToDir(s.windDirection)} (${s.windDirection}°)` : '—';
  const rows: [string, string][] = [
    ['기온',     fmt(s.temperature, '°C')],
    ['풍속',     fmt(s.windSpeed, 'm/s')],
    ['풍향',     windDir],
    ['강수1h',   fmt(s.precipitation1h, 'mm')],
  ];
  return wrapInfoHtml(
    infoHeader(s.stnName, `stn ${s.stnId}`, s.stationType) +
    (s.observedAt ? buildRows(rows) + buildObsFooter(s.observedAt) : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`)
  );
}

function buildNmpntInfoHtml(s: NmpntStationMarker): string {
  const windDir = s.windDirection != null ? `${windDegToDir(s.windDirection)} (${s.windDirection}°)` : '—';
  const rows: [string, string][] = [
    ['풍속',   fmt(s.windSpeed, 'm/s')],
    ['풍향',   windDir],
    ['기온',   fmt(s.airTemp, '°C')],
    ['수온',   s.waterTemp != null ? fmt(s.waterTemp, '°C') : '지원하지 않음'],
    ['파고',   '지원하지 않음'],
  ];
  return wrapInfoHtml(
    infoHeader(s.stationName, s.mmsiCode, s.stationType) +
    (s.observedAt ? buildRows(rows) + buildObsFooter(s.observedAt) : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`)
  );
}

function buildNifsInfoHtml(s: NifsStationMarker): string {
  const rows: [string, string][] = [
    ['수온', fmt(s.waterTemp, '°C')],
  ];
  return wrapInfoHtml(
    infoHeader(s.staNamKor, s.staCde, s.stationType) +
    (s.observedAt ? buildRows(rows) + buildObsFooter(s.observedAt) : `<p style="font-size:12px;color:#94A3B8;margin:4px 0 0;">아직 관측 데이터 없음</p>`)
  );
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
      fetchAdminKhoaTwStations().catch(() => [] as KhoaTwStationMarker[]),
      fetchAdminAwsStations().catch(() => [] as AwsStationMarker[]),
      fetchAdminNifsStations().catch(() => [] as NifsStationMarker[]),
      fetchAdminNmpntStations().catch(() => [] as NmpntStationMarker[]),
    ])
      .then(([, marineStations, fishingPoints, beachStations, khoaTwStations, awsStations, nifsStations, nmpntStations]) => {
        if (cancelled || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });

          const markerSize = new kakao.maps.Size(28, 38);

          function addMarker<T extends { latitude: number; longitude: number }>(
            station: T,
            pinUrl: string,
            infoHtml: string,
          ) {
            const position = new kakao.maps.LatLng(station.latitude, station.longitude);
            const marker = new kakao.maps.Marker({
              position,
              image: new kakao.maps.MarkerImage(pinUrl, markerSize),
            });
            marker.setMap(map);
            const infoWindow = new kakao.maps.InfoWindow({ content: infoHtml, removable: true });
            kakao.maps.event.addListener(marker, 'click', () => infoWindow.open(map, marker));
          }

          // ── KMA 해양부이 (핑크) ───────────────────────────────
          const marinePinUrl = makePinUrl('#C2185B', '#880E4F');
          marineStations.forEach((s: MarineStationMarker) =>
            addMarker(s, marinePinUrl, buildMarineInfoHtml(s))
          );

          // ── KMA 해수욕장 (초록) ───────────────────────────────
          const beachPinUrl = makePinUrl('#16A34A', '#14532D');
          beachStations.forEach((bs: BeachStationMarker) =>
            addMarker(bs, beachPinUrl, buildBeachInfoHtml(bs))
          );

          // ── KHOA 연안수온 (청록) ──────────────────────────────
          const khoaPinUrl = makePinUrl('#0891B2', '#164E63');
          khoaTwStations.forEach((s: KhoaTwStationMarker) =>
            addMarker(s, khoaPinUrl, buildKhoaTwInfoHtml(s))
          );

          // ── KMA AWS (주황) ────────────────────────────────────
          const awsPinUrl = makePinUrl('#EA580C', '#7C2D12');
          awsStations.forEach((s: AwsStationMarker) =>
            addMarker(s, awsPinUrl, buildAwsInfoHtml(s))
          );

          // ── NIFS 수산과학원 (보라) ────────────────────────────
          const nifsPinUrl = makePinUrl('#7C3AED', '#4C1D95');
          nifsStations.forEach((s: NifsStationMarker) =>
            addMarker(s, nifsPinUrl, buildNifsInfoHtml(s))
          );

          // ── NMPNT 등대·등부표 (황색) ─────────────────────────
          const nmpntPinUrl = makePinUrl('#D97706', '#92400E');
          nmpntStations.forEach((s: NmpntStationMarker) =>
            addMarker(s, nmpntPinUrl, buildNmpntInfoHtml(s))
          );

          // ── 낚시 포인트 (파란색) + 클러스터 ──────────────────
          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });
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
        <span className={styles.legendPink}>● KMA 해양부이</span>
        <span className={styles.legendGreen}>● KMA 해수욕장</span>
        <span className={styles.legendCyan}>● KHOA 연안수온</span>
        <span className={styles.legendOrange}>● KMA AWS</span>
        <span className={styles.legendPurple}>● NIFS 수산과학원</span>
        <span className={styles.legendAmber}>● NMPNT 등대·등부표</span>
        <span className={styles.legendBlue}>● 낚시 포인트</span>
      </div>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
