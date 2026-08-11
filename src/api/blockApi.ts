import api from './authApi';

// 사용자 차단. 적용은 상호다 — 어느 쪽이 차단했든 서로의 게시글·댓글이 목록에서
// 사라지고, 서로의 게시물에 댓글을 달 수 없으며(403), 상세도 403 이 된다.
// 필터링·차단 검사는 전부 서버가 하므로 웹에서 따로 걸러낼 필요가 없다.
// 상대에게는 알림이 가지 않는다.
// 앱(app-flutter)의 core/repositories/block_repository.dart 와 같은 엔드포인트를 쓴다.

export interface BlockedUser {
  userId: string;
  nickname: string;
  blockedAt: string;
}

/** 이미 차단한 상대여도 서버가 성공으로 처리한다(멱등). */
export async function blockUser(userId: string): Promise<void> {
  await api.post(`/blocks/${userId}`);
}

export async function unblockUser(userId: string): Promise<void> {
  await api.delete(`/blocks/${userId}`);
}

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const { data } = await api.get('/blocks');
  return data.data as BlockedUser[];
}
