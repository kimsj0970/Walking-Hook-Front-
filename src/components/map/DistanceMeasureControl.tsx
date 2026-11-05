/* eslint-disable @typescript-eslint/no-explicit-any -- 카카오 SDK 는 타입 선언이 없어 any 로 받는다 (MyLocationControl 과 같은 방식) */
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './DistanceMeasureControl.module.css';

/**
 * 지도 거리 재기 — 다중 꼭짓점 폴리라인.
 *
 * 켜면 지도를 누르는 곳마다 점이 찍히고, 점마다 시작점부터의 누적 거리를 띄운다.
 * 해안선·방파제를 따라 꺾어가며 찍을 수 있어 직선 거리와 실제 걷는 거리를 같이 가늠할 수 있다.
 *
 * **우클릭(또는 패널의 `완료`)으로 측정을 끊는다.** 끊으면 커서를 따라오던 점선이 멈추고 끝점이 굳는다.
 * 그 뒤에 지도를 다시 누르면 새 측정이 시작된다(이전 선은 지운다 — 선이 쌓이면 지도가 금방 지저분해진다).
 * 더블클릭으로 끊는 방식은 버렸다. 카카오가 click 뒤에 dblclick 을 쏘기 때문에 점이 하나 더 찍히고
 * 지도까지 확대돼 버린다.
 *
 * ## 마커·구역이 클릭을 먹는 문제
 * 카카오 지도는 마커나 폴리곤을 누르면 지도 `click` 이벤트를 **쏘지 않는다.** 핀이 깔린
 * 포인트 지도나 구역이 화면을 덮는 금지구역 지도에서는 그대로 두면 측정이 사실상 불가능하다.
 * 그래서 이 컨트롤은 `apiRef` 로 조작 손잡이를 내보내고, 각 지도 페이지의 마커·구역 클릭
 * 핸들러가 측정 중일 때 그 좌표를 이쪽으로 넘긴다(아래 사용법). 결과적으로 **핀을 누르면
 * 그 핀 위치에 정확히 점이 찍히는** 스냅 효과가 덤으로 생긴다.
 *
 * ```tsx
 * const measureRef = useRef<DistanceMeasureApi | null>(null);
 * // 마커 클릭 핸들러 맨 위에서
 * if (measureRef.current?.isMeasuring()) { measureRef.current.addLatLng(position); return; }
 * // 렌더
 * <DistanceMeasureControl map={mapForControl} apiRef={measureRef} />
 * ```
 *
 * 위치 정보를 쓰지 않으므로(현위치 버튼과 달리) 권한·법령 고려 사항이 없다.
 */

export interface DistanceMeasureApi {
  /** 지금 측정 모드인가 */
  isMeasuring: () => boolean;
  /** 마커·구역이 가로챈 클릭을 점으로 넘긴다. 측정 중이 아니면 무시한다. */
  addLatLng: (latLng: any) => void;
}

interface DistanceMeasureControlProps {
  map: any;
  /** 마커·구역 클릭을 넘겨받을 손잡이를 담을 ref */
  apiRef?: { current: DistanceMeasureApi | null };
}

type Pt = { lat: number; lng: number };

/** 선 색. 금지구역(빨강·주황·노랑)·CCTV(보라)·현위치(파랑)와 겹치지 않는 분홍으로 고른다. */
const LINE_COLOR = '#DB2777';

/**
 * 두 점 사이 거리 (m).
 *
 * <p>중간 위도에서 1° 의 실제 길이를 WGS84 타원체 근사식으로 구해 평면 피타고라스로 잇는다.
 * 구(球) 하버사인은 우리 위도에서 경도 1° 를 약 0.2% 짧게 본다(0.1° 당 20m) — 10km 를 재면
 * 20m 가 빈다. 반대로 꼭짓점 사이가 수백 km 로 멀어지면 평면 근사 오차가 커지는데,
 * 서울~부산을 한 번에 그어도 324.9km(실측 약 325km)로 0.1% 안쪽이라 이 화면 용도에는 충분하다.
 */
function distanceM(a: Pt, b: Pt): number {
  const rad = Math.PI / 180;
  const phi = ((a.lat + b.lat) / 2) * rad;
  const mPerDegLat =
    111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi) - 0.0023 * Math.cos(6 * phi);
  const mPerDegLng =
    111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi);
  return Math.hypot((b.lng - a.lng) * mPerDegLng, (b.lat - a.lat) * mPerDegLat);
}

/** 1km 미만은 m, 그 위는 km. 10km 넘으면 소수 한 자리면 충분하다. */
function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  const km = m / 1000;
  return `${km < 10 ? km.toFixed(2) : km.toFixed(1)}km`;
}

function totalM(points: Pt[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += distanceM(points[i - 1], points[i]);
  return sum;
}

export default function DistanceMeasureControl({ map, apiRef }: DistanceMeasureControlProps) {
  const [measuring, setMeasuring] = useState(false);
  const [points, setPoints] = useState<Pt[]>([]);
  /** 측정을 끊은 상태. 선은 그대로 두고 커서 점선만 멈춘다. */
  const [finished, setFinished] = useState(false);

  /**
   * 지도 이벤트 핸들러와 바깥 페이지(apiRef)는 렌더와 무관하게 최신 값을 읽어야 해서 ref 로 들고 있다.
   * 렌더 중에 ref 를 쓰면 react-hooks/refs 에 걸리므로 effect 에서 맞춘다 — 핸들러는 렌더 뒤에
   * 사용자 조작으로 불리므로 그때는 이미 최신 값이다.
   */
  const measuringRef = useRef(false);
  const pointsRef = useRef<Pt[]>([]);
  const finishedRef = useRef(false);
  useEffect(() => { measuringRef.current = measuring; }, [measuring]);
  useEffect(() => { pointsRef.current = points; }, [points]);
  useEffect(() => { finishedRef.current = finished; }, [finished]);

  /** 확정된 선·점·라벨 */
  const shapesRef = useRef<any[]>([]);
  /** 마지막 점에서 커서까지 따라오는 점선 (데스크톱) */
  const previewRef = useRef<{ line: any; label: any; el: HTMLDivElement } | null>(null);

  const clearShapes = () => {
    shapesRef.current.forEach((o) => o.setMap(null));
    shapesRef.current = [];
  };

  const clearPreview = () => {
    previewRef.current?.line.setMap(null);
    previewRef.current?.label.setMap(null);
    previewRef.current = null;
  };

  const addPoint = useCallback((lat: number, lng: number) => {
    // 끊어 둔 선이 있으면 이어 붙이지 않고 새로 잰다 — 선이 쌓이면 지도가 금방 지저분해진다.
    if (finishedRef.current) {
      setFinished(false);
      setPoints([{ lat, lng }]);
      return;
    }
    setPoints((prev) => [...prev, { lat, lng }]);
  }, []);

  /** 측정 끊기. 점이 하나뿐이면 끊을 선이 없으므로 무시한다. */
  const finishMeasure = useCallback(() => {
    if (pointsRef.current.length < 2) return;
    setFinished(true);
    clearPreview();
  }, []);

  /** 마커·구역이 가로챈 클릭을 받는다 */
  const addLatLng = useCallback(
    (latLng: any) => {
      if (!measuringRef.current || typeof latLng?.getLat !== 'function') return;
      addPoint(latLng.getLat(), latLng.getLng());
    },
    [addPoint],
  );

  const addLatLngRef = useRef(addLatLng);
  useEffect(() => { addLatLngRef.current = addLatLng; }, [addLatLng]);

  // 손잡이 객체는 한 번만 만든다 — 페이지의 클릭 핸들러가 이걸 붙들고 있기 때문이다.
  const apiObjRef = useRef<DistanceMeasureApi>({
    isMeasuring: () => measuringRef.current,
    addLatLng: (latLng) => addLatLngRef.current(latLng),
  });

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = apiObjRef.current;
    return () => { apiRef.current = null; };
  }, [apiRef]);

  // 점이 바뀌면 선·점·라벨을 다시 그린다. 점은 많아도 수십 개라 전부 다시 만드는 게 안전하다.
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!map || !kakao?.maps) return;

    clearShapes();
    // 점이 바뀌면 커서까지 따라오던 점선은 기준이 사라진다. 다음 mousemove 에서 다시 그린다.
    clearPreview();
    if (points.length === 0) return;

    const path = points.map((p) => new kakao.maps.LatLng(p.lat, p.lng));
    const shapes = shapesRef.current;

    if (path.length > 1) {
      // 흰 테두리를 깔고 그 위에 색 선을 올린다. 위성 사진 위에서도 선이 묻히지 않는다.
      shapes.push(new kakao.maps.Polyline({
        map, path, strokeWeight: 7, strokeColor: '#FFFFFF', strokeOpacity: 0.85, strokeStyle: 'solid', zIndex: 12,
      }));
      shapes.push(new kakao.maps.Polyline({
        map, path, strokeWeight: 3, strokeColor: LINE_COLOR, strokeOpacity: 1, strokeStyle: 'solid', zIndex: 13,
      }));
    }

    let acc = 0;
    points.forEach((p, i) => {
      if (i > 0) acc += distanceM(points[i - 1], p);

      const dot = document.createElement('div');
      const endPoint = finished && i === points.length - 1;
      dot.className = i === 0 || endPoint ? styles.dotStart : styles.dot;
      shapes.push(new kakao.maps.CustomOverlay({
        map, position: path[i], content: dot, zIndex: 14, xAnchor: 0.5, yAnchor: 0.5,
      }));

      if (i > 0) {
        const last = i === points.length - 1;
        const label = document.createElement('div');
        // 끊은 선의 마지막 라벨은 총거리다. 채운 배지로 눈에 띄게 둔다.
        label.className = `${styles.label}${finished && last ? ` ${styles.labelTotal}` : ''}`;
        label.textContent = formatDistance(acc);
        shapes.push(new kakao.maps.CustomOverlay({
          map, position: path[i], content: label, zIndex: 15, xAnchor: 0, yAnchor: 0.5,
        }));
      }
    });

    return clearShapes;
  }, [map, points, finished]);

  // 측정 모드 동안만 지도 이벤트를 듣는다. 끄면 커서까지 되돌린다.
  useEffect(() => {
    const kakao = (window as any).kakao;
    if (!map || !kakao?.maps || !measuring) return;

    const onClick = (e: any) => {
      if (typeof e?.latLng?.getLat !== 'function') return;
      addPoint(e.latLng.getLat(), e.latLng.getLng());
    };

    const onRightClick = () => finishMeasure();

    const onMouseMove = (e: any) => {
      const pts = pointsRef.current;
      if (finishedRef.current || pts.length === 0 || typeof e?.latLng?.getLat !== 'function') {
        clearPreview();
        return;
      }
      const last = pts[pts.length - 1];
      const from = new kakao.maps.LatLng(last.lat, last.lng);
      const text = formatDistance(
        totalM(pts) + distanceM(last, { lat: e.latLng.getLat(), lng: e.latLng.getLng() }),
      );

      if (!previewRef.current) {
        const el = document.createElement('div');
        el.className = `${styles.label} ${styles.labelPreview}`;
        previewRef.current = {
          line: new kakao.maps.Polyline({
            map, path: [from, e.latLng], strokeWeight: 2, strokeColor: LINE_COLOR,
            strokeOpacity: 0.9, strokeStyle: 'shortdash', zIndex: 11,
          }),
          label: new kakao.maps.CustomOverlay({
            map, position: e.latLng, content: el, zIndex: 16, xAnchor: 0, yAnchor: 0.5,
          }),
          el,
        };
      } else {
        previewRef.current.line.setPath([from, e.latLng]);
        previewRef.current.label.setPosition(e.latLng);
      }
      previewRef.current.el.textContent = text;
    };

    kakao.maps.event.addListener(map, 'click', onClick);
    kakao.maps.event.addListener(map, 'mousemove', onMouseMove);
    kakao.maps.event.addListener(map, 'rightclick', onRightClick);
    try { map.setCursor('crosshair'); } catch { /* 커서 설정을 지원하지 않는 버전은 그냥 넘어간다 */ }

    // 우클릭으로 끊을 때 브라우저 메뉴가 같이 뜨면 선이 안 보인다. 측정 중에만 막는다.
    const stopContextMenu = (ev: Event) => ev.preventDefault();
    let node: HTMLElement | null = null;
    try { node = typeof map.getNode === 'function' ? map.getNode() : null; } catch { node = null; }
    node?.addEventListener('contextmenu', stopContextMenu);

    return () => {
      kakao.maps.event.removeListener(map, 'click', onClick);
      kakao.maps.event.removeListener(map, 'mousemove', onMouseMove);
      kakao.maps.event.removeListener(map, 'rightclick', onRightClick);
      node?.removeEventListener('contextmenu', stopContextMenu);
      try { map.setCursor(''); } catch { /* 위와 같다 */ }
      clearPreview();
    };
  }, [map, measuring, addPoint, finishMeasure]);

  if (!map) return null;

  const total = totalM(points);

  const handleToggle = () => {
    if (measuring) {
      setMeasuring(false);
      setPoints([]);
      setFinished(false);
      return;
    }
    setMeasuring(true);
  };

  return (
    <>
      {measuring && (
        <div className={styles.panel} role="status">
          <div className={styles.readout}>
            {points.length === 0 ? (
              <span className={styles.guide}>지도를 눌러 시작점을 찍어주세요</span>
            ) : points.length === 1 ? (
              <span className={styles.guide}>다음 지점을 눌러주세요</span>
            ) : (
              <>
                <strong className={styles.total}>{formatDistance(total)}</strong>
                <span className={styles.count}>{finished ? '측정 완료' : `${points.length}점`}</span>
              </>
            )}
          </div>
          <div className={styles.actions}>
            {finished ? (
              <button
                type="button"
                className={styles.action}
                onClick={() => { setPoints([]); setFinished(false); }}
              >
                다시 재기
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.action}
                  onClick={() => setPoints((prev) => prev.slice(0, -1))}
                  disabled={points.length === 0}
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  className={styles.action}
                  onClick={finishMeasure}
                  disabled={points.length < 2}
                  title="지도에서 우클릭해도 끝납니다"
                >
                  완료
                </button>
              </>
            )}
            <button type="button" className={`${styles.action} ${styles.done}`} onClick={handleToggle}>
              닫기
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className={`${styles.btn} ${measuring ? styles.btnActive : ''}`}
        onClick={handleToggle}
        aria-label={measuring ? '거리 재기 끄기' : '거리 재기'}
        aria-pressed={measuring}
        title={measuring ? '거리 재기 끄기' : '거리 재기'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14.5 2.5 21.5 9.5 9.5 21.5 2.5 14.5z" />
          <path d="M7 12l2 2M10 9l2 2M13 6l2 2" />
        </svg>
      </button>
    </>
  );
}
