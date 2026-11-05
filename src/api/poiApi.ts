import api from './authApi';

/** 편의시설 종류. 서버의 `kind` 값과 그대로 맞춘다. */
export const POI_KINDS = [
  { code: 0, key: 'toilet', label: '화장실', color: '#0E7490' },
  { code: 1, key: 'pharmacy', label: '약국', color: '#B45309' },
  { code: 2, key: 'parking', label: '주차장', color: '#1D4FBF' },
] as const;

export type PoiKindCode = 0 | 1 | 2;

export function poiKind(code: number) {
  return POI_KINDS.find(k => k.code === code) ?? POI_KINDS[0];
}

export interface PoiBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/** 숫자 뱃지 하나. 서버가 미리 세어 둔 격자 칸이다. */
export interface PoiCluster {
  kind: PoiKindCode;
  count: number;
  lat: number;
  lng: number;
}

/** 개별 핀. 이름까지 같이 오므로 클릭하면 상세를 기다리지 않고 바로 뜬다. */
export interface PoiPin {
  id: number;
  kind: PoiKindCode;
  lat: number;
  lng: number;
  name: string;
}

/**
 * 한 번의 지도 조회 결과.
 *
 * 숫자 뱃지와 개별 핀 중 어느 쪽을 줄지는 **서버가** 정한다. 폭이나 배율이 아니라
 * 실제 개수로 정한다 — 핀이 200개 안에 다 들어가면 핀, 넘치면 뱃지가 40개 이하가
 * 되는 격자 단계. 잘라서 보내는 경우가 없으므로 "일부만 표시" 상태가 없다.
 */
export interface PoiMapData {
  isCluster: boolean;
  /** 숫자 뱃지일 때 쓴 격자 단계(0 거침 · 2 촘촘). */
  level: number | null;
  clusters: PoiCluster[];
  pins: PoiPin[];
}

export const EMPTY_POI_MAP: PoiMapData = {
  isCluster: false,
  level: null,
  clusters: [],
  pins: [],
};

export interface PoiDetail {
  id: number;
  kind: PoiKindCode;
  name: string;
  roadAddr: string | null;
  lotAddr: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  attrs: Record<string, unknown>;
  asOfDate: string | null;
}

/**
 * 화면 범위의 편의시설.
 *
 * 한 번에 한 종류만 본다. 세 종류를 겹치면 뱃지 색이 섞여서 그 숫자가 화장실인지
 * 약국인지 알 수 없고, 개수도 3배가 돼 전국 보기에서 지도가 덮인다.
 *
 * 응답은 행마다 객체가 아니라 숫자 배열이다 — 키 이름이 반복되지 않아 200행 기준
 * 16KB 에서 2KB 대로 줄어든다. 지도를 움직일 때마다 부르므로 [signal] 로 직전
 * 요청을 끊어야 한다.
 */
export async function fetchPoiMap(
  bounds: PoiBounds,
  kind: number,
  signal?: AbortSignal,
): Promise<PoiMapData> {
  const { data } = await api.get('/poi/map', {
    params: { ...bounds, kinds: kind },
    signal,
  });
  const d = data.data ?? {};

  return {
    isCluster: d.mode === 'CLUSTER',
    level: d.lv ?? null,
    clusters: ((d.clusters ?? []) as number[][]).map(a => ({
      kind: a[0] as PoiKindCode,
      count: a[1],
      lat: a[2],
      lng: a[3],
    })),
    pins: ((d.pins ?? []) as (number | string)[][]).map(a => ({
      id: a[0] as number,
      kind: a[1] as PoiKindCode,
      lat: a[2] as number,
      lng: a[3] as number,
      name: (a[4] as string) ?? '',
    })),
  };
}

export async function fetchPoiDetail(id: number, signal?: AbortSignal): Promise<PoiDetail> {
  const { data } = await api.get(`/poi/${id}`, { signal });
  return data.data;
}

/** 종류별 전체 개수. 안내 문구에 쓴다. */
export async function fetchPoiCounts(): Promise<Record<string, number>> {
  const { data } = await api.get('/poi/counts');
  return data.data ?? {};
}
