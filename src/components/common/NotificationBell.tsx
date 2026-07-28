import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getNotifications, getUnreadNotificationCount, markAllNotificationsRead, notificationMessage,
  type AppNotification, type NotificationTargetType,
} from '../../api/notificationApi';
import styles from './NotificationBell.module.css';

const PAGE_SIZE = 20;
/** 앱은 FCM 푸시로 즉시 갱신되지만 웹은 밀어줄 채널이 없어 주기적으로 센다. */
const POLL_MS = 60_000;

/** 알림 대상 → 해당 게시판 라우트. 각 페이지가 location.state.openPostId 로 상세를 연다. */
const ROUTE_BY_TARGET: Record<NotificationTargetType, string> = {
  CATCH_POST: '/catch-posts',
  FREE_POST: '/free-posts',
  NOTICE: '/notices',
  INQUIRY: '/inquiry',
};

const ICON_BY_TYPE = { COMMENT: '💬', REPLY: '↩️', LIKE: '👍' } as const;

function formatWhen(iso: string) {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffMin < 60 * 24) return `${Math.floor(diffMin / 60)}시간 전`;
  if (diffMin < 60 * 24 * 7) return `${Math.floor(diffMin / (60 * 24))}일 전`;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * 헤더의 종 아이콘 + 안읽은 개수 배지. 앱의 NotificationBell 과 같은 동작이다.
 * 안읽은 알림만 보여준다 — 열면 목록을 받아온 뒤 전부 읽음 처리하므로,
 * 지금 보고 있는 알림들은 다음에 열었을 때 목록에서 사라진다(배지도 0 이 된다).
 * 읽음 처리는 반드시 목록을 받아온 "뒤에" 해야 방금 온 알림이 빈 목록으로 보이지 않는다.
 * 비로그인이면 알림이 존재할 수 없고 API 도 인증이 필요하므로 아예 렌더링하지 않는다.
 */
export default function NotificationBell() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  // 배지 개수 폴링 — 실패해도 조용히 넘어간다(배지는 부가 정보다).
  useEffect(() => {
    if (!isLoggedIn) { setUnread(0); setOpen(false); return; }
    let alive = true;
    const tick = () => { getUnreadNotificationCount().then(c => { if (alive) setUnread(c); }).catch(() => {}); };
    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [isLoggedIn]);

  // 바깥 클릭 / ESC 로 닫기
  useEffect(() => {
    if (!open) return;
    const onClickOut = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOut);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOut);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getNotifications(0, PAGE_SIZE, true);
      setItems(result.content);
      setPage(result.page);
      setHasNext(result.page + 1 < result.totalPages);
    } catch {
      setError('알림을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
    // 읽음 처리 실패는 배지가 잠깐 남을 뿐이라 조용히 넘어간다.
    try { await markAllNotificationsRead(); setUnread(0); } catch { /* noop */ }
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) loadFirstPage();
  };

  const loadMore = async () => {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const result = await getNotifications(page + 1, PAGE_SIZE, true);
      setItems(prev => [...prev, ...result.content]);
      setPage(result.page);
      setHasNext(result.page + 1 < result.totalPages);
    } catch {
      // 추가 로드 실패는 이미 보고 있는 목록을 유지한 채 멈춘다.
    } finally {
      setLoadingMore(false);
    }
  };

  const openTarget = (n: AppNotification) => {
    setOpen(false);
    navigate(ROUTE_BY_TARGET[n.targetType] ?? '/', { state: { openPostId: n.targetId } });
  };

  if (!isLoggedIn) return null;

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        className={styles.bellBtn}
        onClick={toggleOpen}
        aria-label={unread > 0 ? `알림 ${unread}개` : '알림'}
        aria-expanded={open}
        title="알림"
      >
        🔔
        {unread > 0 && <span className={styles.badge}>{unread > 99 ? '99+' : unread}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="알림 목록">
          <div className={styles.panelHeader}>
            <span>알림</span>
            {items.length > 0 && <span className={styles.panelCount}>새 알림 {items.length}건</span>}
          </div>

          {loading ? (
            <p className={styles.state}>불러오는 중...</p>
          ) : error ? (
            <p className={styles.state}>{error}</p>
          ) : items.length === 0 ? (
            <p className={styles.state}>새로 온 알림이 없습니다.</p>
          ) : (
            <>
              <div className={styles.list}>
                {items.map(n => (
                  <button
                    key={n.id}
                    className={`${styles.item} ${n.isRead ? '' : styles.itemUnread}`}
                    onClick={() => openTarget(n)}
                  >
                    <span className={styles.itemIcon}>{ICON_BY_TYPE[n.type] ?? '💬'}</span>
                    <span className={styles.itemBody}>
                      <p className={styles.itemMessage}>{notificationMessage(n)}</p>
                      <span className={styles.itemDate}>{formatWhen(n.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
              {hasNext && (
                <button className={styles.moreBtn} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore ? '불러오는 중...' : '더 보기'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
