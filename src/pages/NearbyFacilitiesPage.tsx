import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EMPTY_POI_MAP,
  POI_KINDS,
  fetchPoiDetail,
  fetchPoiMap,
  poiKind,
  type PoiBounds,
  type PoiDetail,
  type PoiMapData,
} from '../api/poiApi';
import MapTypeControl from '../components/map/MapTypeControl';
import MyLocationControl from '../components/map/MyLocationControl';
import DistanceMeasureControl, {
  type DistanceMeasureApi,
} from '../components/map/DistanceMeasureControl';
import styles from './MapPage.module.css';
import local from './NearbyFacilitiesPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 숫자 뱃지를 클릭하면 이만큼 당긴다. 카카오 level 은 작을수록 확대다. */
const CLUSTER_ZOOM_STEP = 3;

function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).kakao?.maps) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 종류별 색 핀. 색만 바뀌므로 세 개를 미리 만들어 재사용한다. */
function pinUrl(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 24 14 24S28 24.5 28 14C28 6.268 21.732 0 14 0z" fill="${color}" stroke="#ffffff" stroke-width="1.8"/>
    <circle cx="14" cy="14" r="5" fill="#ffffff"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

/* ── 상세 말풍선 ───────────────────────────────────────────────────────────── */

/**
 * 종류마다 보여 줄 값이 다르다. 없는 값은 칩을 아예 만들지 않는다 —
 * "정보 없음" 칩을 늘어놓으면 쓸 수 있는 정보가 묻힌다.
 */
function detailChips(d: PoiDetail): string[] {
  const a = d.attrs as Record<string, any>;
  const out: string[] = [];

  if (d.kind === 0) {
    const detail = a.openDetail as string | undefined;
    const hours = a.openHours as string | undefined;
    if (detail) out.push(detail);
    else if (hours) out.push(hours);
    if (a.diaper === true) out.push('기저귀교환대');
    const accessible = Number(a.accessible ?? 0);
    if (accessible > 0) out.push(`장애인용 ${accessible}칸`);
    if (a.bell === true) out.push('비상벨');
    if (a.cctv === true) out.push('CCTV');
    if (a.category) out.push(String(a.category));
  } else if (d.kind === 1) {
    // 원본에 없는 요일 = 그날 휴무. 단, hours 가 통째로 비어 있으면 "안 낸 것"이지
    // "쉬는 것"이 아니다 — 25,437곳 중 74곳(0.3%)이 그렇다. 둘을 같이 "오늘 휴무"로
    // 묶으면 실제로 문 연 약국을 지나치게 된다.
    // 채움률: 월~금 99.4~99.7% · 토 91.1% · 일 21.1% · 공휴일 24.7%
    const hours = (a.hours ?? {}) as Record<string, unknown>;
    if (Object.keys(hours).length === 0) {
      out.push('영업시간 정보 없음');
    } else {
      const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const today = hours[keys[(new Date().getDay() + 6) % 7]];
      out.push(Array.isArray(today) && today.length >= 2 ? `오늘 ${today[0]}~${today[1]}` : '오늘 휴무');
    }
    if (a.herbal === true) out.push('한약국');
  } else {
    if (a.owner) out.push(String(a.owner));
    if (a.type) out.push(`${a.type}주차장`);
    // 원본 필드는 주차구획수(= 주차장법의 "면")인데 일상어가 아니다.
    // 묻는 건 몇 대 댈 수 있냐는 것이므로 "대"로 쓴다.
    const slots = Number(a.slots ?? 0);
    if (slots > 0) out.push(`${slots}대`);
    if (a.h24 === true) {
      out.push('24시간');
    } else {
      const weekday = (a.hours ?? {}).weekday;
      if (Array.isArray(weekday) && weekday.length >= 2) {
        out.push(`평일 ${weekday[0]}~${weekday[1]}`);
      }
    }
    if (a.fee) out.push(String(a.fee));
  }
  return out;
}

function footerText(d: PoiDetail): string {
  const asOf = d.asOfDate ? `${d.asOfDate} 기준 · ` : '';
  if (d.kind === 0) return `행정안전부 공중화장실정보 · ${asOf}개방시간은 현장과 다를 수 있습니다`;
  if (d.kind === 1) return '국립중앙의료원 약국정보 · 영업시간은 현장과 다를 수 있습니다';
  return `전국주차장정보표준데이터 · ${asOf}요금·운영시간은 현장과 다를 수 있습니다`;
}

function detailHtml(d: PoiDetail): string {
  const kind = poiKind(d.kind);
  const address = d.roadAddr ?? d.lotAddr ?? '';
  const chips = detailChips(d)
    .map(
      t =>
        `<span style="display:inline-block;padding:4px 8px;margin:0 4px 4px 0;border-radius:6px;background:#f8faff;border:1px solid #f1f5f9;font-size:11.5px;font-weight:600;color:#0f172a;">${escapeHtml(t)}</span>`,
    )
    .join('');

  // 공영 주차장은 주차장법상 주차 외 용도로 쓸 수 없다. 사용자가 가장 먼저 묻는
  // 항목이라 칩에 섞지 않고 경고로 따로 띄운다.
  const camping =
    d.kind === 2 && (d.attrs as Record<string, unknown>).camping === 'PROHIBITED'
      ? `<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);font-size:11px;font-weight:600;line-height:1.45;color:#ef4444;">
           차박·취침 금지${(d.attrs as Record<string, string>).campingBasis ? `<br/>${escapeHtml((d.attrs as Record<string, string>).campingBasis)}` : ''}
         </div>`
      : '';

  const phone = d.phone
    ? `<div style="margin-top:8px;font-size:12.5px;font-weight:600;color:#0f172a;">☎ ${escapeHtml(d.phone)}</div>`
    : '';

  const directions =
    d.lat != null && d.lon != null
      ? `<a href="https://map.kakao.com/link/to/${encodeURIComponent(d.name)},${d.lat},${d.lon}"
            target="_blank" rel="noopener noreferrer"
            style="display:block;margin-top:10px;padding:9px 0;border:1px solid #bfd3ec;border-radius:8px;text-align:center;font-size:13px;font-weight:700;color:#0f172a;text-decoration:none;">길찾기</a>`
      : '';

  return `
    <div style="padding:13px 15px;width:272px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;">
      <strong style="display:block;font-size:14.5px;font-weight:800;color:${kind.color};">${escapeHtml(d.name)}</strong>
      <div style="margin:3px 0 9px;font-size:11.5px;line-height:1.4;color:#64748b;">${escapeHtml(address)}</div>
      <div>${chips}</div>
      ${phone}
      ${camping}
      ${directions}
      <div style="margin-top:11px;padding-top:9px;border-top:1px solid #f1f5f9;font-size:10.5px;line-height:1.45;color:#94a3b8;">${escapeHtml(footerText(d))}</div>
    </div>`;
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

/**
 * "주변 편의시설" — 화장실 · 주차장 · 약국을 한 지도에 올린다.
 *
 * 전국 55,860건이라 통째로 받을 수 없다. 지도가 멈출 때마다 보이는 범위만 서버에
 * 물어보고, 넓게 보고 있으면 서버가 "이 동네에 34곳" 식의 숫자 뱃지를 준다.
 * 확대하면 개별 핀으로 바뀐다 — 그 판단은 배율이 아니라 범위의 폭으로, 서버가 한다.
 */
export default function NearbyFacilitiesPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [mapForControl, setMapForControl] = useState<any>(null);
  const [data, setData] = useState<PoiMapData>(EMPTY_POI_MAP);
  // 한 번에 한 종류만 본다. 겹치면 뱃지 색이 섞여 숫자의 의미가 사라진다.
  const [kind, setKind] = useState<number>(0);

  /* 거리 재기 — 측정 중에는 핀 클릭도 점 찍기로 넘긴다 */
  const measureRef = useRef<DistanceMeasureApi | null>(null);

  const mapObjRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  const pinImagesRef = useRef<Record<number, any>>({});

  /** 토글이 바뀌면 지도를 다시 만들지 않고 같은 범위를 다시 받는다. */
  const reloadRef = useRef<(() => void) | null>(null);
  /** 토글 effect 의 첫 실행은 건너뛴다 — 최초 적재는 지도 준비 쪽이 이미 한다. */
  const kindSettled = useRef(false);
  /** 늦게 도착한 응답으로 화면을 덮지 않기 위한 순번. */
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** kind 를 effect 의 의존성으로 넣으면 지도를 다시 만든다 — ref 로 읽는다. */
  const kindRef = useRef(kind);
  kindRef.current = kind;

  const clearDrawn = useCallback(() => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    infoRef.current?.close();
  }, []);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    loadKakaoSDK(appKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const kakao = (window as any).kakao;

        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });
          mapObjRef.current = map;
          setMapForControl(map);

          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(map.getCenter());
          });

          POI_KINDS.forEach(k => {
            pinImagesRef.current[k.code] = new kakao.maps.MarkerImage(
              pinUrl(k.color),
              new kakao.maps.Size(28, 38),
              { offset: new kakao.maps.Point(14, 37) },
            );
          });
          infoRef.current = new kakao.maps.InfoWindow({ removable: true });

          const draw = (next: PoiMapData) => {
            clearDrawn();

            if (next.isCluster) {
              next.clusters.forEach(c => {
                const size = c.count < 10 ? 40 : c.count < 100 ? 46 : 52;
                const el = document.createElement('div');
                el.className = local.cluster;
                el.style.width = `${size}px`;
                el.style.height = `${size}px`;
                el.style.background = poiKind(c.kind).color;
                el.style.fontSize = c.count < 100 ? '14px' : '12.5px';
                el.textContent = c.count > 999 ? '999+' : String(c.count);
                el.title = `${poiKind(c.kind).label} 등 ${c.count}곳 — 클릭하면 확대`;
                el.addEventListener('click', () => {
                  map.setLevel(Math.max(map.getLevel() - CLUSTER_ZOOM_STEP, 1), {
                    anchor: new kakao.maps.LatLng(c.lat, c.lng),
                  });
                });

                const overlay = new kakao.maps.CustomOverlay({
                  map,
                  position: new kakao.maps.LatLng(c.lat, c.lng),
                  content: el,
                  yAnchor: 0,
                  xAnchor: 0,
                  clickable: true,
                });
                overlaysRef.current.push(overlay);
              });
              return;
            }

            next.pins.forEach(p => {
              const position = new kakao.maps.LatLng(p.lat, p.lng);
              const marker = new kakao.maps.Marker({
                map,
                position,
                title: p.name,
                image: pinImagesRef.current[p.kind],
              });
              kakao.maps.event.addListener(marker, 'click', () => {
                // 측정 중이면 핀 클릭이 곧 점 찍기다 — 카카오는 마커를 누르면
                // 지도 click 을 쏘지 않으므로 여기서 가로채야 한다.
                if (measureRef.current?.isMeasuring()) {
                  measureRef.current.addLatLng(position);
                  return;
                }
                // 이름은 이미 있으니 먼저 띄우고, 상세가 오면 내용만 갈아 끼운다.
                infoRef.current.setContent(
                  `<div style="padding:13px 15px;width:272px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;">
                     <strong style="font-size:14.5px;font-weight:800;color:${poiKind(p.kind).color};">${escapeHtml(p.name)}</strong>
                     <div style="margin-top:6px;font-size:11.5px;color:#94a3b8;">불러오는 중...</div>
                   </div>`,
                );
                infoRef.current.open(map, marker);
                fetchPoiDetail(p.id)
                  .then(detail => infoRef.current.setContent(detailHtml(detail)))
                  .catch(() =>
                    infoRef.current.setContent(
                      `<div style="padding:13px 15px;width:272px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;">
                         <strong style="font-size:14.5px;font-weight:800;color:#0f172a;">${escapeHtml(p.name)}</strong>
                         <div style="margin-top:6px;font-size:11.5px;color:#64748b;">상세 정보를 불러오지 못했습니다.</div>
                       </div>`,
                    ),
                  );
              });
              markersRef.current.push(marker);
            });
          };

          const reload = () => {
            const b = map.getBounds();
            const sw = b.getSouthWest();
            const ne = b.getNorthEast();
            const bounds: PoiBounds = {
              minLat: sw.getLat(),
              minLng: sw.getLng(),
              maxLat: ne.getLat(),
              maxLng: ne.getLng(),
            };

            // 지도를 빠르게 움직이면 요청이 순서를 바꿔 도착해 예전 결과가 나중에
            // 덮어쓴다. 직전 요청은 끊고, 그래도 늦게 온 응답은 일련번호로 버린다.
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            const seq = ++seqRef.current;

            fetchPoiMap(bounds, kindRef.current, controller.signal)
              .then(next => {
                if (cancelled || seq !== seqRef.current) return;
                draw(next);
                setData(next);
                setStatus('ready');
              })
              .catch(() => {
                if (cancelled || seq !== seqRef.current) return;
                // 한 번 실패해도 지도는 계속 쓸 수 있어야 한다. 이미 그려진
                // 마커를 지우지 않는 쪽이 통째로 비는 것보다 낫다.
                setStatus('ready');
              });
          };

          reloadRef.current = reload;

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
        setErrorMsg('지도를 불러오지 못했습니다: ' + err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
      clearDrawn();
    };
  }, [clearDrawn]);

  useEffect(() => {
    // 최초 1회는 지도 준비 직후의 reload() 가 이미 받아 왔다. 여기서 또 부르면
    // 같은 범위를 두 번 요청한다.
    if (!kindSettled.current) {
      kindSettled.current = true;
      return;
    }
    reloadRef.current?.();
  }, [kind]);

  const label = poiKind(kind).label;
  const hint = (() => {
    if (status !== 'ready') return null;
    if (data.isCluster) {
      if (data.clusters.length === 0) return `이 범위에는 등록된 ${label}이 없습니다.`;
      return `숫자는 그 지역의 ${label} 개수입니다. 확대하면 하나씩 표시됩니다.`;
    }
    if (data.pins.length === 0) return `이 범위에는 등록된 ${label}이 없습니다.`;
    return null;
  })();

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
        <h1 className={styles.title}>주변 편의시설</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        종류를 하나 골라 봅니다. 핀을 클릭하면 개방시간·면수 같은 상세가 열립니다
      </p>

      {status !== 'ready' && (
        <div className={styles.overlay}>
          {status === 'loading' ? (
            <>
              <div className={styles.spinner} />
              <p>불러오는 중...</p>
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

        <div className={local.kindBar}>
          {POI_KINDS.map(k => {
            const on = k.code === kind;
            return (
              <button
                key={k.code}
                type="button"
                aria-pressed={on}
                onClick={() => setKind(k.code)}
                className={`${local.kindChip} ${on ? local.kindChipOn : ''}`}
                style={on ? { background: k.color } : undefined}
              >
                <span className={local.kindDot} style={!on ? { background: k.color } : undefined} />
                {k.label}
              </button>
            );
          })}
        </div>

        {hint && <div className={local.hintBanner}>{hint}</div>}

        <MapTypeControl map={mapForControl} />
        <MyLocationControl map={mapForControl} />
        <DistanceMeasureControl map={mapForControl} apiRef={measureRef} />
      </div>
    </div>
  );
}
