import api from './authApi';
import type { Province, TerrainType } from './fishingPointApi';
import type { PageResult } from './noticeApi';

import {
  FISH_SPECIES_LABELS,
  MIGRATORY_SPECIES_OPTIONS,
  type FishSpecies,
} from './fishSpecies';

/**
 * 포인트의 어종 타입. 어종 목록은 조황 게시물과 공용(`fishSpecies.ts`)이며,
 * 포인트에는 회유성 어종만 등록할 수 있다(서버가 검증한다).
 * 아래 두 이름은 기존 포인트 화면들이 쓰던 것이라 별칭으로 유지한다.
 */
export type MigratorySpecies = FishSpecies;
export const MIGRATORY_SPECIES_LABELS = FISH_SPECIES_LABELS;
export { MIGRATORY_SPECIES_OPTIONS };

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
  /** 등록된 유튜브 영상 개수 — 관리자 목록의 "영상" 컬럼용 */
  videoCount: number;
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
  /** 등록된 유튜브 영상 개수. 0이면 지도 말풍선에 "영상 보기"를 띄우지 않는다 */
  videoCount?: number;
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

// ── 포인트 유튜브 영상 ───────────────────────────────────────────────────────

/**
 * 포인트에 등록된 유튜브 영상.
 * 화면에는 "링크" 글자만 노출하고 url 로 아웃링크한다 — 썸네일·임베드 재생은 하지 않는다.
 */
export interface MigratoryPointVideo {
  id: string;
  url: string;
  channelName: string;
  /** yyyy-MM-dd */
  publishedOn: string;
  startSeconds: number;
  endSeconds: number | null;
  sortOrder: number;
}

export interface MigratoryPointVideoCreateRequest {
  url: string;
  channelName: string;
  publishedOn: string;
  startSeconds: number;
  endSeconds?: number | null;
  sortOrder?: number;
}

export interface MigratoryPointVideoUpdateRequest {
  url?: string;
  channelName?: string;
  publishedOn?: string;
  startSeconds?: number;
  endSeconds?: number | null;
  /** true 면 종료 시각을 비운다 (null 로는 "유지"와 구분되지 않는다) */
  clearEndSeconds?: boolean;
  sortOrder?: number;
}

/**
 * 사용자 — 포인트별 영상 페이지 (영상 날짜 최신순).
 * 웹은 페이지네이션, 앱은 무한스크롤로 같은 API 를 쓴다.
 */
export async function fetchPointVideosPublic(
  pointId: string, page = 0, size = 5
): Promise<PageResult<MigratoryPointVideo>> {
  const { data } = await api.get(`/migratory-fish-points/${pointId}/videos`, {
    params: { page, size },
  });
  return data.data as PageResult<MigratoryPointVideo>;
}

/** 관리자 — 포인트별 영상 목록 */
export async function fetchPointVideos(pointId: string): Promise<MigratoryPointVideo[]> {
  const { data } = await api.get(`/admin/migratory-fish-points/${pointId}/videos`);
  return (data.data ?? []) as MigratoryPointVideo[];
}

export async function createPointVideo(
  pointId: string, req: MigratoryPointVideoCreateRequest
): Promise<string> {
  const { data } = await api.post(`/admin/migratory-fish-points/${pointId}/videos`, req);
  return data.data as string;
}

export async function updatePointVideo(
  videoId: string, req: MigratoryPointVideoUpdateRequest
): Promise<void> {
  await api.patch(`/admin/migratory-fish-points/videos/${videoId}`, req);
}

export async function deletePointVideo(videoId: string): Promise<void> {
  await api.delete(`/admin/migratory-fish-points/videos/${videoId}`);
}
