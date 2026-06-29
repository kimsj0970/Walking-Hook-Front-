import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import PostFormModal from '../components/common/PostFormModal';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  getNoticesPage, getNoticeDetail, createNotice, updateNotice, deleteNotice,
  getNoticeComments, addNoticeComment, deleteNoticeComment,
  type NoticeListItem, type NoticeDetail, type NoticeComment,
} from '../api/noticeApi';
import styles from './NoticePage.module.css';

type View = 'list' | 'detail';

const ADMIN_NICKNAMES = ['운영자', '관리자', 'admin', 'Admin'];
const PAGE_SIZE = 20;

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

export default function NoticePage() {
  const { isAdmin, isLoggedIn, userId } = useAuth();
  const location = useLocation();

  const [view, setView]     = useState<View>('list');
  const [items, setItems]   = useState<NoticeListItem[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen]       = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeDetail | null>(null);

  const [comments, setComments] = useState<NoticeComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const fetchList = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getNoticesPage(page, PAGE_SIZE);
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

  useEffect(() => { fetchList(0); }, [fetchList]);

  useEffect(() => {
    const openPostId = (location.state as { openPostId?: string } | null)?.openPostId;
    if (openPostId) {
      openDetail(openPostId);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (page: number) => {
    fetchList(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true); setDetail(null); setComments([]); setCommentInput(''); setReplyTo(null); setView('detail');
    try {
      const [d, c] = await Promise.all([getNoticeDetail(id), getNoticeComments(id)]);
      setDetail(d); setComments(c);
    }
    catch { setError('공지사항을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addNoticeComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getNoticeComments(detail.id));
      setCommentInput(''); setReplyTo(null);
    } catch { setError('댓글 작성에 실패했습니다.'); }
    finally { setCommentSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detail || !window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteNoticeComment(detail.id, commentId);
      setComments(await getNoticeComments(detail.id));
    } catch { setError('댓글 삭제에 실패했습니다.'); }
  };

  const openCreate = () => { setEditingNotice(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingNotice(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    if (editingNotice) {
      await updateNotice(editingNotice.id, title, content, photoUrls);
      setDetail(await getNoticeDetail(editingNotice.id));
    } else {
      await createNotice(title, content, photoUrls);
    }
    await fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('공지사항을 삭제하시겠습니까?')) return;
    try { await deleteNotice(detail.id); await fetchList(currentPage); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>

        {view === 'list' && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>공지사항</h1>
                <p className={styles.pageDesc}>
                  Walking Hook 운영 공지를 확인하세요.
                  {totalElements > 0 && <span className={styles.totalCount}> 총 {totalElements}개</span>}
                </p>
              </div>
              {isAdmin && (
                <button className={styles.createBtn} onClick={openCreate}>+ 공지 작성</button>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}

            {loading ? (
              <p className={styles.empty}>불러오는 중...</p>
            ) : items.length === 0 ? (
              <p className={styles.empty}>등록된 공지사항이 없습니다.</p>
            ) : (
              <>
                <div className={styles.list}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.listItem} onClick={() => openDetail(item.id)}>
                      <span className={styles.listTitle}>{item.title}</span>
                      <span className={styles.listMeta}>
                        {item.photoUrls?.length > 0 && <span className={styles.listPhotoIcon}>📷</span>}
                        {(item.commentCount ?? 0) > 0 && <span className={styles.listCommentCount}>💬 {item.commentCount}</span>}
                        <AuthorLabel nickname={item.authorNickname} />
                        <span className={styles.listDate}>{formatDate(item.createdAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className={styles.pagination}>
                    <button className={styles.pageBtn} disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>‹</button>
                    {pageNumbers.map((p) => (
                      <button key={p} className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`} onClick={() => goToPage(p)}>
                        {p + 1}
                      </button>
                    ))}
                    <button className={styles.pageBtn} disabled={currentPage === totalPages - 1} onClick={() => goToPage(currentPage + 1)}>›</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {view === 'detail' && (
          <>
            {detailLoading || !detail ? (
              <p className={styles.empty}>불러오는 중...</p>
            ) : (
              <>
                <div className={styles.detailHeader}>
                  <h2 className={styles.detailTitle}>{detail.title}</h2>
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
                <div className={styles.detailActions}>
                  {isAdmin && (
                    <>
                      <button className={styles.deleteBtn} onClick={handleDelete}>삭제</button>
                      <button className={styles.editBtn} onClick={openEdit}>수정</button>
                    </>
                  )}
                  <button className={styles.backBtn} onClick={() => setView('list')}>목록으로</button>
                </div>

                {/* 댓글 영역 */}
                <div className={styles.commentSection}>
                  <h4 className={styles.commentTitle}>댓글 {comments.length}개</h4>

                  {comments.filter(c => !c.parentId).map(c => (
                    <div key={c.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>{c.authorNickname}</span>
                        <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                        <div className={styles.commentActions}>
                          {isLoggedIn && (
                            <button className={styles.replyBtn} onClick={() => setReplyTo({ id: c.id, nickname: c.authorNickname })}>답글</button>
                          )}
                          {(isAdmin || c.authorId === userId) && (
                            <button className={styles.delBtn} onClick={() => handleDeleteComment(c.id)}>삭제</button>
                          )}
                        </div>
                      </div>
                      <p className={styles.commentContent}>{c.content}</p>

                      {comments.filter(r => r.parentId === c.id).map(r => (
                        <div key={r.id} className={styles.reply}>
                          <div className={styles.commentHeader}>
                            <span className={styles.replyArrow}>↳</span>
                            <span className={styles.commentAuthor}>{r.authorNickname}</span>
                            <span className={styles.commentDate}>{formatDate(r.createdAt)}</span>
                            {(isAdmin || r.authorId === userId) && (
                              <button className={styles.delBtn} onClick={() => handleDeleteComment(r.id)}>삭제</button>
                            )}
                          </div>
                          <p className={styles.commentContent}>{r.content}</p>
                        </div>
                      ))}
                    </div>
                  ))}

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
              </>
            )}
          </>
        )}

      </div>

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
