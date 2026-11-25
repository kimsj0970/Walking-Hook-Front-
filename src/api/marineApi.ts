import api from './authApi';

/* ── 수온 ───────────────────────────────────────────────────────────────────── */

/** 한 층의 값. 그 관측소가 그 층을 안 재면 층 자체가 null 로 온다. */
export interface MarineLayer {
  /** ℃. 서버가 받은 값 그대로다 — 반올림하지 않는다(NIFS 약관상 가공 금지). */
  temp: number;
  /** 미터. 관측소마다 다르다. 표층도 0m 가 아니라 5m 인 곳이 있다. */
  depth: number | null;
  /** "2026-11-24T11:30" — 캐시 시각이 아니라 관측 시각이다. */
  observedAt: string;
  /** 최근 7일 평균 − 직전 7일 평균. 쌓인 날이 모자라면 null. */
  weekDelta: number | null;
}

export interface MarineStation {
  code: string;
  name: string;
  /** E 동해 · W 서해 · S 남해 */
  region: string;
  lat: number;
  lon: number;
  /** 점검 중이면 층 값이 비어 있다. "데이터를 못 받은 것"과 구분해 표시한다. */
  maintenance: boolean;
  /**
   * 값은 왔는데 너무 묵어서 안 쓴 경우. **점검과 다른 상태다.**
   *
   * NIFS 는 센서가 멈춰도 마지막 값을 계속 내려주고, 점검 플래그가 안 붙는 일이
   * 있다. 실측에서 완도 대창·사동이 4월 16일 값을 223일째 주고 있었다. 그대로
   * 띄우면 겨울 바다에 13℃ 핀이 박혀 있게 된다.
   */
  stale: boolean;
  /** stale 일 때 마지막 관측 시각. 아니면 null. */
  lastObservedAt: string | null;
  surface: MarineLayer | null;
  middle: MarineLayer | null;
  bottom: MarineLayer | null;
}

export interface MarineTempData {
  /**
   * 값을 들고 있나. false 면 "관측소가 없다"가 아니라 **"지금은 알 수 없다"**다.
   * 둘을 같은 빈 목록으로 보여 주면 화면이 "관측소 0곳"이라고 거짓말한다.
   */
  loaded: boolean;
  total: number;
  withBottom: number;
  stations: MarineStation[];
}

export const EMPTY_MARINE_TEMP: MarineTempData = {
  loaded: false,
  total: 0,
  withBottom: 0,
  stations: [],
};

/**
 * 수온 관측소 전건.
 *
 * NIFS 가 전건만 주므로 화면도 bbox 로 쪼개지 않는다 — 쪼개 봐야 같은 값을 여러
 * 번 받는다. 실측 기준 42곳이라 전국에 다 띄워도 뭉치지 않는다.
 *
 * @param multiLayerOnly 표층 말고 더 재는 곳만(42곳 중 18곳)
 */
export async function fetchMarineTemp(
  multiLayerOnly = false,
  signal?: AbortSignal,
): Promise<MarineTempData> {
  const { data } = await api.get('/marine/temp', {
    params: { multiLayerOnly },
    signal,
  });
  return (data.data ?? EMPTY_MARINE_TEMP) as MarineTempData;
}

/* ── 수온 색 ────────────────────────────────────────────────────────────────── */

/**
 * 수온 단계별 색. 파랑 한 계열의 밝음→어두움 순차 램프다.
 *
 * 무지개(파랑→초록→노랑→빨강)를 쓰지 않는다. 색상환을 돌면 단계 사이의 거리가
 * 실제 온도 차와 어긋나고 색약에서 순서가 무너진다. 한 색의 명도만 바꾸면 순서가
 * 눈으로 바로 읽힌다.
 *
 * 다만 색만으로는 "어두우니 따뜻하다"가 직관적이지 않다. 그래서 **핀 안에 숫자를
 * 그대로 찍는다** — 색은 전국 분포를 훑는 용도고, 값은 언제나 글자로 읽힌다.
 *
 * 각 단계는 흰 글씨 기준 4.4:1 이상 대비가 나오는 쪽으로 글자색을 고른다.
 */
export const TEMP_BANDS = [
  { max: 10,       label: '10℃ 미만',  fill: '#86b6ef', ink: '#0b0b0b' },
  { max: 15,       label: '10~15℃',   fill: '#5598e7', ink: '#0b0b0b' },
  { max: 20,       label: '15~20℃',   fill: '#2a78d6', ink: '#ffffff' },
  { max: 25,       label: '20~25℃',   fill: '#1c5cab', ink: '#ffffff' },
  { max: Infinity, label: '25℃ 이상',  fill: '#0d366b', ink: '#ffffff' },
] as const;

/**
 * 점검 중이거나 값이 없는 관측소. 색 램프에서 빼서 회색으로 둔다.
 * 글자는 검정 — 이 회색 위에서 흰 글씨는 3.6:1 로 본문 기준(4.5:1)에 못 미친다.
 */
export const TEMP_NODATA = { fill: '#898781', ink: '#0b0b0b' } as const;

export function tempBand(temp: number) {
  return TEMP_BANDS.find(b => temp < b.max) ?? TEMP_BANDS[TEMP_BANDS.length - 1];
}

/* ── 표시용 변환 ────────────────────────────────────────────────────────────── */

/**
 * 핀에 찍을 층 두 개를 고른다 — **표층과 가장 깊은 층**.
 *
 *   표층만        → 표층
 *   표층+중층     → 표층, 중(중층이 가장 깊다)
 *   표층+저층     → 표층, 저
 *   표층+중층+저층 → 표층, 저 (중층은 생략. 클릭하면 셋 다 나온다)
 *
 * 핀에서 중층을 빼는 이유는 자리가 없어서가 아니라, 바닥 수온이 먼저 궁금하기
 * 때문이다. 표층과 바닥을 나란히 놓으면 성층이 얼마나 벌어졌는지가 바로 읽힌다.
 *
 * 표층이 아예 없는 관측소가 와도 비지 않게 있는 층 중 맨 위를 쓴다.
 */
export function pinLayers(s: MarineStation): {
  top: { tag: string; layer: MarineLayer } | null;
  second: { tag: string; layer: MarineLayer } | null;
} {
  const ordered = (
    [
      ['표', s.surface],
      ['중', s.middle],
      ['저', s.bottom],
    ] as const
  ).flatMap(([tag, layer]) => (layer ? [{ tag, layer }] : []));

  if (ordered.length === 0) return { top: null, second: null };
  return {
    top: ordered[0],
    second: ordered.length > 1 ? ordered[ordered.length - 1] : null,
  };
}

export const REGION_LABEL: Record<string, string> = {
  E: '동해',
  W: '서해',
  S: '남해',
};

/** "2026-11-24T11:30" → "11.24 11:30". 못 읽으면 원문을 그대로 보여준다. */
export function formatObservedAt(raw: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(raw);
  return m ? `${m[2]}.${m[3]} ${m[4]}:${m[5]}` : raw;
}

/**
 * "지난주보다" 한 줄.
 *
 * 올랐나 내렸나는 **부호와 화살표**가 말한다. 색은 거들기만 한다 — 색만으로
 * 방향을 읽게 하면 색약에서 뜻이 사라진다. 0.3℃ 안쪽은 관측 흔들림과 구분이
 * 안 되므로 방향을 말하지 않는다.
 */
export function formatWeekDelta(delta: number | null): { text: string; color: string } | null {
  if (delta == null) return null;
  if (Math.abs(delta) < 0.3) {
    return { text: '지난주와 비슷', color: '#52514e' };
  }
  const up = delta > 0;
  return {
    text: `지난주보다 ${up ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}℃`,
    color: up ? '#9c2b24' : '#1c5cab',
  };
}

/* ── 적조 ───────────────────────────────────────────────────────────────────── */

/** 발생 격자 한 칸. 15초 ≈ 464m 사각형이다. */
export interface RedtideCell {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export type RedtideHarm = 'HARMFUL' | 'HARMLESS' | 'UNKNOWN';

export interface RedtideArea {
  codNews: string;
  /** yyyyMMdd */
  reportDate: string;
  /** NIFS 표기 그대로. 치환하지 않는다 — 가공 금지이기도 하고 매핑이 가능하지도 않다. */
  sea: string;
  /** 한글 이름. 표에 없는 학명이면 학명이 그대로 온다. */
  species: string;
  scientificName: string;
  harm: RedtideHarm;
  minWaterTemp: number | null;
  maxWaterTemp: number | null;
  /** 상세를 못 받았으면 빈 배열 — 목록에는 남고 지도만 안 칠해진다. */
  cells: RedtideCell[];
}

export interface MarineRedtideData {
  /**
   * 값을 들고 있나. false 면 "적조가 없다"가 아니라 **"지금은 알 수 없다"**다.
   * NIFS 가 죽은 동안 "적조 없음"이라고 말하면 적조철에 위험한 오보가 된다.
   */
  loaded: boolean;
  lastReportDate: string | null;
  areaCount: number;
  areas: RedtideArea[];
  /**
   * 서버가 NIFS 에서 마지막으로 받아 온 시각 (ISO). 속보일과 다르다.
   * 「8.11 속보 · 11.25 확인」처럼 둘을 같이 보여 줘야 "적조 없음"이 언제
   * 기준인지 알 수 있다.
   */
  checkedAt: string | null;
}

export const EMPTY_MARINE_REDTIDE: MarineRedtideData = {
  loaded: false,
  lastReportDate: null,
  areaCount: 0,
  areas: [],
  checkedAt: null,
};

export async function fetchMarineRedtide(signal?: AbortSignal): Promise<MarineRedtideData> {
  const { data } = await api.get('/marine/redtide', { signal });
  return (data.data ?? EMPTY_MARINE_REDTIDE) as MarineRedtideData;
}

/**
 * 유해성별 표시.
 *
 * 단계(예비주의보·주의보·경보)가 아니다. 서버가 밀도를 안 내리고 단계도 계산하지
 * 않는다 — NIFS 가 "밀도 기준은 폐사 판단 기준이 아니다"라고 명시했고 실측 단위도
 * 맞지 않는다. 조황에 걸리는 신호는 단계가 아니라 **어류를 질식시키는 종이냐**다.
 *
 * 색은 거들기만 한다. 목록에 라벨 글자가 항상 같이 나간다.
 */
export const HARM_STYLE: Record<RedtideHarm, { label: string; fill: string; ink: string }> = {
  HARMFUL: { label: '유해종', fill: '#d03b3b', ink: '#ffffff' },
  UNKNOWN: { label: '판정 보류', fill: '#ec835a', ink: '#0b0b0b' },
  HARMLESS: { label: '무해종', fill: '#898781', ink: '#0b0b0b' },
};

/** ISO 시각 → "11.25". 못 읽으면 빈 문자열. */
export function formatCheckedAt(raw: string | null): string {
  if (!raw) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  return m ? `${Number(m[2])}.${Number(m[3])}` : '';
}

/** "20260811" → "8.11". 못 읽으면 원문 그대로. */
export function formatReportDate(raw: string | null): string {
  if (!raw) return '';
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  return m ? `${Number(m[2])}.${Number(m[3])}` : raw;
}
