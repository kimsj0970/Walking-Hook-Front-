import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EMPTY_MARINE_REDTIDE,
  EMPTY_MARINE_TEMP,
  HARM_STYLE,
  REGION_LABEL,
  TEMP_BANDS,
  TEMP_NODATA,
  fetchMarineRedtide,
  fetchMarineTemp,
  formatCheckedAt,
  formatObservedAt,
  formatReportDate,
  formatWeekDelta,
  pinLayers,
  tempBand,
  type MarineLayer,
  type MarineRedtideData,
  type MarineStation,
  type MarineTempData,
  type RedtideArea,
} from '../api/marineApi';
import MapTypeControl from '../components/map/MapTypeControl';
import MyLocationControl from '../components/map/MyLocationControl';
import styles from './MapPage.module.css';
import local from './MarineMapPage.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** 출처 표기. NIFS Open API 이용약관 제6조 ④ 의무 사항이라 문구를 바꾸지 않는다. */
const SOURCE_TEXT = '"국립수산과학원 OPEN API"를 사용한 결과물';

type LayerKey = 'temp' | 'redtide';

/**
 * 해파리는 뺐다.
 *
 * jellyDetail2 의 권역 출현율(nom/bor/etc_ratio_01~12)이 2025·2026 주간보고
 * 전수에서 0건이다 — 명세는 멀쩡한데 값이 안 들어온다(마지막 2024-05-23).
 * jellyDetail 의 board_context 는 40자짜리 제목 복사본이고 내용은 첨부 PDF 에만
 * 있다. 지도에 그릴 수치가 없어서 "준비 중" 칩으로 두는 것도 거짓말이 된다.
 */
const LAYERS: { key: LayerKey; label: string }[] = [
  { key: 'temp', label: '수온' },
  { key: 'redtide', label: '적조' },
];

/**
 * 적조가 왜 조황을 떨어뜨리는지.
 *
 * 종마다가 아니라 "유해종 적조"에 공통으로 해당하는 내용이라 한 벌만 둔다.
 * 클릭 유도는 질문으로 한다 — 「코클로디니움」을 누르라고 하면 안 누른다.
 */
const WHY_LINES = [
  ['점액질이 호흡을 막습니다.', '아가미를 덮어 질식시킵니다.'],
  ['자연산은 해역을 벗어납니다.', '자리를 옮겨서 안 물립니다.'],
  ['먹이생물도 빠집니다.', '포식 어종도 따라 나갑니다.'],
  ['물이 탁해집니다.', '루어 대상어에 불리합니다.'],
];

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

function hasDeepLayer(s: MarineStation): boolean {
  return s.middle != null || s.bottom != null;
}

function tempRange(a: RedtideArea): string {
  if (a.minWaterTemp == null && a.maxWaterTemp == null) return '';
  if (a.minWaterTemp == null) return `${a.maxWaterTemp}℃`;
  if (a.maxWaterTemp == null) return `${a.minWaterTemp}℃`;
  return a.minWaterTemp === a.maxWaterTemp
    ? `${a.minWaterTemp}℃`
    : `${a.minWaterTemp}~${a.maxWaterTemp}℃`;
}

/* ── 말풍선 ────────────────────────────────────────────────────────────────── */

function layerRow(name: string, l: MarineLayer | null): string {
  if (!l) return '';
  const depth = l.depth != null ? `${l.depth}m` : '';
  const delta = formatWeekDelta(l.weekDelta);
  return `
    <div style="display:flex;align-items:baseline;gap:8px;padding:7px 0;border-top:1px solid #f1f5f9;">
      <span style="flex:0 0 42px;font-size:11.5px;font-weight:700;color:#52514e;">${escapeHtml(name)}</span>
      <span style="flex:0 0 34px;font-size:10.5px;color:#898781;">${escapeHtml(depth)}</span>
      <strong style="font-size:15px;font-weight:800;color:#0b0b0b;">${l.temp}<span style="font-size:11px;font-weight:600;">℃</span></strong>
      ${delta ? `<span style="margin-left:auto;font-size:11px;font-weight:700;color:${delta.color};">${escapeHtml(delta.text)}</span>` : ''}
    </div>`;
}

function stationHtml(s: MarineStation): string {
  const lead = pinLayers(s).top?.layer ?? null;
  const region = REGION_LABEL[s.region] ?? s.region;

  const rows =
    layerRow('표층', s.surface) + layerRow('중층', s.middle) + layerRow('저층', s.bottom);

  // 점검 중과 "층을 아예 안 재는 곳"은 다른 상태다. 같은 빈칸으로 보여 주면
  // 사용자가 고장으로 읽는다.
  const body = s.maintenance
    ? `<div style="margin-top:8px;padding:9px 11px;border-radius:9px;background:#fdf1e3;font-size:11.5px;line-height:1.5;color:#7a5520;">
         점검 중인 관측소입니다. 점검이 끝나면 값이 다시 들어옵니다.
       </div>`
    // 점검과 다른 상태다. 점검은 "곧 돌아온다", 이쪽은 "멈춘 지 오래됐다"이고
    // 언제부터인지를 같이 말해 줘야 사용자가 기다릴지 말지 판단한다.
    : s.stale
    ? `<div style="margin-top:8px;padding:9px 11px;border-radius:9px;background:#f4f7f8;font-size:11.5px;line-height:1.5;color:#52514e;">
         마지막 관측이 <strong>${escapeHtml(formatObservedAt(s.lastObservedAt ?? ''))}</strong>입니다.
         그 뒤로 값이 갱신되지 않아 수온을 띄우지 않습니다.
       </div>`
    : rows ||
      `<div style="margin-top:8px;font-size:11.5px;color:#64748b;">받아 온 값이 없습니다.</div>`;

  const stamp = lead
    ? `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:10.5px;line-height:1.5;color:#898781;">
         ${escapeHtml(formatObservedAt(lead.observedAt))} 관측<br>${escapeHtml(SOURCE_TEXT)}
       </div>`
    : `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #f1f5f9;font-size:10.5px;color:#898781;">${escapeHtml(SOURCE_TEXT)}</div>`;

  return `
    <div style="padding:13px 15px;width:286px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;">
      <strong style="display:block;font-size:14.5px;font-weight:800;color:#0b0b0b;">${escapeHtml(s.name)}</strong>
      <div style="margin:3px 0 7px;font-size:11.5px;color:#64748b;">
        ${escapeHtml(region)}${hasDeepLayer(s) ? ' · 중층·저층까지 관측' : ' · 표층만 관측'}
      </div>
      ${body}
      ${stamp}
    </div>`;
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

/**
 * "해양 정보" — 수온 · 적조 · 해파리를 지도 한 장에 올린다.
 *
 * 레이어마다 마크 모양이 다르다. 수온은 관측소 점, 적조는 발생 격자 면이다.
 * 같은 모양으로 그리면 두 레이어가 겹쳐 보일 때 뜻이 섞인다.
 *
 * 응답은 서버 메모리 스냅샷에서 즉시 나온다. 우리 요청이 NIFS 호출을 기다리는
 * 구간이 없다.
 */
export default function MarineMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 키가 없는 건 렌더 시점에 이미 아는 사실이다. effect 안에서 setState 로
  // 알리면 한 프레임 멀쩡한 화면을 보여 준 뒤 에러로 덮는 꼴이 된다.
  const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;

  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(
    appKey ? 'loading' : 'error',
  );
  const [errorMsg, setErrorMsg] = useState(
    appKey ? '' : '.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.',
  );
  const [mapForControl, setMapForControl] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const [layer, setLayer] = useState<LayerKey>('temp');

  const [temp, setTemp] = useState<MarineTempData>(EMPTY_MARINE_TEMP);
  const [redtide, setRedtide] = useState<MarineRedtideData>(EMPTY_MARINE_REDTIDE);
  /**
   * 레이어를 바꿀 때 전체 화면 스피너로 덮지 않는다. 패널 안에서만 알린다.
   *
   * 로딩을 상태로 들지 않고 "지금 보고 싶은 것"과 "마지막으로 받아 온 것"의
   * 차이로 계산한다 — effect 안에서 setState 를 때리면 렌더가 한 번 더 돈다.
   */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);

  const layerLoading = loadedKey !== layer;

  const mapObjRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const infoRef = useRef<any>(null);
  /** 늦게 도착한 응답으로 화면을 덮지 않기 위한 순번. */
  const seqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const clearDrawn = useCallback(() => {
    overlaysRef.current.forEach(o => o.setMap(null));
    overlaysRef.current = [];
    infoRef.current?.close();
  }, []);

  /* 지도 만들기 — 한 번만. */
  useEffect(() => {
    if (!appKey) return;

    let cancelled = false;

    loadKakaoSDK(appKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        const kakao = (window as any).kakao;

        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.2, 128.4),
            level: 13,
          });
          mapObjRef.current = map;
          setMapForControl(map);
          infoRef.current = new kakao.maps.InfoWindow({ removable: true });

          requestAnimationFrame(() => {
            map.relayout();
            map.setCenter(map.getCenter());
          });

          setMapReady(true);
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg('지도를 불러오지 못했습니다: ' + err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      abortRef.current?.abort();
      clearDrawn();
    };
  }, [appKey, clearDrawn]);

  /* 값 받기 — 레이어나 수층 필터가 바뀔 때마다. */
  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    const job =
      layer === 'temp'
        ? fetchMarineTemp(false, controller.signal).then(next => {
            if (seq !== seqRef.current) return;
            setTemp(next);
          })
        : fetchMarineRedtide(controller.signal).then(next => {
            if (seq !== seqRef.current) return;
            setRedtide(next);
          });

    job
      .then(() => {
        if (seq !== seqRef.current) return;
        setStatus('ready');
        setLoadedKey(layer);
      })
      .catch(() => {
        if (seq !== seqRef.current) return;
        // 이미 그려진 것을 지우지 않는다 — 통째로 비는 것보다 낫다.
        setStatus(prev => (prev === 'loading' ? 'error' : prev));
        setErrorMsg('해양 정보를 불러오지 못했습니다. 잠시 뒤에 다시 시도해 주세요.');
        // 실패해도 "불러오는 중"에서 빠져나와야 한다 — 영영 스피너로 남지 않게.
        setLoadedKey(layer);
      });

    return () => controller.abort();
  }, [layer]);

  /* 그리기 — 지도와 값이 둘 다 준비됐을 때. */
  useEffect(() => {
    if (!mapReady || !mapObjRef.current) return;
    const kakao = (window as any).kakao;
    const map = mapObjRef.current;

    clearDrawn();

    if (layer === 'temp') {
      temp.stations.forEach(s => {
        const { top, second } = pinLayers(s);
        // 점검 중이면 층 값이 비어 있다. 값이 없는 것과 섞이지 않게 글자로 말한다.
        const dual = !s.maintenance && top != null && second != null;
        const band = s.maintenance || !top ? TEMP_NODATA : tempBand(top.layer.temp);
        const region = REGION_LABEL[s.region] ?? s.region;

        const el = document.createElement('div');
        el.style.background = band.fill;
        el.style.color = band.ink;

        if (dual) {
          el.className = `${local.pin} ${local.pinDual}`;
          const a = document.createElement('span');
          a.className = local.pinTop;
          a.textContent = String(top.layer.temp);
          const line = document.createElement('span');
          line.className = local.pinDivider;
          const b = document.createElement('span');
          b.className = local.pinBottom;
          const tag = document.createElement('span');
          tag.className = local.pinTag;
          tag.textContent = second.tag;
          b.append(tag, document.createTextNode(String(second.layer.temp)));
          el.append(a, line, b);
          el.title =
            `${s.name} (${region}) 표층 ${top.layer.temp}℃ · ` +
            `${second.tag === '저' ? '저층' : '중층'} ${second.layer.temp}℃ — 클릭하면 수층별로`;
        } else {
          const text = s.maintenance ? '점검' : s.stale ? '멈춤' : top ? String(top.layer.temp) : '—';
          el.className = `${local.pin} ${text.length > 4 ? local.pinSmall : ''}`;
          el.textContent = text;
          el.title = top
            ? `${s.name} (${region}) ${top.layer.temp}℃`
            : s.stale
              ? `${s.name} (${region}) — ${formatObservedAt(s.lastObservedAt ?? '')} 이후 갱신 없음`
              : `${s.name} (${region})`;
        }
        el.addEventListener('click', () => {
          infoRef.current.setContent(stationHtml(s));
          infoRef.current.setPosition(new kakao.maps.LatLng(s.lat, s.lon));
          infoRef.current.open(map);
        });

        overlaysRef.current.push(
          new kakao.maps.CustomOverlay({
            map,
            position: new kakao.maps.LatLng(s.lat, s.lon),
            content: el,
            yAnchor: 0,
            xAnchor: 0,
            clickable: true,
          }),
        );
      });
      return;
    }

    if (layer === 'redtide') {
      // 격자 칸이 서로 붙어 있어 테두리를 그리면 내부 격자선이 다 보인다.
      // 테를 지우고 면만 칠하면 붙은 칸들이 한 덩어리로 읽힌다.
      //
      // Rectangle 대신 Polygon 을 쓴다 — 금지구역·포인트 화면이 전부 Polygon 이라
      // 같은 API 로 맞춰 두면 동작이 갈릴 자리가 없다.
      redtide.areas.forEach(a => {
        const style = HARM_STYLE[a.harm] ?? HARM_STYLE.UNKNOWN;
        a.cells.forEach(c => {
          overlaysRef.current.push(
            new kakao.maps.Polygon({
              map,
              path: [
                new kakao.maps.LatLng(c.minLat, c.minLon),
                new kakao.maps.LatLng(c.minLat, c.maxLon),
                new kakao.maps.LatLng(c.maxLat, c.maxLon),
                new kakao.maps.LatLng(c.maxLat, c.minLon),
              ],
              strokeWeight: 0,
              fillColor: style.fill,
              fillOpacity: 0.45,
            }),
          );
        });
      });
    }
  }, [mapReady, layer, temp, redtide, clearDrawn]);

  /** 목록에서 해역을 누르면 그 격자로 지도를 옮긴다. */
  const focusArea = (a: RedtideArea) => {
    const kakao = (window as any).kakao;
    const map = mapObjRef.current;
    if (!map || a.cells.length === 0) return;

    const b = new kakao.maps.LatLngBounds();
    a.cells.forEach(c => {
      b.extend(new kakao.maps.LatLng(c.minLat, c.minLon));
      b.extend(new kakao.maps.LatLng(c.maxLat, c.maxLon));
    });
    map.setBounds(b);
  };

  const handleClose = () => {
    if (window.opener && !window.opener.closed) {
      window.close();
      return;
    }
    navigate(-1);
  };

  const hasHarmful = redtide.areas.some(a => a.harm === 'HARMFUL');

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleClose}>
          ✕ 닫기
        </button>
        <h1 className={styles.title}>해양 정보</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        {layer === 'temp'
          ? '국립수산과학원 실시간 관측소의 수온입니다. 숫자가 둘인 핀은 아래 층까지 재는 곳입니다'
          : '최근 30일 안에 적조 속보가 나온 해역입니다. 색칠된 칸이 발생 격자입니다'}
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

        <div className={local.layerBar}>
          {LAYERS.map(l => {
            const on = l.key === layer;
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                onClick={() => setLayer(l.key)}
                className={`${local.layerChip} ${on ? local.layerChipOn : ''}`}
              >
                {l.label}
              </button>
            );
          })}
        </div>

        {layer === 'temp' && !layerLoading && !temp.loaded && (
          <div className={local.sidePanel}>
            <div className={local.panelTitle}>지금은 알 수 없음</div>
            <div className={local.panelEmpty}>
              관측소 정보를 불러오지 못했습니다. 관측소가 없다는 뜻이 아닙니다 — 국립수산과학원
              쪽 응답을 기다리는 중이거나 일시적으로 끊긴 상태입니다.
            </div>
          </div>
        )}

        {layer === 'temp' && (
          <div className={local.legend}>
            <div className={local.legendTitle}>표층 수온</div>
            {TEMP_BANDS.map(b => (
              <div key={b.label} className={local.legendRow}>
                <span className={local.legendSwatch} style={{ background: b.fill }} />
                {b.label}
              </div>
            ))}
            <div className={local.legendRow}>
              <span className={local.legendSwatch} style={{ background: TEMP_NODATA.fill }} />
              점검 중 · 멈춤
            </div>
            <div className={local.legendNote}>
              숫자가 둘인 핀은 아래 층까지 잽니다. 누르면 표층·중층·저층을 다 봅니다
            </div>
          </div>
        )}

        {layer === 'redtide' && (
          <>
            <div className={local.legend}>
              <div className={local.legendTitle}>원인생물</div>
              {(['HARMFUL', 'UNKNOWN', 'HARMLESS'] as const).map(k => (
                <div key={k} className={local.legendRow}>
                  <span className={local.legendSwatch} style={{ background: HARM_STYLE[k].fill }} />
                  {HARM_STYLE[k].label}
                </div>
              ))}
              <div className={local.legendNote}>
                예비주의보·주의보·경보 단계는 표시하지 않습니다. 발령은 밀도와 규모를 함께 보고
                국립수산과학원이 정합니다
              </div>
            </div>

            <div className={local.sidePanel}>
              <div className={local.panelTitle}>
                {layerLoading
                  ? '불러오는 중...'
                  : !redtide.loaded
                    ? '지금은 알 수 없음'
                    : redtide.areaCount > 0
                      ? `발생 해역 ${redtide.areaCount}곳 · ${formatReportDate(redtide.lastReportDate)} 속보`
                      : '적조 없음'}
              </div>

              {/* 언제 기준으로 그렇다는 말인지 밝힌다. 특히 "적조 없음"은
                  확인 시각이 없으면 아무 말도 아니다. */}
              {!layerLoading && redtide.loaded && redtide.checkedAt && (
                <div className={local.checkedAt}>
                  {formatCheckedAt(redtide.checkedAt)} 확인
                </div>
              )}

              {/* "없음"과 "모름"을 같은 문구로 보여 주면 NIFS 가 죽은 동안
                  화면이 "적조 없음"이라고 거짓말한다. 적조철엔 위험한 오보다. */}
              {!layerLoading && !redtide.loaded && (
                <div className={local.panelEmpty}>
                  적조 정보를 불러오지 못했습니다. 적조가 없다는 뜻이 아닙니다 — 국립수산과학원
                  쪽 응답을 기다리는 중이거나 일시적으로 끊긴 상태입니다.
                </div>
              )}

              {!layerLoading && redtide.loaded && redtide.areaCount === 0 && (
                <div className={local.panelEmpty}>
                  최근 30일 안에 나온 적조 속보가 없습니다. 적조는 주로 3월부터 10월까지 발생하고,
                  예찰은 월 1회 + 발생 시 속보로 이뤄집니다.
                </div>
              )}

              {redtide.areas.map(a => {
                const style = HARM_STYLE[a.harm] ?? HARM_STYLE.UNKNOWN;
                const range = tempRange(a);
                return (
                  <button
                    key={`${a.codNews}-${a.sea}`}
                    type="button"
                    className={local.areaItem}
                    onClick={() => focusArea(a)}
                    title={a.cells.length ? '지도에서 보기' : '발생 격자를 못 받아 이동할 수 없습니다'}
                  >
                    <div className={local.areaHead}>
                      <span
                        className={local.harmBadge}
                        style={{ background: style.fill, color: style.ink }}
                      >
                        {style.label}
                      </span>
                      <span className={local.areaSea}>{a.sea}</span>
                    </div>
                    <div className={local.areaMeta}>
                      {a.species}
                      {range && ` · ${range}`}
                      {` · ${formatReportDate(a.reportDate)} 속보`}
                    </div>
                    {a.cells.length === 0 && (
                      <div className={local.noCells}>발생 격자를 받지 못했습니다</div>
                    )}
                  </button>
                );
              })}

              {hasHarmful && (
                <div className={local.why}>
                  <button
                    type="button"
                    className={local.whyHead}
                    aria-expanded={whyOpen}
                    onClick={() => setWhyOpen(v => !v)}
                  >
                    왜 조황이 떨어지나요?
                    <span style={{ marginLeft: 'auto' }}>{whyOpen ? '▲' : '▼'}</span>
                  </button>
                  {whyOpen && (
                    <div className={local.whyBody}>
                      <strong>고기가 죽어서가 아닙니다.</strong> 네 가지가 겹칩니다.
                      {WHY_LINES.map(([head, tail], i) => (
                        <div key={head} className={local.whyRow}>
                          <span className={local.whyNum}>{i + 1}</span>
                          <span>
                            <strong>{head}</strong> {tail}
                          </span>
                        </div>
                      ))}
                      <div className={local.whyNote}>
                        코클로디니움은 낮에는 표층 4m 안쪽에, 밤에는 저층까지 고르게 퍼집니다.
                        깊이 내린다고 피할 수 있는 게 아니고, 밤낚시가 오히려 불리할 수 있습니다.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className={local.source}>{SOURCE_TEXT}</div>

        <MapTypeControl map={mapForControl} />
        <MyLocationControl map={mapForControl} />
      </div>
    </div>
  );
}
