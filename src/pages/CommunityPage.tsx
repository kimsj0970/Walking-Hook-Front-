import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Pagination from '../components/common/Pagination';
import PostFormModal from '../components/common/PostFormModal';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  getCatchPostsPage, getCatchPostDetail, deleteCatchPost,
  type CatchPostListItem, type CatchPostDetail,
} from '../api/catchPostApi';
import {
  getNoticesPreview, getNoticesPage, getNoticeDetail, createNotice, updateNotice, deleteNotice,
  type NoticeListItem, type NoticeDetail,
} from '../api/noticeApi';
import {
  getFreePostsPreview,
  type FreePostListItem,
} from '../api/freePostApi';
import ReportModal from '../components/common/ReportModal';
import styles from './CommunityPage.module.css';

/* ── 조황 작성/수정 모달 ──────────────────────────────────────────── */
const ADMIN_NICKNAMES = ['운영자', '관리자', 'admin', 'Admin'];

function AuthorLabel({ nickname }: { nickname: string }) {
  return ADMIN_NICKNAMES.includes(nickname)
    ? <span className={styles.authorNicknameAdmin}>{nickname}</span>
    : <span className={styles.authorNickname}>{nickname}</span>;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

type BoardView = 'list' | 'detail';

/* ─────────────────────────────────────────────────────────── */
/* 조황 게시판                                                  */
/* ─────────────────────────────────────────────────────────── */
export function FishingBoard({ isLoggedIn, className, navigateOnClick }: { isLoggedIn: boolean; className?: string; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const { userId, isAdmin, isModerator } = useAuth();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<CatchPostListItem[]>([]);
  const [detail, setDetail] = useState<CatchPostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchList = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      if (navigateOnClick) {
        setItems((await getCatchPostsPage({ page: 0, size: 5 })).content);
      } else {
        const result = await getCatchPostsPage({ page, size: 10 });
        setItems(result.content);
        setTotalPages(result.totalPages);
        setCurrentPage(result.page);
      }
    }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, [navigateOnClick]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getCatchPostDetail(id)); }
    catch { setError('게시글을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  // 조황 글은 어종 입력이 필요해 작성·수정 폼을 조황 게시판 페이지 한 곳에서만 관리한다.
  const openCreate = () => navigate('/catch-posts', { state: { openWrite: true } });
  const openEdit   = () => { if (detail) navigate('/catch-posts', { state: { openPostId: detail.id } }); };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try { await deleteCatchPost(detail.id); await fetchList(currentPage); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  return (
    <div className={`${styles.section} ${className ?? ''}`}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => view === 'list' && navigate('/catch-posts')}
          title="전체 조황 게시판 보기"
        >
          🐟 조황 게시판
          <span className={styles.moreArrow}>›</span>
        </h2>
        {view === 'list' && isLoggedIn && (
          <button className={styles.writeBtn} onClick={openCreate}>글쓰기</button>
        )}
        {view === 'detail' && (
          <button className={styles.backBtn} onClick={() => setView('list')}>← 목록</button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {view === 'list' && (
        loading ? <p className={styles.empty}>불러오는 중...</p>
        : items.length === 0 ? <p className={styles.empty}>아직 게시글이 없습니다. 첫 번째 조황을 공유해 보세요!</p>
        : <>
            <div className={styles.board}>
              {items.map(item => (
                <div key={item.id} className={styles.boardItem}
                  onClick={() => {
                    if (!isLoggedIn) { navigate('/login'); return; }
                    if (navigateOnClick) navigate('/catch-posts', { state: { openPostId: item.id } });
                    else openDetail(item.id);
                  }}>
                  <div className={styles.boardTop}>
                    <span className={styles.boardTitle}>{item.title}</span>
                    <span className={styles.boardDate}>{item.caughtAt ?? formatDate(item.createdAt)}</span>
                  </div>
                  <div className={styles.boardBottom}>
                    {item.pointName
                      ? <span className={styles.boardPoint}>📍 {item.pointName}</span>
                      : <span />}
                    <div className={styles.boardMeta}>
                      {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷 {item.photoUrls.length}</span>}
                      {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                      {(item.likeCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>👍 {item.likeCount}</span>}
                      <AuthorLabel nickname={item.authorNickname} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {navigateOnClick ? (
              <button className={styles.moreBtn} onClick={() => navigate('/catch-posts')}>더보기</button>
            ) : totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchList}
              />
            )}
          </>
      )}

      {view === 'detail' && (
        detailLoading || !detail ? <p className={styles.empty}>불러오는 중...</p>
        : <div className={styles.detailWrap}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{detail.title}</h3>
              <div className={styles.detailMeta}>
                <AuthorLabel nickname={detail.authorNickname} />
                {detail.caughtAt && <span>🗓 {detail.caughtAt}</span>}
                {detail.pointName && <span>📍 {detail.pointName}</span>}
                <span>{formatDate(detail.createdAt)}</span>
              </div>
              {isLoggedIn && (
                <button className={styles.reportBtn} onClick={() => setReportOpen(true)}>신고하기</button>
              )}
            </div>
            {(detail.lure || detail.fishSizeCm != null || detail.action) && (
              <div className={styles.catchInfoRow}>
                {detail.lure && <span className={styles.catchInfoTag}>🎣 {detail.lure}</span>}
                {detail.fishSizeCm != null && <span className={styles.catchInfoTag}>📏 {detail.fishSizeCm}cm</span>}
                {detail.action && <span className={styles.catchInfoTag}>💫 {detail.action}</span>}
              </div>
            )}
            <p className={styles.detailContent}>{detail.content}</p>
            {detail.photoUrls?.length > 0 && (
              <div className={styles.photoGrid}>
                {detail.photoUrls.map((url, i) => (
                  <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.photo}
                    style={{ cursor: 'pointer' }} onClick={() => setLbIdx(i)} />
                ))}
              </div>
            )}
            {(detail.authorId === userId || isAdmin || isModerator) && (
              <div className={styles.detailActions}>
                <button className={styles.deleteBtn} onClick={handleDelete}>삭제</button>
                <button className={styles.editBtn} onClick={openEdit}>수정</button>
              </div>
            )}
          </div>
      )}

      {reportOpen && detail && (
        <ReportModal
          postId={detail.id}
          postType="CATCH_POST"
          postTitle={detail.title}
          onClose={() => setReportOpen(false)}
        />
      )}

      {lbIdx !== null && detail?.photoUrls && (
        <ImageLightbox
          images={detail.photoUrls}
          index={lbIdx}
          onClose={() => setLbIdx(null)}
          onPrev={() => setLbIdx(j => Math.max(0, (j ?? 0) - 1))}
          onNext={() => setLbIdx(j => Math.min(detail.photoUrls.length - 1, (j ?? 0) + 1))}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* 공지사항 게시판                                              */
/* ─────────────────────────────────────────────────────────── */
export function NoticeBoard({ isAdmin, navigateOnClick }: { isAdmin: boolean; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<NoticeListItem[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeDetail | null>(null);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchList = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      if (navigateOnClick) {
        setItems(await getNoticesPreview());
      } else {
        const result = await getNoticesPage(page, 20);
        setItems(result.content);
        setTotalPages(result.totalPages);
        setCurrentPage(result.page);
      }
    }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, [navigateOnClick]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getNoticeDetail(id)); }
    catch { setError('공지사항을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => { setEditingNotice(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingNotice(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    if (editingNotice) {
      await updateNotice(editingNotice.id, title, content, photoUrls);
      setDetail(await getNoticeDetail(editingNotice.id));
    } else {
      await createNotice(title, content, photoUrls);
      setView('list');
    }
    await fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('공지사항을 삭제하시겠습니까?')) return;
    try { await deleteNotice(detail.id); await fetchList(currentPage); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => view === 'list' && navigate('/notices')}
          title="전체 공지사항 보기"
        >
          📢 공지사항
          <span className={styles.sectionBadge}>관리자</span>
          <span className={styles.moreArrow}>›</span>
        </h2>
        {view === 'list' && isAdmin && (
          <button className={styles.writeBtn} onClick={openCreate}>+ 공지 작성</button>
        )}
        {view === 'detail' && (
          <button className={styles.backBtn} onClick={() => setView('list')}>← 목록</button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {view === 'list' && (
        loading ? <p className={styles.empty}>불러오는 중...</p>
        : items.length === 0 ? <p className={styles.empty}>등록된 공지사항이 없습니다.</p>
        : <>
            <div className={styles.board}>
              {items.map(item => (
                <div key={item.id} className={styles.boardItem}
                  onClick={() => {
                    if (!isLoggedIn) { navigate('/login'); return; }
                    if (navigateOnClick) navigate('/notices', { state: { openPostId: item.id } });
                    else openDetail(item.id);
                  }}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷</span>}
                    {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                    <AuthorLabel nickname={item.authorNickname} />
                    <span className={styles.boardDate}>{formatDate(item.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
            {navigateOnClick ? (
              <button className={styles.moreBtn} onClick={() => navigate('/notices')}>더보기</button>
            ) : totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchList}
              />
            )}
          </>
      )}

      {view === 'detail' && (
        detailLoading || !detail ? <p className={styles.empty}>불러오는 중...</p>
        : <div className={styles.detailWrap}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{detail.title}</h3>
              <div className={styles.detailMeta}>
                <AuthorLabel nickname={detail.authorNickname} />
                <span>{formatDate(detail.createdAt)}</span>
                {detail.updatedAt && detail.updatedAt !== detail.createdAt && (
                  <span>(수정됨 {formatDate(detail.updatedAt)})</span>
                )}
              </div>
            </div>
            <p className={styles.detailContent}>{detail.content}</p>
            {detail.photoUrls?.length > 0 && (
              <div className={styles.photoGrid}>
                {detail.photoUrls.map((url, i) => (
                  <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.photo}
                    style={{ cursor: 'pointer' }} onClick={() => setLbIdx(i)} />
                ))}
              </div>
            )}
            {isAdmin && (
              <div className={styles.detailActions}>
                <button className={styles.deleteBtn} onClick={handleDelete}>삭제</button>
                <button className={styles.editBtn} onClick={openEdit}>수정</button>
              </div>
            )}
          </div>
      )}

      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        modalTitle={editingNotice ? '공지 수정' : '공지 작성'}
        titlePlaceholder="공지 제목을 입력하세요"
        contentPlaceholder="공지 내용을 입력하세요"
        initialTitle={editingNotice?.title ?? ''}
        initialContent={editingNotice?.content ?? ''}
        maxPhotos={null}
        boardType="NOTICE"
        initialPhotoUrls={editingNotice?.photoUrls ?? []}
      />
      {lbIdx !== null && detail?.photoUrls && (
        <ImageLightbox
          images={detail.photoUrls}
          index={lbIdx}
          onClose={() => setLbIdx(null)}
          onPrev={() => setLbIdx(j => Math.max(0, (j ?? 0) - 1))}
          onNext={() => setLbIdx(j => Math.min(detail.photoUrls.length - 1, (j ?? 0) + 1))}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* 자유게시판                                                   */
/* ─────────────────────────────────────────────────────────── */
// 커뮤니티 페이지의 자유게시판은 최신 글 미리보기 전용이다.
// 상세/작성/댓글/신고는 모두 전용 페이지(/free-posts)에서 처리해 한 벌만 유지한다.
export function FreeBoard({ isLoggedIn }: { isLoggedIn: boolean }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<FreePostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const preview = (await getFreePostsPreview()).slice(0, 5);
        if (alive) setItems(preview);
      } catch {
        if (alive) setError('목록을 불러오지 못했습니다.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const openPost = (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    navigate('/free-posts', { state: { openPostId: id } });
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => navigate('/free-posts')}
          title="전체 자유게시판 보기"
        >
          💬 자유게시판
          <span className={styles.moreArrow}>›</span>
        </h2>
        {isLoggedIn && (
          <button className={styles.writeBtn} onClick={() => navigate('/free-posts')}>글쓰기</button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? <p className={styles.empty}>불러오는 중...</p>
        : items.length === 0 ? <p className={styles.empty}>아직 게시글이 없습니다. 첫 번째 글을 작성해 보세요!</p>
        : <>
            <div className={styles.board}>
              {items.map(item => (
                <div key={item.id} className={styles.boardItem} onClick={() => openPost(item.id)}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷 {item.photoUrls.length}</span>}
                    {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                    {(item.likeCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>👍 {item.likeCount}</span>}
                    <AuthorLabel nickname={item.authorNickname} />
                    <span className={styles.boardDate}>{formatDate(item.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
            <button className={styles.moreBtn} onClick={() => navigate('/free-posts')}>더보기</button>
          </>
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* 커뮤니티 페이지                                              */
/* ─────────────────────────────────────────────────────────── */
export default function CommunityPage() {
  const { isLoggedIn, isAdmin } = useAuth();

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>
        <FishingBoard isLoggedIn={isLoggedIn} />
        <FreeBoard isLoggedIn={isLoggedIn} />
        <NoticeBoard isAdmin={isAdmin} />
      </div>
    </div>
  );
}
