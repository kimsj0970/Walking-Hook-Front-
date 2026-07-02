import api from './authApi';
import type { MigratorySpecies } from './migratoryFishPointApi';

export interface MigratoryPostListItem {
  id: string;
  title: string;
  authorNickname: string;
  species: MigratorySpecies[];
  speciesDisplayNames: string[];
  caughtAt: string;
  pointName: string | null;
  photoUrls: string[];
  createdAt: string;
  commentCount: number;
}

export interface MigratoryPostDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  authorId: string;
  species: MigratorySpecies[];
  speciesDisplayNames: string[];
  caughtAt: string;
  migratoryPointId: string | null;
  pointName: string | null;
  pointLatitude: number | null;
  pointLongitude: number | null;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string | null;
  lure: string | null;
  fishSize: string | null;
  action: string | null;
}

export interface PostSummary {
  postId: string;
  title: string;
  authorNickname: string;
  species: MigratorySpecies[];
  speciesDisplayNames: string[];
}

export interface TodayMigratoryMapMarker {
  migratoryPointId: string;
  pointName: string | null;
  latitude: number | null;
  longitude: number | null;
  species: MigratorySpecies[];
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

export interface MigratoryPostCreateRequest {
  title: string;
  content: string;
  species: MigratorySpecies[];
  caughtAt?: string;
  migratoryPointId?: string;
  photoUrls?: string[];
  lure?: string | null;
  fishSize?: string | null;
  action?: string | null;
}

export interface MigratoryPostUpdateRequest {
  title?: string;
  content?: string;
  species?: MigratorySpecies[];
  caughtAt?: string;
  photoUrls?: string[];
  lure?: string | null;
  fishSize?: string | null;
  action?: string | null;
}

export async function getMigratoryPostsPage(
  page = 0, size = 20, migratoryPointId?: string, province?: string
): Promise<PageResult<MigratoryPostListItem>> {
  const { data } = await api.get('/migratory-catch-posts', { params: { page, size, migratoryPointId, province } });
  return data.data as PageResult<MigratoryPostListItem>;
}

export async function getMigratoryPostDetail(id: string): Promise<MigratoryPostDetail> {
  const { data } = await api.get(`/migratory-catch-posts/${id}`);
  return data.data as MigratoryPostDetail;
}

export async function getTodayMigratoryMarkers(): Promise<TodayMigratoryMapMarker[]> {
  const { data } = await api.get('/migratory-catch-posts/map/today');
  return (data.data ?? []) as TodayMigratoryMapMarker[];
}

export async function getTodayMigratoryPostsByPoint(
  pointId: string, page = 0, size = 3
): Promise<PageResult<PostSummary>> {
  const { data } = await api.get(`/migratory-catch-posts/points/${pointId}/today-posts`, {
    params: { page, size },
  });
  return data.data as PageResult<PostSummary>;
}

export async function createMigratoryPost(req: MigratoryPostCreateRequest): Promise<string> {
  const { data } = await api.post('/migratory-catch-posts', req);
  return data.data as string;
}

export async function updateMigratoryPost(id: string, req: MigratoryPostUpdateRequest): Promise<void> {
  await api.patch(`/migratory-catch-posts/${id}`, req);
}

export async function deleteMigratoryPost(id: string): Promise<void> {
  await api.delete(`/migratory-catch-posts/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface MigratoryPostComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  deleted: boolean;
}

export async function getMigratoryPostComments(postId: string): Promise<MigratoryPostComment[]> {
  const { data } = await api.get(`/migratory-catch-posts/${postId}/comments`);
  return data.data as MigratoryPostComment[];
}

export async function addMigratoryPostComment(
  postId: string, content: string, parentId?: string
): Promise<string> {
  const { data } = await api.post(`/migratory-catch-posts/${postId}/comments`, {
    content, parentId: parentId ?? null,
  });
  return data.data as string;
}

export async function deleteMigratoryPostComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/migratory-catch-posts/${postId}/comments/${commentId}`);
}
