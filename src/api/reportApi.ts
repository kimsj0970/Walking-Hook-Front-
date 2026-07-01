import api from './authApi';
import { deleteFishingPost } from './fishingPostApi';
import { deleteMigratoryPost } from './migratoryPostApi';

export type PostType = 'FISHING_POST' | 'MIGRATORY_POST' | 'FISHING_COMMENT' | 'MIGRATORY_COMMENT';

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
  FISHING_POST:      '조황 게시판',
  MIGRATORY_POST:    '회유성 조황',
  FISHING_COMMENT:   '조황 댓글',
  MIGRATORY_COMMENT: '회유성 댓글',
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

export async function adminDeleteFishingPost(id: string): Promise<void> {
  await deleteFishingPost(id);
}

export async function adminDeleteMigratoryPost(id: string): Promise<void> {
  await deleteMigratoryPost(id);
}

export async function adminDeleteFishingComment(commentId: string): Promise<void> {
  await api.delete(`/admin/fishing-post-comments/${commentId}`);
}

export async function adminDeleteMigratoryComment(commentId: string): Promise<void> {
  await api.delete(`/admin/migratory-post-comments/${commentId}`);
}

/** @deprecated use fetchReportsByContent */
export const fetchReportsByPost = fetchReportsByContent;
