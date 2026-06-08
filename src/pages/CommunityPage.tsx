import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import PostFormModal from '../components/common/PostFormModal';
import {
  getFishingPostsPreview, getFishingPostDetail, createFishingPost, updateFishingPost, deleteFishingPost,
  type FishingPostListItem, type FishingPostDetail,
} from '../api/fishingPostApi';
import {
  getNoticesPreview, getNoticeDetail, createNotice, updateNotice, deleteNotice,
  type NoticeListItem, type NoticeDetail,
} from '../api/noticeApi';
import styles from './CommunityPage.module.css';

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
export function FishingBoard({ isLoggedIn, className }: { isLoggedIn: boolean; className?: string }) {
  const navigate = useNavigate();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<FishingPostListItem[]>([]);
  const [detail, setDetail] = useState<FishingPostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FishingPostDetail | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try { setItems(await getFishingPostsPreview()); }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getFishingPostDetail(id)); }
    catch { setError('게시글을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => { setEditingPost(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingPost(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string) => {
    if (editingPost) {
      await updateFishingPost(editingPost.id, title, content);
      const updated = await getFishingPostDetail(editingPost.id);
      setDetail(updated);
    } else {
      await createFishingPost(title, content);
      setView('list');
    }
    await fetchList();
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try { await deleteFishingPost(detail.id); await fetchList(); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  return (
    <div className={`${styles.section} ${className ?? ''}`}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => view === 'list' && navigate('/fishing-posts')}
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
                <div key={item.id} className={styles.boardItem} onClick={() => openDetail(item.id)}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    <AuthorLabel nickname={item.authorNickname} />
                    <span className={styles.boardDate}>{formatDate(item.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
            <button className={styles.moreBtn} onClick={() => navigate('/fishing-posts')}>더보기</button>
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
              </div>
            </div>
            <p className={styles.detailContent}>{detail.content}</p>
            {isLoggedIn && (
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
        modalTitle={editingPost ? '조황 수정' : '조황 작성'}
        titlePlaceholder="제목을 입력하세요"
        contentPlaceholder="조황 내용을 공유해 주세요"
        initialTitle={editingPost?.title ?? ''}
        initialContent={editingPost?.content ?? ''}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* 공지사항 게시판                                              */
/* ─────────────────────────────────────────────────────────── */
export function NoticeBoard({ isAdmin }: { isAdmin: boolean }) {
  const navigate = useNavigate();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<NoticeListItem[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeDetail | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try { setItems(await getNoticesPreview()); }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getNoticeDetail(id)); }
    catch { setError('공지사항을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => { setEditingNotice(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingNotice(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string) => {
    if (editingNotice) {
      await updateNotice(editingNotice.id, title, content);
      setDetail(await getNoticeDetail(editingNotice.id));
    } else {
      await createNotice(title, content);
      setView('list');
    }
    await fetchList();
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('공지사항을 삭제하시겠습니까?')) return;
    try { await deleteNotice(detail.id); await fetchList(); setView('list'); }
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
                <div key={item.id} className={styles.boardItem} onClick={() => openDetail(item.id)}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    <AuthorLabel nickname={item.authorNickname} />
                    <span className={styles.boardDate}>{formatDate(item.createdAt)}</span>
                  </span>
                </div>
              ))}
            </div>
            <button className={styles.moreBtn} onClick={() => navigate('/notices')}>더보기</button>
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
      />
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
        <NoticeBoard isAdmin={isAdmin} />
      </div>
    </div>
  );
}
