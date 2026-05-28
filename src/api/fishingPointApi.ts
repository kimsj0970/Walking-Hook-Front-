import api from './authApi';

export type SafetyLevel = 'SAFE' | 'NORMAL' | 'CAUTION' | 'DANGEROUS';
export type TerrainType = 'UNKNOWN' | 'BEACH' | 'BREAKWATER' | 'ROCKY_SHORE' | 'PORT';
export type BottomType = 'UNKNOWN' | 'SAND' | 'MUD' | 'GRAVEL' | 'ROCK' | 'MIXED' | 'TETRAPOD';
export type DepthFeature = 'UNKNOWN' | 'SHALLOW' | 'GENTLE_SLOPE' | 'DEPTH_BREAK' | 'WATER_CHANNEL' | 'DEEP_DROP';
export type StructureDensity = 'UNKNOWN' | 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export const SAFETY_LEVEL_LABELS: Record<SafetyLevel, string> = {
  SAFE: '안전',
  NORMAL: '보통',
  CAUTION: '주의',
  DANGEROUS: '위험',
};

export const TERRAIN_TYPE_LABELS: Record<TerrainType, string> = {
  UNKNOWN: '미상',
  BEACH: '백사장',
  BREAKWATER: '방파제',
  ROCKY_SHORE: '갯바위',
  PORT: '항구',
};

export const BOTTOM_TYPE_LABELS: Record<BottomType, string> = {
  UNKNOWN: '미상',
  SAND: '모래',
  MUD: '펄·뻘',
  GRAVEL: '자갈',
  ROCK: '암반',
  MIXED: '혼합',
  TETRAPOD: '테트라포드',
};

export const DEPTH_FEATURE_LABELS: Record<DepthFeature, string> = {
  UNKNOWN: '미상',
  SHALLOW: '얕음',
  GENTLE_SLOPE: '완경사',
  DEPTH_BREAK: '수심 급변',
  WATER_CHANNEL: '물길',
  DEEP_DROP: '급심',
};

export const STRUCTURE_DENSITY_LABELS: Record<StructureDensity, string> = {
  UNKNOWN: '미상',
  NONE: '없음',
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
};

export const SAFETY_LEVEL_OPTIONS = Object.entries(SAFETY_LEVEL_LABELS) as [SafetyLevel, string][];
export const TERRAIN_TYPE_OPTIONS = Object.entries(TERRAIN_TYPE_LABELS) as [TerrainType, string][];
export const BOTTOM_TYPE_OPTIONS = Object.entries(BOTTOM_TYPE_LABELS) as [BottomType, string][];
export const DEPTH_FEATURE_OPTIONS = Object.entries(DEPTH_FEATURE_LABELS) as [DepthFeature, string][];
export const STRUCTURE_DENSITY_OPTIONS = Object.entries(STRUCTURE_DENSITY_LABELS) as [StructureDensity, string][];

export interface FishingPointSummary {
  id: string;
  name: string;
  region: string;
  safetyLevel: SafetyLevel;
  terrainType: TerrainType;
  enabled: boolean;
  publicVisible: boolean;
  latitude: number;
  longitude: number;
}

export interface FishingPointMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface FishingPointDetail {
  id: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  description: string | null;
  walkingAccessible: boolean;
  fishingAllowed: boolean;
  publicVisible: boolean;
  enabled: boolean;
  safetyLevel: SafetyLevel;
  terrainType: TerrainType;
  bottomType: BottomType;
  depthFeature: DepthFeature;
  structureDensity: StructureDensity;
  isHomtong: boolean;
  isCape: boolean;
  isEstuary: boolean;
  isRockField: boolean;
  isUnderwaterReef: boolean;
  hasFoam: boolean;
  hasCurrentChange: boolean;
  baitFrequent: boolean;
}

export interface FishingPointCreateRequest {
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  description?: string;
  walkingAccessible: boolean;
  fishingAllowed: boolean;
  publicVisible: boolean;
  enabled: boolean;
  safetyLevel: SafetyLevel;
  terrainType: TerrainType;
  bottomType: BottomType;
  depthFeature: DepthFeature;
  structureDensity: StructureDensity;
  isHomtong: boolean;
  isCape: boolean;
  isEstuary: boolean;
  isRockField: boolean;
  isUnderwaterReef: boolean;
  hasFoam: boolean;
  hasCurrentChange: boolean;
  baitFrequent: boolean;
}

export type FishingPointUpdateRequest = Partial<FishingPointCreateRequest>;

export async function searchFishingPoints(name?: string): Promise<FishingPointSummary[]> {
  const params = name ? { name } : {};
  const { data } = await api.get('/admin/fish-points', { params });
  return data.data as FishingPointSummary[];
}

export async function getFishingPoint(id: string): Promise<FishingPointDetail> {
  const { data } = await api.get(`/admin/fish-points/${id}`);
  return data.data as FishingPointDetail;
}

export async function createFishingPoint(req: FishingPointCreateRequest): Promise<string> {
  const { data } = await api.post('/admin/fish-points', req);
  return data.data as string;
}

export async function updateFishingPoint(id: string, req: FishingPointUpdateRequest): Promise<void> {
  await api.patch(`/admin/fish-points/${id}`, req);
}

export async function deleteFishingPoint(id: string): Promise<void> {
  await api.delete(`/admin/fish-points/${id}`);
}

export async function fetchPublicFishingPointsForMap(): Promise<FishingPointMapMarker[]> {
  const { data } = await api.get('/fishing-points/map');
  return data.data as FishingPointMapMarker[];
}

export interface ProvinceItem {
  code: string;
  displayName: string;
}

export async function fetchProvinces(): Promise<ProvinceItem[]> {
  const { data } = await api.get('/fishing-points/provinces');
  return data.data as ProvinceItem[];
}

export async function fetchFishingPointsByProvince(province: string): Promise<FishingPointMapMarker[]> {
  const { data } = await api.get('/fishing-points/by-province', { params: { province } });
  return data.data as FishingPointMapMarker[];
}

export interface SpeciesAnalysis {
  species: string;
  score: number;
  reason: string;
}

export type OutingStatus = 'SAFE' | 'CAUTION' | 'IMPOSSIBLE';

export interface FishingAnalysisResult {
  pointName: string;
  stationName: string | null;
  observedAt: string | null;
  waterTemp: number | null;
  waveHeight: number | null;
  windSpeed: number | null;
  tideDescription: string | null;
  fishingIndex: string | null;
  outingStatus: OutingStatus;
  outingWarning: string | null;
  results: SpeciesAnalysis[] | null;
}

export async function analyzeFishingPoint(id: string): Promise<FishingAnalysisResult> {
  const { data } = await api.get(`/fishing-points/${id}/analysis`);
  return data.data as FishingAnalysisResult;
}
