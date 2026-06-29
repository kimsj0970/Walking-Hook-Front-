import api from './authApi';
import type { Province, TerrainType } from './fishingPointApi';

export type MigratorySpecies = 'SAMCHI' | 'BANGEO' | 'BUSSIRI' | 'JATBANGEO' | 'MACKEREL' | 'TUNA';

export const MIGRATORY_SPECIES_LABELS: Record<MigratorySpecies, string> = {
  SAMCHI:    '삼치',
  BANGEO:    '방어',
  BUSSIRI:   '부시리',
  JATBANGEO: '잿방어',
  MACKEREL:  '고등어',
  TUNA:      '참치',
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

export async function fetchMigratoryFishPoints(): Promise<MigratoryFishPointSummary[]> {
  const { data } = await api.get('/admin/migratory-fish-points');
  return (data.data ?? []) as MigratoryFishPointSummary[];
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
