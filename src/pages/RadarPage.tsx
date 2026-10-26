import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import Header from '../components/common/Header';
import { usePageMeta } from '../lib/usePageMeta';
import styles from './RadarPage.module.css';

/**
 * 비구름 — 현재 레이더 / 미래 레이더 두 탭.
 *
 *   현재  레이더 합성영상 (관측, 500m, 5분)   · 정사각 600×600
 *   미래  초단기예보 분포도 (예측, 5km, 1시간) · 세로형 601×1034
 *
 * 탭으로 나눈 이유는 두 그림의 비율이 다르기 때문이다. 한 무대에 넣으면 어느 쪽이든
 * 작아지고, 시각을 옮길 때 크기가 튄다. 탭마다 무대 비율을 따로 주면 각자 꽉 찬다.
 *
 * 둘 다 기상청 산출물을 받아 띄우기만 한다 — 자체 예측을 만들지 않는다.
 * 기상산업진흥법상 기상예보업(제6조·제26조) 경계를 넘지 않기 위한 선이다.
 *
 * 로그인 필수(App.tsx 의 PrivateRoute). 하단 앵커 광고는 올리지 않는다 —
 * 지도 화면들과 같은 규칙. 앱은 반대로 AdBannerSlot 을 맨 아래 고정으로 넣는다.
 *
 * 서버가 503 을 주면 캐시(Redis) 장애다. 그때는 기상청으로 직행하지 않고 끊으므로
 * 화면도 "잠시 후 다시"로 안내한다.
 */

const API = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

const OBS_W = 635; // 레이더 원본 폭
const OBS_MAP_W = 600; // 지도 영역(테두리 x 0~599). 그 오른쪽이 범례다
const OBS_H = 620;
const OBS_TOP = 20; // 상단 기상청 라벨 — 우리 시각 칩으로 대체한다

const OBS_DELAY_MIN = 10; // 관측 → 영상 생산 지연(약 5분) + 여유
const OBS_TRIES = 4; // 최신부터 5분씩 뒤로 물러나며 찾아본다
const LEAD_HOURS = 6;

const PLAY_MS = 1100;
const REFRESH_MS = 5 * 60 * 1000;
const MAX_ZOOM = 2; // 레이더 1픽셀이 약 4.6km 라 더 키워도 얻을 게 없다

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

type Tab = 'now' | 'future';
type Shot = { key: string; url: string; label: string };

function kstNow(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

const p2 = (n: number) => String(n).padStart(2, '0');

function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}`;
}

/** 자정을 넘기면 날짜가 바뀌므로 시각만으로는 오늘인지 내일인지 알 수 없다. */
function dayLabel(d: Date): string {
  return `${p2(d.getUTCMonth() + 1)}.${p2(d.getUTCDate())}(${DOW[d.getUTCDay()]})`;
}

/** 무채색만 사이트 톤으로 바꾼다. 컬러(강수)는 손대지 않는다. */
function repaint(p: Uint8ClampedArray): void {
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i];
    const g = p[i + 1];
    const b = p[i + 2];
    if (Math.max(r, g, b) - Math.min(r, g, b) > 25) continue;
    const l = (r + g + b) / 3;
    if (l > 245) {
      p[i] = 255; p[i + 1] = 255; p[i + 2] = 255; // 레이더 관측 범위 안 / 육지
    } else if (l > 150) {
      p[i] = 242; p[i + 1] = 245; p[i + 2] = 250; // 바깥
    } else {
      p[i] = 120; p[i + 1] = 133; p[i + 2] = 152; // 해안선·경계
    }
  }
}

async function render(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): Promise<string | null> {
  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return null;
  x.drawImage(img, -sx, -sy);
  const data = x.getImageData(0, 0, sw, sh);
  repaint(data.data);
  x.putImageData(data, 0, 0);
  return new Promise((res) =>
    c.toBlob((bl) => res(bl ? URL.createObjectURL(bl) : null), 'image/png'),
  );
}

type Fetched = { img: HTMLImageElement; revoke: () => void };

/**
 * blob 으로 받아 object URL 로 띄운다. 같은 출처가 되어 canvas 가 오염되지 않고,
 * 응답 코드를 읽을 수 있어 503(캐시 장애)과 404(아직 없음)를 구분할 수 있다.
 */
async function fetchImage(url: string): Promise<Fetched | 'unavailable' | null> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return null;
  }
  if (res.status === 503) return 'unavailable';
  if (!res.ok) return null;

  const objUrl = URL.createObjectURL(await res.blob());
  const img = new Image();
  const ok = await new Promise<boolean>((r) => {
    img.onload = () => r(true);
    img.onerror = () => r(false);
    img.src = objUrl;
  });
  if (!ok) {
    URL.revokeObjectURL(objUrl);
    return null;
  }
  return { img, revoke: () => URL.revokeObjectURL(objUrl) };
}

export default function RadarPage() {
  usePageMeta(
    '비구름',
    '기상청 레이더로 지금 내리는 비를, 초단기예보로 앞으로 6시간의 강수를 확인합니다.',
  );

  const [tab, setTab] = useState<Tab>('now');
  const [obs, setObs] = useState<Shot | null>(null);
  const [future, setFuture] = useState<Shot[]>([]);
  const [legend, setLegend] = useState<string | null>(null);
  const [fIdx, setFIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const urls = useRef<string[]>([]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    const fresh: string[] = [];
    const now = kstNow();
    let down = false;

    // 현재 ─ 최신 관측부터 5분씩 뒤로 물러나며 처음 받아지는 것을 쓴다.
    let nextObs: Shot | null = null;
    let nextLegend: string | null = null;
    const base = new Date(now.getTime() - OBS_DELAY_MIN * 60 * 1000);
    base.setUTCSeconds(0, 0);
    base.setUTCMinutes(Math.floor(base.getUTCMinutes() / 5) * 5);

    for (let i = 0; i < OBS_TRIES && !nextObs && !down; i += 1) {
      const at = new Date(base.getTime() - i * 5 * 60 * 1000);
      const got = await fetchImage(`${API}/radar/image/${stamp(at)}`);
      if (got === 'unavailable') { down = true; break; }
      if (!got) continue;

      const map = await render(got.img, 0, OBS_TOP, OBS_MAP_W, OBS_H - OBS_TOP);
      nextLegend = await render(got.img, OBS_MAP_W, OBS_TOP, OBS_W - OBS_MAP_W, OBS_H - OBS_TOP);
      got.revoke();
      if (!map) continue;
      fresh.push(map);
      if (nextLegend) fresh.push(nextLegend);
      nextObs = {
        key: stamp(at),
        url: map,
        label: `${dayLabel(at)} ${p2(at.getUTCHours())}:${p2(at.getUTCMinutes())} 관측`,
      };
    }

    // 미래 ─ 다음 정시부터 6시간. 발표시각은 서버가 고른다.
    const nextFuture: Shot[] = [];
    const hour = new Date(now.getTime());
    hour.setUTCMinutes(0, 0, 0);

    for (let h = 1; h <= LEAD_HOURS && !down; h += 1) {
      const at = new Date(hour.getTime() + h * 60 * 60 * 1000);
      const tmEf = `${stamp(at).slice(0, 10)}00`;
      const got = await fetchImage(`${API}/radar/forecast/${tmEf}`);
      if (got === 'unavailable') { down = true; break; }
      if (!got) continue;

      const url = await render(got.img, 0, 0, got.img.width, got.img.height);
      got.revoke();
      if (!url) continue;
      fresh.push(url);
      nextFuture.push({
        key: tmEf,
        url,
        label: `${dayLabel(at)} ${p2(at.getUTCHours())}시 예보`,
      });
    }

    if (!alive.current) {
      fresh.forEach(URL.revokeObjectURL);
      return;
    }

    urls.current.forEach(URL.revokeObjectURL);
    urls.current = fresh;
    setUnavailable(down);
    setObs(nextObs);
    setLegend(nextLegend);
    setFuture(nextFuture);
    setFIdx(0);
    setPlaying(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    // load() 안의 setState 는 전부 await 뒤에서 일어나므로 렌더 중 동기 setState 가 아니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    return () => {
      urls.current.forEach(URL.revokeObjectURL);
      urls.current = [];
    };
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  // 재생 — 1시간씩 넘어가고, 마지막에 닿으면 그 자리에 멈춘다.
  useEffect(() => {
    if (!playing || future.length < 2 || fIdx >= future.length - 1) return undefined;
    const id = window.setTimeout(() => {
      const next = fIdx + 1;
      setFIdx(next);
      if (next >= future.length - 1) setPlaying(false);
    }, PLAY_MS);
    return () => window.clearTimeout(id);
  }, [playing, fIdx, future.length]);

  // ── 확대·이동 ────────────────────────────────────────────────────────
  const clamp = useCallback((z: number, p: { x: number; y: number }) => {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const mx = (el.clientWidth * (z - 1)) / 2;
    const my = (el.clientHeight * (z - 1)) / 2;
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  }, []);

  const applyZoom = useCallback(
    (next: number) => {
      const z = Math.min(MAX_ZOOM, Math.max(1, Number(next.toFixed(2))));
      setZoom(z);
      setPan((p) => clamp(z, z === 1 ? { x: 0, y: 0 } : p));
    },
    [clamp],
  );

  /** 탭이 바뀌면 무대 비율이 달라지므로 확대는 풀어 둔다. */
  const switchTab = (next: Tab) => {
    setTab(next);
    setPlaying(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? 0.2 : -0.2));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom, zoom]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: ReactPointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { dist: spread(), zoom };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const d = spread();
      if (pinch.current.dist > 0) applyZoom((pinch.current.zoom * d) / pinch.current.dist);
      return;
    }
    if (zoom === 1) return;
    setPan((p) => clamp(zoom, { x: p.x + (e.clientX - prev.x), y: p.y + (e.clientY - prev.y) }));
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const isNow = tab === 'now';
  const shot = isNow ? obs : future[fIdx];
  const empty = !loading && !unavailable && !shot;

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <h1 className={styles.title}>비구름</h1>

        <div className={styles.tabs}>
          <button
            type="button"
            className={isNow ? styles.tabOn : styles.tab}
            onClick={() => switchTab('now')}
          >
            현재 레이더
          </button>
          <button
            type="button"
            className={!isNow ? styles.tabOn : styles.tab}
            onClick={() => switchTab('future')}
          >
            미래 레이더
          </button>
        </div>

        <div
          className={`${styles.stage} ${isNow ? styles.square : styles.tall}`}
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={() => applyZoom(zoom >= MAX_ZOOM ? 1 : MAX_ZOOM)}
        >
          {shot && (
            <div
              className={styles.canvas}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <img src={shot.url} alt={shot.label} draggable={false} className={styles.shot} />
            </div>
          )}

          {shot && <span className={styles.stamp}>{shot.label}</span>}

          {/* 기상청 레이더 원본에 붙어 있는 범례를 잘라 쓴다.
              ⚠ 초단기예보 분포도에는 범례가 없어 같은 색상표라고 보고 공유한다.
                 비 오는 날 두 그림의 색을 대조해 확정할 것. */}
          {shot && legend && (
            <img src={legend} alt="강수강도 범례 (mm/h)" className={styles.legend} />
          )}

          {shot && (
            <div className={styles.zoomBox}>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => applyZoom(zoom + 0.5)}
                disabled={zoom >= MAX_ZOOM}
                aria-label="확대"
              >
                +
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={() => applyZoom(zoom - 0.5)}
                disabled={zoom <= 1}
                aria-label="축소"
              >
                −
              </button>
            </div>
          )}

          {loading && <div className={styles.state}>불러오는 중입니다…</div>}

          {/* 캐시(Redis) 장애. 5분마다 도는 갱신이 알아서 다시 시도하므로 버튼은 두지 않는다. */}
          {unavailable && (
            <div className={styles.state}>
              지금은 비구름을 불러올 수 없습니다.
              <br />
              잠시 후 다시 열어 주세요.
            </div>
          )}

          {empty && <div className={styles.state}>표시할 영상이 없습니다.</div>}
        </div>

        {isNow ? (
          <p className={styles.hint}>5분마다 새로 들어옵니다</p>
        ) : (
          future.length > 0 && (
            <>
              <div className={styles.controls}>
                <button
                  type="button"
                  className={styles.playBtn}
                  onClick={() => {
                    // 끝에 멈춰 있는데 다시 누르면 처음부터 돌린다.
                    if (!playing && fIdx >= future.length - 1) setFIdx(0);
                    setPlaying((p) => !p);
                  }}
                  disabled={future.length < 2}
                  aria-label={playing ? '정지' : '재생'}
                >
                  {playing ? '❚❚' : '▶'}
                </button>

                {/* 드래그·터치로 시각을 옮긴다. 손을 대면 재생은 멈춘다. */}
                <input
                  type="range"
                  className={styles.slider}
                  min={0}
                  max={Math.max(future.length - 1, 0)}
                  step={1}
                  value={fIdx}
                  disabled={future.length < 2}
                  onChange={(e) => {
                    setPlaying(false);
                    setFIdx(Number(e.target.value));
                  }}
                  aria-label="예보 시각 선택"
                />
              </div>

              <div className={styles.ends}>
                <span>1시간 후</span>
                <span>{future.length}시간 후</span>
              </div>
            </>
          )
        )}

        <p className={styles.source}>
          자료 출처: 기상청 레이더 합성영상 · 초단기예보 분포도 (공공누리 제1유형) ·
          화면 표시를 위해 색상만 조정했습니다
        </p>
      </main>
    </div>
  );
}
