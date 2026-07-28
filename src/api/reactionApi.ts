import api from './authApi';

/** 게시판 2종(조황·자유) 공용 반응(따봉/다운). 백엔드 ReactionTargetType / ReactionKind 와 1:1. */
export type ReactionTargetType = 'CATCH_POST' | 'FREE_POST';
export type ReactionKind = 'LIKE' | 'DISLIKE';

/** myReaction 이 null 이면 아무 버튼도 눌리지 않은 상태다. */
export interface ReactionState {
  likeCount: number;
  dislikeCount: number;
  myReaction: ReactionKind | null;
}

/**
 * 반응 토글 — 같은 버튼을 다시 누르면 취소되고, 반대 버튼을 누르면 전환된다.
 * 따봉이 새로 생기면 게시물 작성자에게 알림이 나간다(같은 사람은 게시물당 1회만).
 */
export async function reactToPost(
  targetType: ReactionTargetType,
  targetId: string,
  kind: ReactionKind,
): Promise<ReactionState> {
  const { data } = await api.post('/reactions', { targetType, targetId, kind });
  return data.data as ReactionState;
}
