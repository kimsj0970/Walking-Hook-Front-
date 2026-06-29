import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import PostFormModal from '../components/common/PostFormModal';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  createInquiry,
  updateInquiry,
  deleteInquiry,
  deleteMyInquiry,
  getInquiries,
  getAllInquiries,
  getInquiryDetail,
  getInquiryComments,
  addInquiryComment,
  deleteInquiryComment,
  type InquiryListItem,
  type AdminInquiryListItem,
  type InquiryDetail,
  type InquiryComment,
} from '../api/inquiryApi';
import styles from './InquiryPage.module.css';

type View = 'list' | 'detail';

export default function InquiryPage() {
  const { isAdmin, isModerator, isLoggedIn, userId } = useAuth();
  const isPrivileged = isAdmin || isModerator;

  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<InquiryListItem[] | AdminInquiryListItem[]>([]);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [comments, setComments] = useState<InquiryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = isPrivileged ? await getAllInquiries() : await getInquiries();
      setItems(result);
    } catch {
      setError('목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [isPrivileged]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleViewDetail = async (id: string) => {
    if (!isLoggedIn) {
      setError('로그인이 필요합니다.');
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    setComments([]);
    setCommentInput('');
    setReplyTo(null);
    setView('detail');
    try {
      const [result, cmts] = await Promise.all([getInquiryDetail(id), getInquiryComments(id)]);
      setDetail(result);
      setComments(cmts);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setError('본인의 문의만 상세 조회할 수 있습니다.');
      } else {
        setError('문의 상세를 불러오지 못했습니다.');
      }
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitCreate = async (title: string, content: string, photoUrls: string[]) => {
    await createInquiry(title, content, photoUrls);
    await fetchList();
  };

  const handleSubmitEdit = async (title: string, content: string, photoUrls: string[]) => {
    if (!detail) return;
    await updateInquiry(detail.id, title, content, photoUrls);
    const [updated, cmts] = await Promise.all([getInquiryDetail(detail.id), getInquiryComments(detail.id)]);
    setDetail(updated);
    setComments(cmts);
    await fetchList();
  };

  const handleDeleteOwn = async () => {
    if (!detail || !window.confirm('문의를 삭제하시겠습니까?')) return;
    try {
      await deleteMyInquiry(detail.id);
      await fetchList();
      setView('list');
      setDetail(null);
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('문의를 삭제하시겠습니까?')) return;
    try {
      await deleteInquiry(detail.id);
      await fetchList();
      setView('list');
      setDetail(null);
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addInquiryComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getInquiryComments(detail.id));
      setCommentInput('');
      setReplyTo(null);
    } catch {
      setError('댓글 작성에 실패했습니다.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detail || !window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteInquiryComment(detail.id, commentId);
      setComments(await getInquiryComments(detail.id));
    } catch {
      setError('댓글 삭제에 실패했습니다.');
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const getDescendants = (parentId: string): InquiryComment[] => {
    const children = comments.filter(c => c.parentId === parentId);
    return children.flatMap(child => [child, ...getDescendants(child.id)]);
  };

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>
        {/* ── List View ── */}
        {view === 'list' && (
          <>
            <div className={styles.pageHeader}>
              <div>
                <h1 className={styles.pageTitle}>고객센터</h1>
                <p className={styles.pageDesc}>
                  {isPrivileged ? '전체 문의 목록입니다.' : '내 문의 내역을 확인할 수 있습니다.'}
                </p>
              </div>
              {isLoggedIn && (
                <button
                  className={styles.createBtn}
                  onClick={() => setModalOpen(true)}
                >
                  문의하기
                </button>
              )}
            </div>

            {loading ? (
              <div className={styles.loadingWrap}>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`${styles.skeletonRow} skeleton`} />
                ))}
              </div>
            ) : error ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyText}>{error}</p>
                <button className={styles.retryBtn} onClick={fetchList}>다시 시도</button>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyIcon}>📭</p>
                <p className={styles.emptyText}>
                  {isPrivileged ? '접수된 문의가 없습니다.' : '등록된 문의가 없습니다.'}
                </p>
                {isLoggedIn && (
                  <button
                    className={styles.createBtn}
                    onClick={() => setModalOpen(true)}
                  >
                    첫 문의 등록하기
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.thTitle}>제목</th>
                      <th className={styles.thAuthor}>닉네임</th>
                      {isAdmin && <th className={styles.thAuthor}>실명</th>}
                      {/* 중간관리자도 닉네임 컬럼 표시 - 실명은 ADMIN만 */}
                      <th className={styles.thDate}>등록일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className={styles.tr}
                        onClick={() => handleViewDetail(item.id)}
                      >
                        <td className={styles.tdTitle}>
                          {item.title}
                          {item.photoUrls?.length > 0 && <span className={styles.tdPhotoIcon}>📷</span>}
                          {(item.commentCount ?? 0) > 0 && <span className={styles.tdCommentCount}>💬 {item.commentCount}</span>}
                        </td>
                        <td className={styles.tdAuthor}>{item.authorNickname}</td>
                        {isAdmin && (
                          <td className={styles.tdAuthor}>
                            {'authorRealName' in item ? item.authorRealName : '—'}
                          </td>
                        )}
                        <td className={styles.tdDate}>{formatDate(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Detail View ── */}
        {view === 'detail' && (
          <>
            <button className={styles.backBtn} onClick={() => setView('list')}>
              ← 목록으로
            </button>
            {detailLoading ? (
              <div className={styles.detailCard}>
                <div className={`${styles.skeletonTitle} skeleton`} />
                <div className={`${styles.skeletonMeta} skeleton`} />
                <div className={`${styles.skeletonContent} skeleton`} />
              </div>
            ) : detail ? (
              <div className={styles.detailCard}>
                <h2 className={styles.detailTitle}>{detail.title}</h2>
                <div className={styles.detailMeta}>
                  <span>{detail.authorNickname}</span>
                  {isAdmin && detail.authorRealName && (
                    <>
                      <span className={styles.dot}>|</span>
                      <span className={styles.realName}>실명: {detail.authorRealName}</span>
                    </>
                  )}
                  <span className={styles.dot}>·</span>
                  <span>{formatDate(detail.createdAt)}</span>
                </div>
                <div className={styles.divider} />
                <p className={styles.detailContent}>{detail.content}</p>
                {detail.photoUrls?.length > 0 && (
                  <div className={styles.photoGrid}>
                    {detail.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`첨부 ${i + 1}`} className={styles.photo}
                        style={{ cursor: 'pointer' }} onClick={() => setLbIdx(i)} />
                    ))}
                  </div>
                )}
                {(detail.authorId === userId || isAdmin) && (
                  <div className={styles.detailActions}>
                    {detail.authorId === userId && (
                      <button className={styles.editBtn} onClick={() => setEditModalOpen(true)}>수정</button>
                    )}
                    {detail.authorId === userId && !isAdmin && (
                      <button className={styles.deleteBtn} onClick={handleDeleteOwn}>삭제</button>
                    )}
                    {isAdmin && (
                      <button className={styles.deleteBtn} onClick={handleDelete}>삭제 (관리자)</button>
                    )}
                  </div>
                )}

                {/* 댓글 영역 */}
                <div className={styles.commentSection}>
                  <h4 className={styles.commentTitle}>댓글 {comments.length}개</h4>

                  {comments.filter(c => !c.parentId).map(c => (
                    <div key={c.id} className={styles.comment}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>{c.authorNickname}</span>
                        <span className={styles.commentDate}>{formatDate(c.createdAt)}</span>
                        <div className={styles.commentActions}>
                          <button className={styles.replyBtn} onClick={() => setReplyTo({ id: c.id, nickname: c.authorNickname })}>답글</button>
                          {(isAdmin || c.authorId === userId) && (
                            <button className={styles.delBtn} onClick={() => handleDeleteComment(c.id)}>삭제</button>
                          )}
                        </div>
                      </div>
                      <p className={styles.commentContent}>{c.content}</p>

                      {getDescendants(c.id).map(r => (
                        <div key={r.id} className={styles.reply}>
                          <div className={styles.commentHeader}>
                            <span className={styles.replyArrow}>↳</span>
                            <span className={styles.commentAuthor}>{r.authorNickname}</span>
                            <span className={styles.commentDate}>{formatDate(r.createdAt)}</span>
                            <div className={styles.commentActions}>
                              <button className={styles.replyBtn} onClick={() => setReplyTo({ id: r.id, nickname: r.authorNickname })}>답글</button>
                              {(isAdmin || r.authorId === userId) && (
                                <button className={styles.delBtn} onClick={() => handleDeleteComment(r.id)}>삭제</button>
                              )}
                            </div>
                          </div>
                          <p className={styles.commentContent}>{r.content}</p>
                        </div>
                      ))}
                    </div>
                  ))}

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
                </div>
              </div>
            ) : null}
          </>
        )}

      </div>

      {lbIdx !== null && detail?.photoUrls && (
        <ImageLightbox
          images={detail.photoUrls}
          index={lbIdx}
          onClose={() => setLbIdx(null)}
          onPrev={() => setLbIdx(j => Math.max(0, (j ?? 0) - 1))}
          onNext={() => setLbIdx(j => Math.min(detail.photoUrls.length - 1, (j ?? 0) + 1))}
        />
      )}
      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmitCreate}
        modalTitle="문의 등록"
        titlePlaceholder="문의 제목을 입력해 주세요."
        contentPlaceholder="문의 내용을 자세히 입력해 주세요."
        maxPhotos={3}
        boardType="INQUIRY"
      />
      <PostFormModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSubmit={handleSubmitEdit}
        modalTitle="문의 수정"
        titlePlaceholder="문의 제목을 입력해 주세요."
        contentPlaceholder="문의 내용을 자세히 입력해 주세요."
        maxPhotos={3}
        boardType="INQUIRY"
        initialTitle={detail?.title}
        initialContent={detail?.content}
        initialPhotoUrls={detail?.photoUrls}
      />
    </div>
  );
}
