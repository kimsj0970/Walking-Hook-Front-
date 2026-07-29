import api from './authApi';

// 사용자 차단. 차단하면 그 사람의 게시글·댓글이 목록에서 사라진다 — 필터링은 서버가
// 하므로 웹에서 따로 걸러낼 필요가 없다. 상대에게는 알림이 가지 않는다.
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
