import api from './authApi';
import type { PageResult } from './noticeApi';

export interface FishingPostListItem {
  id: string;
  title: string;
  authorNickname: string;
  createdAt: string;
  photoUrls: string[];
  migratoryPointId: string | null;
  pointName: string | null;
  caughtAt: string | null;
  commentCount: number;
}

export interface FishingPostDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  authorId: string;
  createdAt: string;
  updatedAt: string | null;
  photoUrls: string[];
  migratoryPointId: string | null;
  pointName: string | null;
  caughtAt: string | null;
  lure: string | null;
  fishSize: string | null;
  action: string | null;
}

export async function getFishingPostsPreview(): Promise<FishingPostListItem[]> {
  const { data } = await api.get('/fishing-posts/preview');
  return data.data as FishingPostListItem[];
}

export async function getFishingPosts(): Promise<FishingPostListItem[]> {
  return getFishingPostsPreview();
}

export async function getFishingPostsPage(
  page: number, size = 20, migratoryPointId?: string, province?: string
): Promise<PageResult<FishingPostListItem>> {
  const { data } = await api.get('/fishing-posts', { params: { page, size, migratoryPointId, province } });
  return data.data as PageResult<FishingPostListItem>;
}

export async function getFishingPostDetail(id: string): Promise<FishingPostDetail> {
  const { data } = await api.get(`/fishing-posts/${id}`);
  return data.data as FishingPostDetail;
}

export async function createFishingPost(
  title: string, content: string, photoUrls: string[] = [],
  migratoryPointId?: string, caughtAt?: string,
  lure?: string, fishSize?: string, action?: string
): Promise<string> {
  const { data } = await api.post('/fishing-posts', {
    title, content, photoUrls,
    migratoryPointId: migratoryPointId ?? null,
    caughtAt: caughtAt ?? null,
    lure: lure || null,
    fishSize: fishSize || null,
    action: action || null,
  });
  return data.data as string;
}

export async function updateFishingPost(
  id: string, title: string, content: string, photoUrls: string[] = [],
  migratoryPointId?: string | null, caughtAt?: string | null,
  lure?: string | null, fishSize?: string | null, action?: string | null
): Promise<void> {
  await api.patch(`/fishing-posts/${id}`, {
    title, content, photoUrls,
    migratoryPointId: migratoryPointId ?? null,
    caughtAt: caughtAt ?? null,
    lure: lure || null,
    fishSize: fishSize || null,
    action: action || null,
  });
}

export async function deleteFishingPost(id: string): Promise<void> {
  await api.delete(`/fishing-posts/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface FishingPostComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  deleted: boolean;
}

export async function getFishingPostComments(postId: string): Promise<FishingPostComment[]> {
  const { data } = await api.get(`/fishing-posts/${postId}/comments`);
  return data.data as FishingPostComment[];
}

export async function addFishingPostComment(
  postId: string, content: string, parentId?: string
): Promise<string> {
  const { data } = await api.post(`/fishing-posts/${postId}/comments`, { content, parentId: parentId ?? null });
  return data.data as string;
}

export async function deleteFishingPostComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/fishing-posts/${postId}/comments/${commentId}`);
}
