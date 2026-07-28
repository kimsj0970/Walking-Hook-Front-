import api from './authApi';
import { deleteCatchPost } from './catchPostApi';
import { deleteFreePost } from './freePostApi';

export type PostType = 'CATCH_POST' | 'FREE_POST' | 'CATCH_COMMENT' | 'FREE_COMMENT';

export const REPORT_REASON_LABELS: Record<string, string> = {
  HATE_SPEECH:        '혐오/차별적/생명경시/욕설 표현입니다.',
  SPAM:               '스팸홍보/도배입니다.',
  HARMFUL_TO_MINORS:  '청소년에게 유해한 내용입니다.',
  ILLEGAL_CONTENT:    '불법정보를 포함하고 있습니다.',
  OBSCENE_CONTENT:    '음란물입니다.',
  OFFENSIVE_CONTENT:  '불쾌한 표현이 있습니다.',
};

export const REPORT_REASON_KEYS = Object.keys(REPORT_REASON_LABELS);

export const POST_TYPE_LABELS: Record<PostType, string> = {
  CATCH_POST:    '조황 게시판',
  FREE_POST:     '자유게시판',
  CATCH_COMMENT: '조황 댓글',
  FREE_COMMENT:  '자유게시판 댓글',
};

export interface ReportedPostSummary {
  postId: string;
  postType: PostType;
  postTitle: string;
  parentPostId: string | null;
  reportCount: number;
  latestReportedAt: string;
}

export interface ReportItem {
  reportId: string;
  reporterNickname: string;
  reasons: string[];
  customReason: string | null;
  reportedAt: string;
}

export async function createReport(
  postType: PostType,
  postId: string,
  postTitle: string,
  reasons: string[],
  customReason?: string,
  parentPostId?: string | null,
): Promise<void> {
  await api.post('/reports', {
    postType, postId, postTitle,
    parentPostId: parentPostId ?? null,
    reasons,
    customReason: customReason ?? null,
  });
}

export async function fetchReportedPosts(): Promise<ReportedPostSummary[]> {
  const { data } = await api.get('/admin/reports/posts');
  return data.data as ReportedPostSummary[];
}

export async function fetchReportedComments(): Promise<ReportedPostSummary[]> {
  const { data } = await api.get('/admin/reports/comments');
  return data.data as ReportedPostSummary[];
}

export async function fetchReportsByContent(contentId: string): Promise<ReportItem[]> {
  const { data } = await api.get(`/admin/reports/${contentId}`);
  return data.data as ReportItem[];
}

/** 신고 제외 — 해당 콘텐츠의 신고를 모두 지워 목록에서 제거(본문은 유지) */
export async function dismissReports(contentId: string): Promise<void> {
  await api.delete(`/admin/reports/${contentId}`);
}

export async function adminDeleteCatchPost(id: string): Promise<void> {
  await deleteCatchPost(id);
}

export async function adminDeleteCatchComment(commentId: string): Promise<void> {
  await api.delete(`/admin/catch-post-comments/${commentId}`);
}

export async function adminDeleteFreePost(id: string): Promise<void> {
  await deleteFreePost(id);
}

export async function adminDeleteFreeComment(commentId: string): Promise<void> {
  await api.delete(`/admin/free-post-comments/${commentId}`);
}

/** @deprecated use fetchReportsByContent */
export const fetchReportsByPost = fetchReportsByContent;

// ─────────────────────────────────────────────────────────────
// 신고된 후 삭제(soft delete)된 콘텐츠 관리 (관리자)
// ─────────────────────────────────────────────────────────────

/** 목록 항목 — deletedBySelf=false면 관리자/탈퇴 등에 의한 삭제 */
export interface DeletedContentSummary {
  postType: PostType;
  contentId: string;
  title: string | null;      // 댓글은 null
  preview: string | null;    // 본문 요약(최대 120자)
  parentPostId: string | null;
  authorNickname: string;
  reportCount: number;
  latestReportedAt: string;
  deletedAt: string;
  deletedBy: string | null;
  deletedBySelf: boolean;
}

export interface DeletedReportInfo {
  reporterNickname: string;
  reasons: string[];
  customReason: string | null;
  reportedAt: string;
}

export interface DeletedContentDetail {
  postType: PostType;
  contentId: string;
  title: string | null;
  content: string;
  authorId: string;
  authorNickname: string;
  parentPostId: string | null;
  createdAt: string;
  deletedAt: string;
  deletedBy: string | null;
  deletedBySelf: boolean;
  reports: DeletedReportInfo[];
}

/** 신고된 후 삭제된 콘텐츠 목록 */
export async function fetchDeletedReportedContents(): Promise<DeletedContentSummary[]> {
  const { data } = await api.get('/admin/deleted-contents');
  return data.data as DeletedContentSummary[];
}

/** 상세(본문 전문 + 신고 내역) — 열람 */
export async function fetchDeletedContentDetail(
  postType: PostType,
  contentId: string,
): Promise<DeletedContentDetail> {
  const { data } = await api.get(`/admin/deleted-contents/${postType}/${contentId}`);
  return data.data as DeletedContentDetail;
}

/** 복구(soft delete 취소) */
export async function restoreDeletedContent(postType: PostType, contentId: string): Promise<void> {
  await api.post(`/admin/deleted-contents/${postType}/${contentId}/restore`);
}

/** 영구삭제(hard delete) — ADMIN 전용 */
export async function hardDeleteContent(postType: PostType, contentId: string): Promise<void> {
  await api.delete(`/admin/deleted-contents/${postType}/${contentId}`);
}
