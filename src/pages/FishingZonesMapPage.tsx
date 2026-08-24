import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchFishingZones,
  ZONE_TYPE_COLOR,
  ZONE_TYPE_LABEL,
  type FishingZone,
  type ZoneBounds,
} from '../api/fishingZoneApi';
import MapTypeControl from '../components/map/MapTypeControl';
import styles from './MapPage.module.css';

/**
 * 어장이 서버에서 빠지는 기준. 백엔드 FishingZoneService 의 값과 반드시 같아야 한다.
 *
 * <p>배율(level)로 판단하면 안 된다. 같은 level 이라도 창 크기에 따라 실제로 보이는
 * 범위가 달라져서, 어장이 나오는데도 "확대하세요"라고 뜨거나 그 반대가 된다.
 * 서버가 보는 것과 똑같이 격자로 스냅한 범위의 폭으로 판단한다.
 */
const CACHE_GRID_DEG = 0.1;
const FISHERY_MAX_SPAN_DEG = 1.0;

/** 서버와 같은 방식으로 바깥쪽 스냅한 범위가 어장을 받을 만큼 좁은지 */
function fisheryIncluded(b: ZoneBounds): boolean {
  const snap = (lo: number, hi: number) =>
    Math.ceil(hi / CACHE_GRID_DEG) * CACHE_GRID_DEG - Math.floor(lo / CACHE_GRID_DEG) * CACHE_GRID_DEG;
  return snap(b.minLat, b.maxLat) <= FISHERY_MAX_SPAN_DEG
      && snap(b.minLng, b.maxLng) <= FISHERY_MAX_SPAN_DEG;
}

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

/**
 * 설명 한 줄에서 화면에 쓸 조각(법령·근거·과태료)을 갈라낸다.
 *
 * <p>시드가 `A · B · C` 로 이어 붙인 한 문장이라 여기서 나눠야 한다.
 * 원래는 근거·과태료가 각각 컬럼이어야 맞지만 지금은 설명 안에 들어 있어 이렇게 읽는다.
 * 못 찾은 조각은 그 줄만 비운다 — 하나 실패했다고 전체가 안 보이면 안 된다.
 */
function parseZoneInfo(desc: string | null): { law: string; basis: string; fine: string } {
  if (!desc) return { law: '', basis: '', fine: '' };

  const raw = desc.split(' · ').map((t) => t.replace(/\*\*/g, '').trim()).filter(Boolean);

  // 하천법 과태료는 "과태료(1차 100만원 · 2차 200만원 · 3차 이상 300만원)" 처럼
  // 괄호 안에 구분자가 또 들어 있다. 괄호가 닫힐 때까지 도로 붙인다.
  const parts: string[] = [];
  for (const t of raw) {
    const prev = parts[parts.length - 1];
    const open = prev !== undefined
      && (prev.split('(').length - prev.split(')').length) > 0;
    if (open) parts[parts.length - 1] += ' · ' + t;
    else parts.push(t);
  }

  const law = parts[0] ?? '';
  const fine = parts.find((t) => t.includes('과태료')) ?? '';
  const found =
    parts.find((t) => t.startsWith('근거'))?.replace(/^근거\s*/, '')
    ?? parts.find((t) => /(고시|공고)\s*제/.test(t))
    ?? '';

  // 근거 조각 뒤에 설명이 길게 이어지는 시드가 있다. 문서번호까지만 남긴다.
  const basis = found.match(/^.*?(?:고시|공고)\s*제[^호]*호(?:\s*\([^)]*\))?/)?.[0] ?? found;

  return { law, basis, fine };
}

/** 인포윈도우 한 줄. 값이 없으면 자리를 비우지 않고 '-' 로 둔다. */
function infoRow(label: string, value: string): string {
  const shown = value || '-';
  return `<div style="display:flex;gap:10px;align-items:flex-start;margin-top:8px;">
      <span style="width:40px;flex-shrink:0;font-size:11px;color:#94A3B8;line-height:1.5;">${label}</span>
      <span style="flex:1;font-size:12px;color:${value ? '#334155' : '#CBD5E1'};line-height:1.5;">${escapeHtml(shown)}</span>
    </div>`;
}

const BADGE: Record<string, string> = {
  PROHIBITED: '🔴 낚시금지구역',
  RESTRICTED: '🟠 낚시제한구역',
  FISHERY: '🟡 어업권 설정 수면',
};

/**
 * 한 프레임에 만들 폴리곤 수.
 *
 * 수백 개를 한 번에 만들면 그동안 메인 스레드가 멈춰 화면이 통째로 굳는다.
 * 나눠 넣으면 총 시간은 비슷해도 구역이 순차적으로 채워져 체감이 전혀 다르다.
 */
const RENDER_CHUNK = 40;

/** 지도에 올라간 카카오 Polygon. InfoWindow 는 화면 전체에서 하나만 쓴다. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ZonePolygon = any;

/**
 * 클릭한 구역의 인포윈도우 HTML.
 *
 * <p>예전에는 이 문자열과 InfoWindow 객체를 <b>구역을 그릴 때마다 미리</b> 만들었다.
 * InfoWindow 는 DOM 을 만드는 무거운 객체라, 화면에 구역이 수백 개면 숨겨진 DOM 트리가
 * 그만큼 생겼고 그게 첫 로딩을 초 단위로 잡아먹었다. 이제 클릭한 순간에만 만든다
 * (설명 파싱도 여기서만 돈다).
 */
function buildInfoContent(zone: FishingZone): string {
  const color = ZONE_TYPE_COLOR[zone.zoneType] ?? '#64748B';
  const fishery = zone.zoneType === 'FISHERY';
  const { basis, fine } = parseZoneInfo(zone.description);
  return `
    <div style="padding:14px 16px;width:252px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;word-break:keep-all;overflow-wrap:break-word;white-space:normal;">
      <strong style="font-size:14px;color:${color};display:block;line-height:1.4;">${escapeHtml(zone.name)}</strong>
      <div style="font-size:11px;color:#94A3B8;margin:3px 0 2px;">${BADGE[zone.zoneType] ?? escapeHtml(ZONE_TYPE_LABEL[zone.zoneType] ?? '')}</div>
      ${infoRow('근거', basis)}
      ${infoRow('과태료', fine)}
      ${fishery ? '<p style="font-size:11px;color:#B45309;margin:10px 0 0;line-height:1.45;">낚시금지 고시 구역은 아닙니다. 다만 어업권이 설정된 수면이라 양식 시설물·어구가 있어 진입 시 분쟁이 생길 수 있습니다.</p>' : ''}
      <p style="font-size:11px;color:#94A3B8;margin:10px 0 0;padding-top:9px;border-top:1px solid #F1F5F9;line-height:1.5;">실제 규제 범위와 효력은 관할기관 고시 원문을 기준으로 합니다.</p>
    </div>`;
}

/**
 * 구역 하나를 폴리곤으로 그린다. 실패하면 null.
 *
 * <p>GeoJSON 링은 첫 줄이 외곽, 나머지가 구멍이다. 카카오 Polygon 은 path 에
 * 배열의 배열을 주면 구멍으로 처리하므로, 구멍이 있을 때만 그 형태로 넘긴다.
 * 링 마지막 점은 첫 점과 같은 닫는 점이라 빼고 넘긴다.
 *
 * <p>어장은 z 순서를 낮춰 금지·제한구역 아래에 깐다. 겹치는 곳에서 노란 어장이
 * 빨간 금지구역을 덮으면 법적으로 중요한 쪽이 안 보인다.
 */
function createPolygon(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kakao: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any,
  zone: FishingZone,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick: (zone: FishingZone, latLng: any) => void,
): ZonePolygon | null {
  try {
    const parsed = JSON.parse(zone.geoJson);
    const rings: [number, number][][] = parsed.coordinates;
    if (!Array.isArray(rings) || rings.length === 0) return null;

    const toPath = (ring: [number, number][]) =>
      ring.slice(0, -1).map(([lng, lat]) => new kakao.maps.LatLng(lat, lng));

    const outer = toPath(rings[0]);
    if (outer.length < 3) return null;
    const path = rings.length > 1 ? rings.map(toPath) : outer;

    const color = ZONE_TYPE_COLOR[zone.zoneType] ?? '#64748B';
    const fishery = zone.zoneType === 'FISHERY';

    const poly = new kakao.maps.Polygon({
      map,
      path,
      zIndex: fishery ? 1 : 2,
      strokeWeight: fishery ? 1 : 2,
      strokeColor: color,
      strokeOpacity: fishery ? 0.7 : 0.9,
      fillColor: color,
      // 어장은 화면에 수백 개가 겹쳐 깔리므로 금지구역보다 옅게 둬야 아래가 보인다.
      fillOpacity: fishery ? 0.15 : 0.2,
    });

    kakao.maps.event.addListener(poly, 'click', (e: { latLng: unknown }) => onClick(zone, e.latLng));

    return poly;
  } catch {
    return null;   // GeoJSON 파싱 실패 시 무시
  }
}

export default function FishingZonesMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [fetching, setFetching] = useState(false);
  const [zoomedOut, setZoomedOut] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);

  const overlaysRef = useRef<Map<string, ZonePolygon>>(new Map());
  const reqSeqRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;
    const overlays = overlaysRef.current;

    loadKakaoSDK(appKey)
      .then(() => {
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

          // 화면 전체에서 InfoWindow 는 이것 하나뿐이다. 클릭할 때 내용만 갈아끼운다.
          const infoWindow = new kakao.maps.InfoWindow({ content: '', removable: true });
          let openZoneId: string | null = null;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const openInfo = (zone: FishingZone, latLng: any) => {
            infoWindow.setContent(buildInfoContent(zone));
            infoWindow.setPosition(latLng);
            infoWindow.open(map);
            openZoneId = zone.id;
          };

          /**
           * 화면에 없는 구역은 지우고 새로 들어온 것만 만든다. 이미 그린 건 손대지 않는다.
           *
           * 새로 만드는 일은 RENDER_CHUNK 개씩 나눠 프레임에 흘린다. 늦게 도착한 응답으로
           * 시작된 작업은 seq 로 걸러 중간에 멈춘다 — 안 그러면 지도를 빠르게 움직일 때
           * 예전 화면의 폴리곤이 계속 올라온다.
           */
          const sync = (zones: FishingZone[], seq: number) => {
            const next = new Set(zones.map(z => z.id));
            overlays.forEach((poly, id) => {
              if (next.has(id)) return;
              if (openZoneId === id) {
                infoWindow.close();
                openZoneId = null;
              }
              poly.setMap(null);
              overlays.delete(id);
            });

            const pending = zones.filter(z => !overlays.has(z.id));
            if (pending.length === 0) return;

            let i = 0;
            const step = () => {
              if (cancelled || seq !== reqSeqRef.current) return;
              const end = Math.min(i + RENDER_CHUNK, pending.length);
              for (; i < end; i++) {
                const poly = createPolygon(kakao, map, pending[i], openInfo);
                if (poly) overlays.set(pending[i].id, poly);
              }
              if (i < pending.length) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          };

          const reload = () => {
            const b = map.getBounds();
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            const bounds: ZoneBounds = {
              minLat: sw.getLat(),
              minLng: sw.getLng(),
              maxLat: ne.getLat(),
              maxLng: ne.getLng(),
            };
            setZoomedOut(!fisheryIncluded(bounds));

            // 지도를 빠르게 움직이면 요청이 순서를 바꿔 도착해 예전 결과가 나중에 덮어쓴다.
            // 직전 요청은 취소하고, 그래도 늦게 온 응답은 일련번호로 버린다.
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            const seq = ++reqSeqRef.current;

            setFetching(true);
            fetchFishingZones(bounds, controller.signal)
              .then(zones => {
                if (cancelled || seq !== reqSeqRef.current) return;
                sync(zones, seq);
                setStatus('ready');
              })
              .catch(() => {
                if (cancelled || seq !== reqSeqRef.current) return;
                setStatus('ready');   // 한 번 실패해도 지도는 계속 쓸 수 있어야 한다
              })
              .finally(() => {
                if (!cancelled && seq === reqSeqRef.current) setFetching(false);
              });
          };

          // idle 은 확대·이동이 끝날 때마다 온다. 연속 조작에서 매번 쏘지 않도록 묶는다.
          kakao.maps.event.addListener(map, 'idle', () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(reload, 300);
          });

          reload();
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      overlays.forEach(poly => poly.setMap(null));
      overlays.clear();
    };
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
        구역을 클릭하면 상세가 표시됩니다 · <span style={{ color: ZONE_TYPE_COLOR.PROHIBITED }}>■</span> 낚시금지구역{' '}
        <span style={{ color: ZONE_TYPE_COLOR.RESTRICTED }}>■</span> 낚시제한구역{' '}
        <span style={{ color: ZONE_TYPE_COLOR.FISHERY }}>■</span> 어장
        {zoomedOut && <span style={{ color: '#94A3B8' }}> · 어장은 확대해야 표시됩니다</span>}
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
        {status === 'ready' && fetching && (
          <div
            style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 5, background: 'rgba(15,23,42,0.78)', color: '#fff',
              fontSize: 12, padding: '5px 12px', borderRadius: 999, pointerEvents: 'none',
            }}
          >
            구역 불러오는 중…
          </div>
        )}
      </div>

      {/*
        표시가 없는 곳을 "낚시해도 되는 곳"으로 읽는 것이 이 화면의 가장 위험한 오해다.
        수집이 끝난 데이터가 아니므로 상시로 한 줄 띄운다.
      */}
      <p className={styles.footerNotice}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
        표시가 없어도 금지일 수 있습니다
      </p>
    </div>
  );
}
