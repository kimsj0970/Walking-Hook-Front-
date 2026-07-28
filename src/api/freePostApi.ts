import api from './authApi';
import type { PageResult } from './noticeApi';
import type { ReactionKind } from './reactionApi';

export interface FreePostListItem {
  id: string;
  title: string;
  authorNickname: string;
  createdAt: string;
  photoUrls: string[];
  commentCount: number;
  likeCount: number;
  dislikeCount: number;
}

export interface FreePostDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  authorId: string;
  createdAt: string;
  updatedAt: string | null;
  photoUrls: string[];
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionKind | null;
}

export async function getFreePostsPreview(): Promise<FreePostListItem[]> {
  const { data } = await api.get('/free-posts/preview');
  return data.data as FreePostListItem[];
}

export async function getFreePostsPage(
  page: number, size = 20, year?: number, month?: number,
): Promise<PageResult<FreePostListItem>> {
  const params: Record<string, number> = { page, size };
  if (year != null && month != null) { params.year = year; params.month = month; }
  const { data } = await api.get('/free-posts', { params });
  return data.data as PageResult<FreePostListItem>;
}

export async function getFreePostDetail(id: string): Promise<FreePostDetail> {
  const { data } = await api.get(`/free-posts/${id}`);
  return data.data as FreePostDetail;
}

export async function createFreePost(title: string, content: string, photoUrls: string[] = []): Promise<string> {
  const { data } = await api.post('/free-posts', { title, content, photoUrls });
  return data.data as string;
}

export async function updateFreePost(id: string, title: string, content: string, photoUrls: string[] = []): Promise<void> {
  await api.patch(`/free-posts/${id}`, { title, content, photoUrls });
}

export async function deleteFreePost(id: string): Promise<void> {
  await api.delete(`/free-posts/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface FreePostComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  deleted: boolean;
}

export async function getFreePostComments(postId: string): Promise<FreePostComment[]> {
  const { data } = await api.get(`/free-posts/${postId}/comments`);
  return data.data as FreePostComment[];
}

export async function addFreePostComment(
  postId: string, content: string, parentId?: string
): Promise<string> {
  const { data } = await api.post(`/free-posts/${postId}/comments`, { content, parentId: parentId ?? null });
  return data.data as string;
}

export async function deleteFreePostComment(postId: string, commentId: string): Promise<void> {
  await api.delete(`/free-posts/${postId}/comments/${commentId}`);
}
