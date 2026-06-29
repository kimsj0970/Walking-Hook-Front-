import api from './authApi';

export interface NoticeListItem {
  id: string;
  title: string;
  authorNickname: string;
  createdAt: string;
  photoUrls: string[];
  commentCount: number;
}

export interface NoticeDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  photoUrls: string[];
  createdAt: string;
  updatedAt: string | null;
}

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function getNoticesPreview(): Promise<NoticeListItem[]> {
  const { data } = await api.get('/notices/preview');
  return data.data as NoticeListItem[];
}

export async function getNotices(): Promise<NoticeListItem[]> {
  return getNoticesPreview();
}

export async function getNoticesPage(page: number, size = 20): Promise<PageResult<NoticeListItem>> {
  const { data } = await api.get('/notices', { params: { page, size } });
  return data.data as PageResult<NoticeListItem>;
}

export async function getNoticeDetail(id: string): Promise<NoticeDetail> {
  const { data } = await api.get(`/notices/${id}`);
  return data.data as NoticeDetail;
}

export async function createNotice(title: string, content: string, photoUrls: string[] = []): Promise<string> {
  const { data } = await api.post('/admin/notices', { title, content, photoUrls });
  return data.data as string;
}

export async function updateNotice(id: string, title: string, content: string, photoUrls: string[] = []): Promise<void> {
  await api.patch(`/admin/notices/${id}`, { title, content, photoUrls });
}

export async function deleteNotice(id: string): Promise<void> {
  await api.delete(`/admin/notices/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface NoticeComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
}

export async function getNoticeComments(noticeId: string): Promise<NoticeComment[]> {
  const { data } = await api.get(`/notices/${noticeId}/comments`);
  return data.data as NoticeComment[];
}

export async function addNoticeComment(
  noticeId: string, content: string, parentId?: string
): Promise<string> {
  const { data } = await api.post(`/notices/${noticeId}/comments`, { content, parentId: parentId ?? null });
  return data.data as string;
}

export async function deleteNoticeComment(noticeId: string, commentId: string): Promise<void> {
  await api.delete(`/notices/${noticeId}/comments/${commentId}`);
}
