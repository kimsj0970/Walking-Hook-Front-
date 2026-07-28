import api from './authApi';
import type { PageResult } from './noticeApi';

/** 백엔드 NotificationType 과 1:1. */
export type NotificationType = 'COMMENT' | 'REPLY' | 'LIKE';

/** 백엔드 NotificationTargetType 과 1:1. */
export type NotificationTargetType =
  | 'CATCH_POST' | 'FREE_POST' | 'NOTICE' | 'INQUIRY';

/**
 * 인앱 알림 한 건. 문구는 서버가 아니라 화면이 조립한다(NotificationResponse 주석의 규약).
 * LIKE 알림에는 댓글이 없어 commentId 가 null 이다.
 */
export interface AppNotification {
  id: string;
  type: NotificationType;
  actorNickname: string;
  targetType: NotificationTargetType;
  targetId: string;
  commentId: string | null;
  isRead: boolean;
  createdAt: string;
}

export function notificationMessage(n: AppNotification): string {
  switch (n.type) {
    case 'REPLY': return `${n.actorNickname}님이 내 댓글에 답글을 달았습니다`;
    case 'LIKE':  return `${n.actorNickname}님이 내 게시물을 추천했습니다`;
    default:      return `${n.actorNickname}님이 내 게시물에 댓글을 달았습니다`;
  }
}

/**
 * 알림 목록. unreadOnly=true 면 안읽은 것만 — 종을 눌러 여는 알림함이 쓰는 모드로,
 * 한 번 열어 읽음 처리된 알림은 다음에 열었을 때 목록에서 사라진다.
 */
export async function getNotifications(
  page = 0, size = 20, unreadOnly = false,
): Promise<PageResult<AppNotification>> {
  const { data } = await api.get('/notifications', { params: { page, size, unreadOnly } });
  return data.data as PageResult<AppNotification>;
}

/** 종 배지용 안읽은 개수 — 로그인 상태에서 주기적으로 폴링한다. */
export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await api.get('/notifications/unread-count');
  return (data.data as { count: number }).count ?? 0;
}

/** 알림 목록을 열었을 때 호출 — 안읽은 알림을 전부 읽음 처리한다. */
export async function markAllNotificationsRead(): Promise<void> {
  await api.patch('/notifications/read-all');
}
