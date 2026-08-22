import api from './authApi';

export type ZoneType = 'PROHIBITED' | 'RESTRICTED' | 'FISHERY';

export interface FishingZone {
  id: string;
  name: string;
  zoneType: ZoneType;
  geoJson: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

/** 지도에 보이는 범위. 네 값을 모두 채워야 서버가 범위 조회로 동작한다. */
export interface ZoneBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export const ZONE_TYPE_LABEL: Record<ZoneType, string> = {
  PROHIBITED: '낚시금지구역',
  RESTRICTED: '낚시제한구역',
  FISHERY: '어업권 설정 수면',
};

export const ZONE_TYPE_COLOR: Record<ZoneType, string> = {
  PROHIBITED: '#DC2626',
  RESTRICTED: '#EA580C',
  // 어장은 법으로 낚시를 금지한 곳이 아니라 어업권이 설정된 수면이라 빨강 계열과 섞으면 안 된다.
  FISHERY: '#EAB308',
};

/**
 * 지도 표시용 구역 조회.
 *
 * <p>범위를 주면 그 범위와 겹치는 구역만 온다(어장 포함).
 * 범위를 안 주면 낚시금지·제한구역만 온다 — 어장은 전국 7천 건이라 통째로 받으면
 * 응답이 6MB 가 돼 지도가 멈춘다.
 */
export async function fetchFishingZones(
  bounds?: ZoneBounds,
  signal?: AbortSignal,
): Promise<FishingZone[]> {
  const { data } = await api.get('/fishing-zones', {
    params: bounds ?? undefined,
    signal,
  });
  return data.data ?? [];
}

/**
 * 관리자 구역 조회.
 *
 * <p>공개 조회와 두 가지가 다르다. <b>비활성(숨김) 구역도 함께</b> 오고,
 * 어장은 {@code includeFishery} 와 {@code bounds} 를 둘 다 줘야 온다.
 * 범위 없이 어장을 요구하면 서버가 무시한다 — 7천 건을 한 번에 그릴 수 없기 때문이다.
 */
export async function fetchAdminFishingZones(
  opts: { includeFishery?: boolean; bounds?: ZoneBounds } = {},
): Promise<FishingZone[]> {
  const { data } = await api.get('/admin/fishing-zones', {
    params: { includeFishery: opts.includeFishery ?? false, ...(opts.bounds ?? {}) },
  });
  return data.data ?? [];
}

export async function createFishingZone(payload: {
  name: string;
  zoneType: ZoneType;
  geoJson: string;
  description: string;
}): Promise<void> {
  await api.post('/admin/fishing-zones', payload);
}

export async function updateFishingZone(
  id: string,
  payload: { name?: string; zoneType?: ZoneType; geoJson?: string; description?: string; active?: boolean },
): Promise<void> {
  await api.patch(`/admin/fishing-zones/${id}`, payload);
}

export async function deleteFishingZone(id: string): Promise<void> {
  await api.delete(`/admin/fishing-zones/${id}`);
}
