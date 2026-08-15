import api from './authApi';
import type { FishSpecies } from './fishSpecies';
import type { Province } from './fishingPointApi';
import type { ReactionKind } from './reactionApi';

/**
 * 조황 게시판 (`/catch-posts`).
 * 기존 조황/회유성 조황 게시판이 하나로 합쳐진 것이다.
 */

/**
 * 게시물에 달린 어종 한 건.
 * `code` 가 null 이면 사용자가 어종 목록에 없는 어종을 직접 입력한 것이다 —
 * 표시는 항상 `name`, 필터·배지 구분은 `code` 로 한다.
 */
export interface CatchSpecies {
  code: FishSpecies | null;
  name: string;
}

export interface CatchPostListItem {
  id: string;
  title: string;
  authorNickname: string;
  species: CatchSpecies[];
  caughtAt: string;
  pointName: string | null;
  province: Province | null;
  photoUrls: string[];
  createdAt: string;
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
}

export interface CatchPostDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  authorId: string;
  species: CatchSpecies[];
  caughtAt: string;
  migratoryPointId: string | null;
  pointName: string | null;
  province: Province | null;
  pointLatitude: number | null;
  pointLongitude: number | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string | null;
  lure: string | null;
  fishSizeCm: number | null;
  action: string | null;
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionKind | null;
}

export interface PostSummary {
  postId: string;
  title: string;
  authorNickname: string;
  species: CatchSpecies[];
  caughtAt: string | null;
}

/**
 * "이번 주 조황" 지도 마커 하나.
 * `species` 는 서버가 최대 3종까지만 담아 보내고, 실제 종류 수는 `totalSpeciesCount` 로 온다 —
 * 차이만큼 "+N" 으로 표시한다. `latestCaughtAt` 은 요일 라벨용이다.
 */
export interface WeeklyCatchMapMarker {
  migratoryPointId: string;
  pointName: string | null;
  province: Province | null;
  latitude: number | null;
  longitude: number | null;
  species: CatchSpecies[];
  totalSpeciesCount: number;
  latestCaughtAt: string | null;
  posts: PostSummary[];
  totalPostCount: number;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CatchPostCreateRequest {
  title: string;
  content: string;
  /** 어종명 목록. 목록에서 고른 것과 직접 입력한 것을 구분하지 않고 이름만 보낸다. */
  species: string[];
  caughtAt?: string;
  migratoryPointId?: string;
  /**
   * 지역(시/도). 포인트를 못 골랐을 때 이것만이라도 있으면 지역 필터에서 찾을 수 있다.
   * migratoryPointId 가 함께 있으면 서버가 그 포인트의 지역으로 덮어쓴다.
   */
  province?: Province;
  photoUrls?: string[];
  lure?: string | null;
  fishSizeCm?: number | null;
  action?: string | null;
}

export interface CatchPostUpdateRequest {
  title?: string;
  content?: string;
  /** 안 보내면(undefined) 기존 어종을 그대로 둔다. */
  species?: string[];
  caughtAt?: string;
  photoUrls?: string[];
  lure?: string | null;
  fishSizeCm?: number | null;
  action?: string | null;
}

export interface CatchPostPageParams {
  page?: number;
  size?: number;
  migratoryPointId?: string;
  province?: string;
  year?: number;
  month?: number;
  /** 고른 어종들. 비어 있으면 전체 어종. */
  species?: FishSpecies[];
  /** 어종 필터 "기타" — 목록에 없는 어종을 직접 입력한 글만. */
  customSpeciesOnly?: boolean;
}

export async function getCatchPostsPage({
  page = 0,
  size = 20,
  migratoryPointId,
  province,
  year,
  month,
  species,
  customSpeciesOnly,
}: CatchPostPageParams = {}): Promise<PageResult<CatchPostListItem>> {
  const { data } = await api.get('/catch-posts', {
    params: {
      page,
      size,
      migratoryPointId,
      province,
      year,
      month,
      // axios 는 배열을 species=A&species=B 로 펼쳐 보낸다.
      species: species && species.length > 0 ? species : undefined,
      customSpeciesOnly: customSpeciesOnly ? true : undefined,
    },
  });
  return data.data as PageResult<CatchPostListItem>;
}

export async function getCatchPostDetail(id: string): Promise<CatchPostDetail> {
  const { data } = await api.get(`/catch-posts/${id}`);
  return data.data as CatchPostDetail;
}

export interface CatchPostMapPoint {
  pointId: string;
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  postCount: number;
}

/** 조황 게시물이 하나 이상 존재하는 포인트만 지도 마커로 조회 */
export async function getCatchPostMapPoints(): Promise<CatchPostMapPoint[]> {
  const { data } = await api.get('/catch-posts/map/points');
  return (data.data ?? []) as CatchPostMapPoint[];
}

/** 이번 주(월~일) 조황이 올라온 포인트 마커 */
export async function getWeeklyCatchMarkers(): Promise<WeeklyCatchMapMarker[]> {
  const { data } = await api.get('/catch-posts/map/week');
  return (data.data ?? []) as WeeklyCatchMapMarker[];
}

export async function getWeeklyCatchPostsByPoint(
  pointId: string, page = 0, size = 3
): Promise<PageResult<PostSummary>> {
  const { data } = await api.get(`/catch-posts/points/${pointId}/week-posts`, {
    params: { page, size },
  });
  return data.data as PageResult<PostSummary>;
}

export async function createCatchPost(req: CatchPostCreateRequest): Promise<string> {
  const { data } = await api.post('/catch-posts', req);
  return data.data as string;
}

export async function updateCatchPost(id: string, req: CatchPostUpdateRequest): Promise<void> {
  await api.patch(`/catch-posts/${id}`, req);
}

export async function deleteCatchPost(id: string): Promise<void> {
  await api.delete(`/catch-posts/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface CatchPostComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  deleted: boolean;
}

export async function getCatchPostComments(postId: string): Promise<CatchPostComment[]> {
  const { data } = await api.get(`/catch-posts/${postId}/comments`);
  return data.data as CatchPostComment[];
}

export async function addCatchPostComment(
  postId: string, content: string, parentId?: string
): Promise<string> {
  const { data } = await api.post(`/catch-posts/${postId}/comments`, {
    content, parentId: parentId ?? null,
  });
  return data.data as string;
}

export async function deleteCatchPostComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/catch-posts/${postId}/comments/${commentId}`);
}
