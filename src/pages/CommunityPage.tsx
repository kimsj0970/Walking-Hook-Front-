import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Pagination from '../components/common/Pagination';
import PostFormModal from '../components/common/PostFormModal';
import {
  getCatchPostsPage,
  type CatchPostListItem,
} from '../api/catchPostApi';
import {
  getNoticesPreview, getNoticesPage, createNotice,
  type NoticeListItem,
} from '../api/noticeApi';
import {
  getFreePostsPreview,
  type FreePostListItem,
} from '../api/freePostApi';
import PostMeta from '../components/board/PostMeta';
import styles from './CommunityPage.module.css';

/* ── 조황 작성/수정 모달 ──────────────────────────────────────────── */

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

/* ─────────────────────────────────────────────────────────── */
/* 조황 게시판                                                  */
/* ─────────────────────────────────────────────────────────── */
export function FishingBoard({ isLoggedIn, className, navigateOnClick }: { isLoggedIn: boolean; className?: string; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const [items, setItems]   = useState<CatchPostListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]   = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

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

  // 상세·작성·수정·삭제·신고는 전부 조황 게시판 페이지(/catch-posts) 한 곳에서 한다.
  // 예전엔 이 목록 안에서 글이 펼쳐졌는데, 홈에서는 페이지로 가고 커뮤니티에서는 제자리에서
  // 열려 같은 글이 두 모양으로 보였다. 이제 어디서 누르든 같은 상세 페이지다.
  const openPost   = (id: string) => navigate('/catch-posts', { state: { openPostId: id } });
  const openCreate = () => navigate('/catch-posts', { state: { openWrite: true } });

  return (
    <div className={`${styles.section} ${className ?? ''}`}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => navigate('/catch-posts')}
          title="전체 조황 게시판 보기"
        >
          🐟 조황 게시판
          <span className={styles.moreArrow}>›</span>
        </h2>
        {isLoggedIn && (
          <button className={styles.writeBtn} onClick={openCreate}>글쓰기</button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? <p className={styles.empty}>불러오는 중...</p>
        : items.length === 0 ? <p className={styles.empty}>아직 게시글이 없습니다. 첫 번째 조황을 공유해 보세요!</p>
        : <>
            <div className={styles.board}>
              {items.map(item => (
                <div key={item.id} className={styles.boardItem} onClick={() => openPost(item.id)}>
                  <div className={styles.boardTop}>
                    <span className={styles.boardTitle}>{item.title}</span>
                    <span className={styles.boardDate}>{item.caughtAt ?? formatDate(item.createdAt)}</span>
                  </div>
                  <div className={styles.boardBottom}>
                    <div className={styles.boardMeta}>
                      <PostMeta
                        authorNickname={item.authorNickname}
                        official={item.officialPost}
                        photoCount={item.photoUrls?.length ?? 0}
                        commentCount={item.commentCount ?? 0}
                        likeCount={item.likeCount ?? 0}
                        place={item.pointName ? { label: item.pointName, kind: 'point' } : null}
                      />
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
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/* 공지사항 게시판                                              */
/* ─────────────────────────────────────────────────────────── */
export function NoticeBoard({ isAdmin, navigateOnClick }: { isAdmin: boolean; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const [items, setItems]   = useState<NoticeListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
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

  // 상세·수정·삭제는 공지 페이지(/notices)에서. 여기선 목록과 새 공지 작성만.
  const openPost   = (id: string) => navigate('/notices', { state: { openPostId: id } });
  const openCreate = () => setModalOpen(true);

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    await createNotice(title, content, photoUrls);
    await fetchList(currentPage);
  };

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2
          className={`${styles.sectionTitle} ${styles.sectionTitleLink}`}
          onClick={() => navigate('/notices')}
          title="전체 공지사항 보기"
        >
          📢 공지사항
          <span className={styles.sectionBadge}>관리자</span>
          <span className={styles.moreArrow}>›</span>
        </h2>
        {isAdmin && (
          <button className={styles.writeBtn} onClick={openCreate}>+ 공지 작성</button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? <p className={styles.empty}>불러오는 중...</p>
        : items.length === 0 ? <p className={styles.empty}>등록된 공지사항이 없습니다.</p>
        : <>
            <div className={styles.board}>
              {items.map(item => (
                <div key={item.id} className={styles.boardItem} onClick={() => openPost(item.id)}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    <PostMeta
                      authorNickname={item.authorNickname}
                      official
                      photoCount={item.photoUrls?.length ?? 0}
                      commentCount={item.commentCount ?? 0}
                    />
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
      }

      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        modalTitle="공지 작성"
        titlePlaceholder="공지 제목을 입력하세요"
        contentPlaceholder="공지 내용을 입력하세요"
        initialTitle=""
        initialContent=""
        maxPhotos={null}
        boardType="NOTICE"
        initialPhotoUrls={[]}
      />
    </div>
  );
}


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
    // 체험판: 읽기는 로그인 없이. 쓰기 버튼은 각자 isLoggedIn 으로 막는다.
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
                    <PostMeta
                      authorNickname={item.authorNickname}
                      official={item.isOfficialPost}
                      photoCount={item.photoUrls?.length ?? 0}
                      commentCount={item.commentCount ?? 0}
                      likeCount={item.likeCount ?? 0}
                    />
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
