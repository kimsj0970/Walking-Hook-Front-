import api from './authApi';
import type { Province, TerrainType } from './fishingPointApi';
import type { PageResult } from './noticeApi';

export type MigratorySpecies = 'SAMCHI' | 'BANGEO' | 'BUSSIRI' | 'JATBANGEO' | 'MACKEREL' | 'TUNA' | 'JEONGAENGI';

export const MIGRATORY_SPECIES_LABELS: Record<MigratorySpecies, string> = {
  SAMCHI:     '삼치',
  BANGEO:     '방어',
  BUSSIRI:    '부시리',
  JATBANGEO:  '잿방어',
  MACKEREL:   '고등어',
  TUNA:       '참치',
  JEONGAENGI: '전갱이',
};

export const MIGRATORY_SPECIES_OPTIONS = Object.entries(MIGRATORY_SPECIES_LABELS) as [MigratorySpecies, string][];

export interface MigratoryFishPointSummary {
  id: string;
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  terrainType: TerrainType;
  targetSpecies: MigratorySpecies[];
  enabled: boolean;
  publicVisible: boolean;
}

export interface MigratoryFishPointDetail {
  id: string;
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  terrainType: TerrainType;
  targetSpecies: MigratorySpecies[];
  description: string | null;
  enabled: boolean;
  publicVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MigratoryFishPointMapMarker {
  id: string;
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  targetSpecies: MigratorySpecies[];
}

export interface MigratoryFishPointCreateRequest {
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  terrainType: TerrainType;
  targetSpecies: MigratorySpecies[];
  description?: string;
  enabled: boolean;
  publicVisible: boolean;
}

export type MigratoryFishPointUpdateRequest = Partial<MigratoryFishPointCreateRequest>;

// ── Admin API ──────────────────────────────────────────────────────────────

export async function fetchMigratoryFishPoints(
  page: number, size = 15, name?: string
): Promise<PageResult<MigratoryFishPointSummary>> {
  const { data } = await api.get('/admin/migratory-fish-points', {
    params: { page, size, name: name || undefined },
  });
  return data.data as PageResult<MigratoryFishPointSummary>;
}

/** 등록된 전체 포인트 조회 — 지도에 참고 핀으로 모두 표시할 때 사용 (페이지네이션 없이 전체) */
export async function fetchAllMigratoryFishPoints(): Promise<MigratoryFishPointSummary[]> {
  const { data } = await api.get('/admin/migratory-fish-points', {
    params: { page: 0, size: 1000 },
  });
  return ((data.data as PageResult<MigratoryFishPointSummary>)?.content ?? []);
}

export async function getMigratoryFishPoint(id: string): Promise<MigratoryFishPointDetail> {
  const { data } = await api.get(`/admin/migratory-fish-points/${id}`);
  return data.data as MigratoryFishPointDetail;
}

export async function createMigratoryFishPoint(req: MigratoryFishPointCreateRequest): Promise<string> {
  const { data } = await api.post('/admin/migratory-fish-points', req);
  return data.data as string;
}

export async function updateMigratoryFishPoint(id: string, req: MigratoryFishPointUpdateRequest): Promise<void> {
  await api.patch(`/admin/migratory-fish-points/${id}`, req);
}

export async function deleteMigratoryFishPoint(id: string): Promise<void> {
  await api.delete(`/admin/migratory-fish-points/${id}`);
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function fetchMigratoryFishPointMapMarkers(): Promise<MigratoryFishPointMapMarker[]> {
  const { data } = await api.get('/migratory-fish-points/map');
  return (data.data ?? []) as MigratoryFishPointMapMarker[];
}

/** 활성화된 회유성 포인트 전체 조회 (공개 여부·게시물 존재 여부 무관) — "모든 낚시 포인트 보기" 지도에 사용 */
export async function fetchAllMigratoryFishPointMapMarkers(): Promise<MigratoryFishPointMapMarker[]> {
  const { data } = await api.get('/migratory-fish-points/map/all');
  return (data.data ?? []) as MigratoryFishPointMapMarker[];
}
