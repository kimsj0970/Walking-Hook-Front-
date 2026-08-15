import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Pagination from '../components/common/Pagination';
import PostFormModal from '../components/common/PostFormModal';
import ImageLightbox from '../components/common/ImageLightbox';
import ReportModal from '../components/common/ReportModal';
import MonthYearPicker from '../components/common/MonthYearPicker';
import ReactionBar from '../components/common/ReactionBar';
import type { PostType } from '../api/reportApi';
import { blockUser } from '../api/blockApi';
import {
  getFreePostsPage, getFreePostDetail, createFreePost, updateFreePost, deleteFreePost,
  getFreePostComments, addFreePostComment, deleteFreePostComment,
  type FreePostListItem, type FreePostDetail, type FreePostComment,
} from '../api/freePostApi';
import styles from './FreePostPage.module.css';

type View = 'list' | 'detail';

const ADMIN_NICKNAMES = ['운영자', '관리자', 'admin', 'Admin'];
const PAGE_SIZE = 20;
const MAX_PHOTOS = 5;

function AuthorLabel({ nickname }: { nickname: string }) {
  const isAdmin = ADMIN_NICKNAMES.includes(nickname);
  return (
    <span className={isAdmin ? styles.authorNicknameAdmin : styles.authorNickname}>
      {nickname}
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function ListSkeleton() {
  return (
    <div className={styles.skeletonList}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={`${styles.skeletonBar} ${styles.skelTitle}`} />
          <div className={`${styles.skeletonBar} ${styles.skelMeta}`} />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className={styles.detailCard}>
      <div className={`${styles.skeletonBar} ${styles.skelTitle}`} style={{ marginBottom: 14 }} />
      <div className={`${styles.skeletonBar} ${styles.skelMeta}`} style={{ marginBottom: 24 }} />
      <div className={`${styles.skeletonBar} ${styles.skelBlock}`} />
    </div>
  );
}

export default function FreePostPage() {
  const { isAdmin, isModerator, isLoggedIn, userId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView]     = useState<View>('list');
  const [items, setItems]   = useState<FreePostListItem[]>([]);
  const [detail, setDetail] = useState<FreePostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 월별 필터: 낚시게시판과 동일한 달력형 MonthYearPicker 사용
  const [dateFilter, setDateFilter] = useState<{ year: number; month: number } | null>(null);
  const [dateDropOpen, setDateDropOpen] = useState(false);
  const dateDropRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingPost, setEditingPost] = useState<FreePostDetail | null>(null);

  const [comments, setComments] = useState<FreePostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [reportTarget, setReportTarget] = useState<
    { postType: PostType; postId: string; postTitle: string; parentPostId?: string | null } | null
  >(null);

  const canManage = detail != null && (isAdmin || isModerator || detail.authorId === userId);
  const canModerate = isAdmin || isModerator;

  const fetchList = useCallback(async (page: number, date: { year: number; month: number } | null) => {
    setLoading(true);
    setError('');
    try {
      const result = await getFreePostsPage(page, PAGE_SIZE, date?.year, date?.month);
      setItems(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
      setCurrentPage(result.page);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(0, null); }, [fetchList]);

  const toggleDateDrop = () => setDateDropOpen(v => !v);

  const handleDateSelect = (year: number, month: number) => {
    setDateFilter({ year, month });
    setDateDropOpen(false);
    fetchList(0, { year, month });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearDateFilter = () => {
    setDateFilter(null);
    fetchList(0, null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!dateDropOpen) return;
    const onClickOut = (e: MouseEvent) => {
      if (dateDropRef.current && !dateDropRef.current.contains(e.target as Node)) setDateDropOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [dateDropOpen]);

  useEffect(() => {
    const openPostId = (location.state as { openPostId?: string } | null)?.openPostId;
    if (openPostId) {
      openDetail(openPostId);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (page: number) => {
    fetchList(page, dateFilter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetail = async (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setComments([]); setCommentInput(''); setReplyTo(null); setView('detail');
    try {
      const [d, c] = await Promise.all([getFreePostDetail(id), getFreePostComments(id)]);
      setDetail(d); setComments(c);
    }
    catch (err) {
      // 차단 관계(403) 등 서버가 사용자용 문구를 내려주면 그대로 보여준다.
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '게시글을 불러오지 못했습니다.'); setView('list');
    }
    finally { setDetailLoading(false); }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addFreePostComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getFreePostComments(detail.id));
      setCommentInput(''); setReplyTo(null);
    } catch (err) {
      // 차단 관계면 서버가 403 + 안내 문구를 내려준다 — 그대로 보여준다.
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '댓글 작성에 실패했습니다.');
    }
    finally { setCommentSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detail || !window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteFreePostComment(detail.id, commentId);
      setComments(await getFreePostComments(detail.id));
    } catch { setError('댓글 삭제에 실패했습니다.'); }
  };

  const openCreate = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setEditingPost(null); setModalOpen(true);
  };
  const openEdit = () => { if (!detail) return; setEditingPost(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    if (editingPost) {
      await updateFreePost(editingPost.id, title, content, photoUrls);
      setDetail(await getFreePostDetail(editingPost.id));
    } else {
      await createFreePost(title, content, photoUrls);
    }
    await fetchList(currentPage, dateFilter);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try { await deleteFreePost(detail.id); await fetchList(currentPage, dateFilter); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  /**
   * 사용자 차단. 목록에서 걸러내는 일은 서버가 하므로 여기서는 다시 불러오기만 하면 된다.
   * 글쓴이를 차단하면 그 글 자체가 목록에서 사라지므로 목록으로 되돌린다 —
   * 상세는 서버가 걸러주지 않아 그대로 두면 방금 차단한 글을 계속 보게 된다.
   */
  const handleBlockUser = async (targetId: string, nickname: string, isPostAuthor: boolean) => {
    if (!detail) return;
    const ok = window.confirm(
      `${nickname} 님을 차단하시겠습니까?\n\n` +
      '서로의 게시글과 댓글이 보이지 않게 되고, 서로의 게시물에 댓글을 달 수 없습니다. ' +
      '마이페이지 > 차단한 사용자에서 해제할 수 있습니다.',
    );
    if (!ok) return;
    try {
      await blockUser(targetId);
      if (isPostAuthor) {
        await fetchList(currentPage, dateFilter);
        setView('list');
      } else {
        setComments(await getFreePostComments(detail.id));
      }
    } catch (e) {
      // 운영자 차단 시도 등 서버가 사용자용 문구를 내려주면 그대로 보여준다.
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      if (msg) window.alert(msg);
      else setError('차단에 실패했습니다.');
    }
  };


  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>자유게시판</h1>
            <p className={styles.pageDesc}>
              낚시 이야기부터 일상까지 자유롭게 이야기를 나누세요.
              {view === 'list' && totalElements > 0 && <span className={styles.totalCount}> 총 {totalElements}개</span>}
            </p>
          </div>
          {view === 'list' && isLoggedIn && (
            <button className={styles.createBtn} onClick={openCreate}>+ 글쓰기</button>
          )}
          {view === 'detail' && (
            <button className={styles.iconActionBtn} onClick={() => setView('list')}>← 목록</button>
          )}
        </div>

        {view === 'list' && (
          <>
            <div className={styles.filterBar}>
              <div className={styles.pointDropdown} ref={dateDropRef}>
                <button className={styles.iconActionBtn} onClick={toggleDateDrop}>📅 날짜로 보기</button>
                {dateDropOpen && (
                  <MonthYearPicker value={dateFilter} onSelect={handleDateSelect} />
                )}
              </div>
            </div>

            {dateFilter && (
              <div className={styles.pointFilterBar}>
                <span>📅 <strong>{dateFilter.year}년 {dateFilter.month}월</strong> 게시물</span>
                <button onClick={clearDateFilter}>필터 해제 ✕</button>
              </div>
            )}

            {error && <p className={styles.error}>{error}</p>}

            {loading ? (
              <ListSkeleton />
            ) : items.length === 0 ? (
              <p className={styles.empty}>
                {dateFilter
                  ? '선택한 달에는 게시글이 없습니다.'
                  : '아직 게시글이 없습니다. 첫 번째 글을 작성해 보세요!'}
              </p>
            ) : (
              <>
                <div className={styles.list}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.listItem} onClick={() => openDetail(item.id)}>
                      <div className={styles.listMain}>
                        <div className={styles.listTop}>
                          <span className={styles.listTitle}>{item.title}</span>
                        </div>
                        <div className={styles.listBottom}>
                          <AuthorLabel nickname={item.authorNickname} />
                          {item.photoUrls?.length > 0 && <span className={styles.listPhotoIcon}>📷 {item.photoUrls.length}</span>}
                          {(item.commentCount ?? 0) > 0 && <span className={styles.listCommentCount}>💬 {item.commentCount}</span>}
                          {(item.likeCount ?? 0) > 0 && <span className={styles.listCommentCount}>👍 {item.likeCount}</span>}
                        </div>
                      </div>
                      <div className={styles.listDates}>
                        <span className={styles.listDate}>작성일 {formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                />
              </>
            )}
          </>
        )}

        {view === 'detail' && (
          <>
            {detailLoading || !detail ? (
              <DetailSkeleton />
            ) : (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailTitleRow}>
                    <h2 className={styles.detailTitle}>{detail.title}</h2>
                    <div className={styles.detailTopActions}>
                      {canManage && (
                        <>
                          <button className={styles.iconActionBtn} onClick={openEdit}><span>✏️</span>수정</button>
                          <button className={`${styles.iconActionBtn} ${styles.iconActionBtnDanger}`} onClick={handleDelete}><span>🗑️</span>삭제</button>
                        </>
                      )}
                      {isLoggedIn && detail.authorId !== userId && (
                        <>
                          <button
                            className={styles.iconActionBtn}
                            onClick={() => setReportTarget({ postType: 'FREE_POST', postId: detail.id, postTitle: detail.title })}
                          >
                            <span>🚩</span>신고
                          </button>
                          <button
                            className={styles.iconActionBtn}
                            onClick={() => handleBlockUser(detail.authorId, detail.authorNickname, true)}
                          >
                            <span>🚫</span>차단
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailMeta}>
                    <span className={styles.authorChip}>
                      <span className={styles.authorAvatar}>{detail.authorNickname.charAt(0)}</span>
                      {detail.authorNickname}
                    </span>
                    <span className={styles.metaDot}>·</span>
                    <span>{formatDate(detail.createdAt)}</span>
                    {detail.updatedAt && detail.updatedAt !== detail.createdAt && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span>수정됨 {formatDate(detail.updatedAt)}</span>
                      </>
                    )}
                  </div>
                </div>

                <p className={styles.detailContent}>{detail.content}</p>

                {detail.photoUrls?.length > 0 && (
                  <div className={`${styles.photoGrid} ${detail.photoUrls.length === 1 ? styles.photoGridSingle : ''}`}>
                    {detail.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.detailPhoto}
                        onClick={() => setLbIdx(i)} />
                    ))}
                  </div>
                )}

                <ReactionBar
                  key={detail.id}
                  targetType="FREE_POST"
                  targetId={detail.id}
                  initial={{
                    likeCount: detail.likeCount ?? 0,
                    dislikeCount: detail.dislikeCount ?? 0,
                    myReaction: detail.myReaction ?? null,
                  }}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={() => navigate('/login')}
                />

                {/* 댓글 영역 */}
                <div className={styles.commentSection}>
                  <h4 className={styles.commentTitle}>댓글 <span className={styles.commentCountNum}>{comments.filter(c => !c.deleted).length}</span></h4>

                  {comments.filter(c => !c.parentId).map(c => {
                    const replies = comments.filter(r => r.parentId === c.id && !r.deleted);
                    // 삭제된 원댓글은 남은 답글이 있을 때만 자리표시자로 유지한다.
                    if (c.deleted && replies.length === 0) return null;
                    return (
                    <div key={c.id} className={styles.comment}>
                      {c.deleted ? (
                        <p className={styles.deletedComment}>삭제된 댓글입니다.</p>
                      ) : (
                        <>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAvatar}>{c.authorNickname.charAt(0)}</span>
                            <span className={styles.commentAuthor}>{c.authorNickname}</span>
                            <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                            <div className={styles.commentActions}>
                              {isLoggedIn && (
                                <button className={styles.replyBtn} onClick={() => setReplyTo({ id: c.id, nickname: c.authorNickname })}>답글</button>
                              )}
                              {(canModerate || c.authorId === userId) && (
                                <button className={styles.delBtn} onClick={() => handleDeleteComment(c.id)}>삭제</button>
                              )}
                              {isLoggedIn && c.authorId !== userId && (
                                <>
                                  <button
                                    className={styles.reportCommentBtn}
                                    onClick={() => setReportTarget({ postType: 'FREE_COMMENT', postId: c.id, postTitle: c.content.slice(0, 30), parentPostId: detail.id })}
                                  >신고</button>
                                  <button
                                    className={styles.reportCommentBtn}
                                    onClick={() => handleBlockUser(c.authorId, c.authorNickname, false)}
                                  >차단</button>
                                </>
                              )}
                            </div>
                          </div>
                          <p className={styles.commentContent}>{c.content}</p>
                        </>
                      )}

                      {replies.map(r => (
                        <div key={r.id} className={styles.reply}>
                          <div className={styles.commentHeader}>
                            <span className={styles.replyArrow}>↳</span>
                            <span className={styles.commentAvatar}>{r.authorNickname.charAt(0)}</span>
                            <span className={styles.commentAuthor}>{r.authorNickname}</span>
                            <span className={styles.commentDate}>{formatDate(r.createdAt)}</span>
                            {(canModerate || r.authorId === userId) && (
                              <button className={styles.delBtn} onClick={() => handleDeleteComment(r.id)}>삭제</button>
                            )}
                            {isLoggedIn && r.authorId !== userId && (
                              <>
                                <button
                                  className={styles.reportCommentBtn}
                                  onClick={() => setReportTarget({ postType: 'FREE_COMMENT', postId: r.id, postTitle: r.content.slice(0, 30), parentPostId: detail.id })}
                                >신고</button>
                                <button
                                  className={styles.reportCommentBtn}
                                  onClick={() => handleBlockUser(r.authorId, r.authorNickname, false)}
                                >차단</button>
                              </>
                            )}
                          </div>
                          <p className={styles.commentContent}>{r.content}</p>
                        </div>
                      ))}
                    </div>
                    );
                  })}

                  {isLoggedIn && (
                    <div className={styles.commentForm}>
                      {replyTo && (
                        <div className={styles.replyBadge}>
                          <span>@{replyTo.nickname} 에게 답글</span>
                          <button onClick={() => setReplyTo(null)}>×</button>
                        </div>
                      )}
                      <textarea
                        className={styles.commentInput}
                        placeholder="댓글을 입력하세요 (최대 500자)"
                        maxLength={500}
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        rows={3}
                      />
                      <button
                        className={styles.commentSubmitBtn}
                        onClick={handleAddComment}
                        disabled={commentSubmitting || !commentInput.trim()}
                      >
                        {commentSubmitting ? '등록 중...' : '댓글 등록'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        modalTitle={editingPost ? '글 수정' : '글쓰기'}
        titlePlaceholder="제목을 입력하세요"
        contentPlaceholder="자유롭게 내용을 작성해 주세요"
        initialTitle={editingPost?.title ?? ''}
        initialContent={editingPost?.content ?? ''}
        maxPhotos={MAX_PHOTOS}
        boardType="FREE_POST"
        initialPhotoUrls={editingPost?.photoUrls ?? []}
        maxContentLength={1000}
      />
      {reportTarget && (
        <ReportModal
          postId={reportTarget.postId}
          postType={reportTarget.postType}
          postTitle={reportTarget.postTitle}
          parentPostId={reportTarget.parentPostId}
          onClose={() => setReportTarget(null)}
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
