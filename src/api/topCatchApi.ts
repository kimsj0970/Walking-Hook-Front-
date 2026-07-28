import api from './authApi';

export type TopCatchPostType = 'MIGRATORY' | 'FISHING';

export interface TopCatch {
  hasData: boolean;
  postType: TopCatchPostType | null;
  postId: string | null;
  title: string | null;
  authorNickname: string | null;
  fishSizeCm: number | null;
}

/** 이번 달(잡은 날짜 기준) 최대어 — 조황 게시물 중 크기가 가장 큰 게시물. 메인 페이지 배너용 */
export async function getThisMonthTopCatch(): Promise<TopCatch> {
  const { data } = await api.get('/top-catch/this-month');
  return data.data as TopCatch;
}
