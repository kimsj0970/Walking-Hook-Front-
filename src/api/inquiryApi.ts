import api from './authApi';

export interface InquiryListItem {
  id: string;
  /** 타 사용자 문의는 서버에서 null 로 내려옴 (제목 비공개) */
  title: string | null;
  authorNickname: string;
  createdAt: string;
  photoCount: number;
  commentCount: number;
}

/** 관리자 전용 목록 — 닉네임 + 카카오 실명 포함 */
export interface AdminInquiryListItem {
  id: string;
  title: string;
  authorNickname: string;
  authorRealName: string;
  createdAt: string;
  photoCount: number;
  commentCount: number;
}

export interface InquiryDetail {
  id: string;
  authorId: string;
  title: string;
  content: string;
  authorNickname: string;
  /** 관리자에게만 반환. 일반 사용자는 null */
  authorRealName: string | null;
  photoUrls: string[];
  createdAt: string;
}

/** 문의 등록 */
export async function createInquiry(title: string, content: string, photoUrls: string[] = []): Promise<string> {
  const { data } = await api.post('/inquiries', { title, content, photoUrls });
  return data.data as string;
}

/** 전체 문의 목록 조회 (목록만, 내용 없음) */
export async function getInquiries(): Promise<InquiryListItem[]> {
  const { data } = await api.get('/inquiries');
  return data.data as InquiryListItem[];
}

/** @deprecated 내 문의 목록 조회 — getInquiries() 사용 권장 */
export async function getMyInquiries(): Promise<InquiryListItem[]> {
  return getInquiries();
}

/** 전체 문의 목록 조회 (관리자) — 닉네임 + 실명 모두 포함 */
export async function getAllInquiries(): Promise<AdminInquiryListItem[]> {
  const { data } = await api.get('/admin/inquiries');
  return data.data as AdminInquiryListItem[];
}

/** 문의 상세 조회 */
export async function getInquiryDetail(id: string): Promise<InquiryDetail> {
  const { data } = await api.get(`/inquiries/${id}`);
  return data.data as InquiryDetail;
}

/** 문의 수정 (본인) */
export async function updateInquiry(id: string, title: string, content: string, photoUrls: string[] = []): Promise<void> {
  await api.put(`/inquiries/${id}`, { title, content, photoUrls });
}

/** 문의 삭제 (본인) */
export async function deleteMyInquiry(id: string): Promise<void> {
  await api.delete(`/inquiries/${id}`);
}

/** 문의 삭제 (관리자 전용) */
export async function deleteInquiry(id: string): Promise<void> {
  await api.delete(`/admin/inquiries/${id}`);
}

// ── 댓글 ─────────────────────────────────────────────────────────────────────

export interface InquiryComment {
  id: string;
  authorId: string;
  authorNickname: string;
  parentId: string | null;
  content: string;
  createdAt: string;
}

export async function getInquiryComments(inquiryId: string): Promise<InquiryComment[]> {
  const { data } = await api.get(`/inquiries/${inquiryId}/comments`);
  return data.data as InquiryComment[];
}

export async function addInquiryComment(
  inquiryId: string,
  content: string,
  parentId?: string
): Promise<string> {
  const { data } = await api.post(`/inquiries/${inquiryId}/comments`, { content, parentId: parentId ?? null });
  return data.data as string;
}

export async function deleteInquiryComment(inquiryId: string, commentId: string): Promise<void> {
  await api.delete(`/inquiries/${inquiryId}/comments/${commentId}`);
}
