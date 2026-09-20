import api from './authApi';
import { demoPath } from './demoApi';
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
  /**
   * 등록된 유튜브 영상 개수. 0이면 지도 말풍선에 "영상 보기"를 띄우지 않는다.
   * 유튜버(채널) 필터가 걸린 조회에서는 **그 채널의 편수**가 들어온다.
   */
  videoCount?: number;
  /**
   * 채널과 무관한 전체 영상 개수. 필터가 없으면 videoCount 와 같다.
   * `totalVideoCount - videoCount` 가 곧 "이 포인트의 다른 채널 영상 N개"라서
   * 핀을 눌렀을 때 추가 요청 없이 그 안내를 그릴 수 있다.
   */
  totalVideoCount?: number;
}

/** 지도 "유튜버 선택" 목록의 한 줄 */
export interface MigratoryPointChannel {
  channelName: string;
  /** 이 채널 영상이 붙어 있는 포인트 수 — 목록 정렬·접기 기준 */
  pointCount: number;
  /** 이 채널이 올린 영상 링크 수 */
  videoCount: number;
}

/**
 * 유튜버 선택 목록 응답.
 *
 * 합계가 따로 오는 이유 — 서버가 목록에서 감춘 채널이 있으면 `channels` 의 videoCount 합이
 * 실제 총 영상 수보다 적다. 감춘 채널 영상도 핀을 누르면 보이므로,
 * "전체 유튜버 N편"은 감춘 것까지 포함한 이 값으로 그려야 화면끼리 어긋나지 않는다.
 */
export interface MigratoryPointChannelList {
  /** 영상이 하나라도 붙어 있는 포인트 수 (감춘 채널 포함) */
  totalPointCount: number;
  /** 등록된 영상 링크 총 수 (감춘 채널 포함) */
  totalVideoCount: number;
  /** 목록에 보여줄 채널 — 포인트 수 내림차순, 감춘 채널 제외 */
  channels: MigratoryPointChannel[];
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
  const { data } = await api.get(demoPath('/migratory-fish-points/map'));
  return (data.data ?? []) as MigratoryFishPointMapMarker[];
}

/**
 * 활성화된 회유성 포인트 전체 조회 (공개 여부·게시물 존재 여부 무관) — "모든 낚시 포인트 보기" 지도에 사용.
 *
 * channel 을 주면 그 유튜버 영상이 붙은 포인트만 내려온다. 서버는 채널별 결과를 캐시하지 않는다
 * (채널이 170개가 넘어 키가 그만큼 불어나는데 결과는 애초에 가볍다).
 */
export async function fetchAllMigratoryFishPointMapMarkers(
  channel?: string | null
): Promise<MigratoryFishPointMapMarker[]> {
  const { data } = await api.get(demoPath('/migratory-fish-points/map/all'), {
    params: channel ? { channel } : undefined,
  });
  return (data.data ?? []) as MigratoryFishPointMapMarker[];
}

/**
 * 지도 "유튜버 선택" 목록 — 포인트 수 내림차순으로 내려온다.
 *
 * 채널이 170개가 넘고 그중 대부분이 포인트 1곳짜리다. 화면은 위쪽만 펼치고 나머지를 접는다.
 */
export async function fetchMigratoryPointChannels(): Promise<MigratoryPointChannelList> {
  const { data } = await api.get(demoPath('/migratory-fish-points/channels'));
  const result = data.data as MigratoryPointChannelList | undefined;
  return {
    totalPointCount: result?.totalPointCount ?? 0,
    totalVideoCount: result?.totalVideoCount ?? 0,
    channels: result?.channels ?? [],
  };
}

/**
 * 지도에서 핀을 눌렀을 때 받는 포인트 설명.
 * 마커 목록에 설명을 싣지 않는 이유는 서버 DTO 주석 참고(400곳 전체 payload·캐시가 부푼다).
 */
export interface MigratoryFishPointPublicDetail {
  id: string;
  name: string;
  province: Province;
  region: string;
  /** 관리자가 등록한 설명. 없으면 null — 화면은 이름만 띄운다 */
  description: string | null;
  videoCount: number;
}

/** 포인트 단건 설명 조회 — 지도 핀 클릭 시에만 호출한다 */
export async function fetchMigratoryFishPointDetail(
  id: string
): Promise<MigratoryFishPointPublicDetail> {
  const { data } = await api.get(demoPath(`/migratory-fish-points/${id}`));
  return data.data as MigratoryFishPointPublicDetail;
}

// ── 포인트 유튜브 영상 ───────────────────────────────────────────────────────

/**
 * 포인트에 등록된 유튜브 영상.
 * 화면에는 "링크" 글자만 노출하고 url 로 아웃링크한다 — 썸네일·임베드 재생은 하지 않는다.
 */
export interface MigratoryPointVideo {
  id: string;
  url: string;
  /** 영상 제목. 없을 수 있다 — 화면은 채널명으로 대체한다 */
  title: string | null;
  channelName: string;
  /** yyyy-MM-dd */
  publishedOn: string;
  startSeconds: number;
  endSeconds: number | null;
  sortOrder: number;
}

export interface MigratoryPointVideoCreateRequest {
  url: string;
  title?: string | null;
  channelName: string;
  publishedOn: string;
  startSeconds: number;
  endSeconds?: number | null;
  sortOrder?: number;
}

export interface MigratoryPointVideoUpdateRequest {
  url?: string;
  /** 빈 문자열이면 제목을 지운다 (null 로는 "유지"와 구분되지 않는다) */
  title?: string;
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
  pointId: string, page = 0, size = 5, channel?: string | null
): Promise<PageResult<MigratoryPointVideo>> {
  const { data } = await api.get(demoPath(`/migratory-fish-points/${pointId}/videos`), {
    params: { page, size, ...(channel ? { channel } : {}) },
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
