import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getAllInquiries, getInquiryDetail, deleteInquiry,
  getInquiryComments, addInquiryComment, deleteInquiryComment,
  type AdminInquiryListItem, type InquiryDetail, type InquiryComment,
} from '../../api/inquiryApi';
import styles from './AdminInquiryManagement.module.css';

type View = 'list' | 'detail';

export default function AdminInquiryManagement() {
  const { isAdmin } = useAuth();

  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<AdminInquiryListItem[]>([]);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [comments, setComments] = useState<InquiryComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try { setItems(await getAllInquiries()); }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetail(null);
    setComments([]);
    setView('detail');
    try {
      const [d, c] = await Promise.all([getInquiryDetail(id), getInquiryComments(id)]);
      setDetail(d);
      setComments(c);
    } catch { setError('상세 정보를 불러오지 못했습니다.'); setView('list'); }
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('문의를 삭제하시겠습니까?')) return;
    try { await deleteInquiry(detail.id); await fetchList(); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addInquiryComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getInquiryComments(detail.id));
      setCommentInput('');
      setReplyTo(null);
    } catch { setError('댓글 작성에 실패했습니다.'); }
    finally { setCommentSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detail || !window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteInquiryComment(detail.id, commentId);
      setComments(await getInquiryComments(detail.id));
    } catch { setError('댓글 삭제에 실패했습니다.'); }
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const topComments = comments.filter(c => !c.parentId);
  const repliesOf   = (id: string) => comments.filter(c => c.parentId === id);

  return (
    <div className={styles.page}>
      {view === 'list' ? (
        <>
          <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>고객센터 관리</h2>
            <span className={styles.count}>총 {items.length}건</span>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <div className={styles.skeletons}>{[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}</div>
          ) : items.length === 0 ? (
            <p className={styles.empty}>접수된 문의가 없습니다.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>제목</th><th>닉네임</th><th>실명</th><th>등록일</th>
                </tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} className={styles.tr} onClick={() => openDetail(item.id)}>
                      <td>{item.title}</td>
                      <td>{item.authorNickname}</td>
                      <td>{item.authorRealName}</td>
                      <td>{fmt(item.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <button className={styles.backBtn} onClick={() => { setView('list'); setError(''); }}>← 목록으로</button>
          {error && <p className={styles.error}>{error}</p>}
          {detail && (
            <div className={styles.detailCard}>
              <h3 className={styles.detailTitle}>{detail.title}</h3>
              <div className={styles.detailMeta}>
                <span>{detail.authorNickname}</span>
                {isAdmin && detail.authorRealName && <span className={styles.realName}>실명: {detail.authorRealName}</span>}
                <span className={styles.dot}>·</span>
                <span>{fmt(detail.createdAt)}</span>
              </div>
              <div className={styles.divider} />
              <p className={styles.detailContent}>{detail.content}</p>
              {isAdmin && (
                <div className={styles.actions}>
                  <button className={styles.deleteBtn} onClick={handleDelete}>문의 삭제</button>
                </div>
              )}

              {/* 댓글 영역 */}
              <div className={styles.commentSection}>
                <h4 className={styles.commentTitle}>댓글 {comments.length}개</h4>

                {topComments.map(c => (
                  <div key={c.id} className={styles.comment}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>{c.authorNickname}</span>
                      <span className={styles.commentDate}>{fmt(c.createdAt)}</span>
                      <div className={styles.commentActions}>
                        <button className={styles.replyBtn} onClick={() => setReplyTo({ id: c.id, nickname: c.authorNickname })}>답글</button>
                        <button className={styles.delBtn} onClick={() => handleDeleteComment(c.id)}>삭제</button>
                      </div>
                    </div>
                    <p className={styles.commentContent}>{c.content}</p>

                    {repliesOf(c.id).map(r => (
                      <div key={r.id} className={styles.reply}>
                        <div className={styles.commentHeader}>
                          <span className={styles.replyArrow}>↳</span>
                          <span className={styles.commentAuthor}>{r.authorNickname}</span>
                          <span className={styles.commentDate}>{fmt(r.createdAt)}</span>
                          <button className={styles.delBtn} onClick={() => handleDeleteComment(r.id)}>삭제</button>
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
                    className={styles.submitBtn}
                    onClick={handleAddComment}
                    disabled={commentSubmitting || !commentInput.trim()}
                  >
                    {commentSubmitting ? '등록 중...' : '댓글 등록'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
