import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchReportedPosts, fetchReportedComments, fetchReportsByContent,
  adminDeleteCatchPost, adminDeleteFreePost,
  adminDeleteCatchComment, adminDeleteFreeComment,
  dismissReports,
  REPORT_REASON_LABELS, POST_TYPE_LABELS,
  type ReportedPostSummary, type ReportItem,
} from '../../api/reportApi';
import styles from './AdminReportPage.module.css';

type AdminTab = 'posts' | 'comments';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function AdminReportPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('posts');
  const [summaries, setSummaries] = useState<ReportedPostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedItem, setSelectedItem] = useState<ReportedPostSummary | null>(null);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const fetchList = useCallback(async (t: AdminTab) => {
    setLoading(true);
    setError('');
    setSelectedItem(null);
    setReports([]);
    try {
      setSummaries(t === 'posts' ? await fetchReportedPosts() : await fetchReportedComments());
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(tab); }, [fetchList, tab]);

  const openDetail = async (summary: ReportedPostSummary) => {
    setSelectedItem(summary);
    setDetailLoading(true);
    setReports([]);
    try { setReports(await fetchReportsByContent(summary.postId)); }
    catch { setError('신고 내역을 불러오지 못했습니다.'); }
    finally { setDetailLoading(false); }
  };

  const handleDeleteContent = async () => {
    if (!selectedItem) return;
    const typeLabel = POST_TYPE_LABELS[selectedItem.postType] ?? '콘텐츠';
    if (!window.confirm(`이 ${typeLabel}을(를) 삭제하시겠습니까?`)) return;
    setDeleting(true);
    try {
      if (selectedItem.postType === 'CATCH_POST') await adminDeleteCatchPost(selectedItem.postId);
      else if (selectedItem.postType === 'FREE_POST') await adminDeleteFreePost(selectedItem.postId);
      else if (selectedItem.postType === 'CATCH_COMMENT') await adminDeleteCatchComment(selectedItem.postId);
      else if (selectedItem.postType === 'FREE_COMMENT') await adminDeleteFreeComment(selectedItem.postId);
      await fetchList(tab);
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDismissReports = async () => {
    if (!selectedItem) return;
    const typeLabel = POST_TYPE_LABELS[selectedItem.postType] ?? '콘텐츠';
    if (!window.confirm(`이 ${typeLabel}의 신고를 제외하시겠습니까?\n신고 내역만 삭제되고 ${isPost ? '게시물' : '댓글'}은 그대로 유지됩니다.`)) return;
    setDismissing(true);
    try {
      await dismissReports(selectedItem.postId);
      await fetchList(tab);
    } catch {
      setError('신고 제외에 실패했습니다.');
    } finally {
      setDismissing(false);
    }
  };

  const handleViewContent = () => {
    if (!selectedItem) return;
    if (selectedItem.postType === 'CATCH_POST') {
      navigate('/catch-posts', { state: { openPostId: selectedItem.postId } });
    } else if (selectedItem.postType === 'CATCH_COMMENT' && selectedItem.parentPostId) {
      navigate('/catch-posts', { state: { openPostId: selectedItem.parentPostId } });
    } else if (selectedItem.postType === 'FREE_POST') {
      navigate('/free-posts', { state: { openPostId: selectedItem.postId } });
    } else if (selectedItem.postType === 'FREE_COMMENT' && selectedItem.parentPostId) {
      navigate('/free-posts', { state: { openPostId: selectedItem.parentPostId } });
    }
  };

  const isPost = tab === 'posts';

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>신고 관리</h2>

      {/* 탭 */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'posts' ? styles.tabActive : ''}`}
          onClick={() => setTab('posts')}
        >
          신고된 게시물
        </button>
        <button
          className={`${styles.tab} ${tab === 'comments' ? styles.tabActive : ''}`}
          onClick={() => setTab('comments')}
        >
          신고된 댓글
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.layout}>
        {/* 목록 패널 */}
        <div className={styles.listPanel}>
          <p className={styles.listHint}>
            {isPost ? '게시물' : '댓글'}을 클릭하면 신고 상세를 확인할 수 있습니다.
          </p>
          {loading ? (
            <p className={styles.empty}>불러오는 중...</p>
          ) : summaries.length === 0 ? (
            <p className={styles.empty}>신고된 {isPost ? '게시물' : '댓글'}이 없습니다.</p>
          ) : (
            <div className={styles.list}>
              {summaries.map(s => (
                <div
                  key={s.postId}
                  className={`${styles.listItem} ${selectedItem?.postId === s.postId ? styles.listItemActive : ''}`}
                  onClick={() => openDetail(s)}
                >
                  <div className={styles.listItemTop}>
                    <span className={styles.postTypeBadge}>{POST_TYPE_LABELS[s.postType] ?? s.postType}</span>
                    <span className={styles.reportCount}>신고 {s.reportCount}건</span>
                  </div>
                  <p className={styles.postTitle}>{s.postTitle}</p>
                  <p className={styles.latestDate}>최근 신고: {formatDate(s.latestReportedAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        <div className={styles.detailPanel}>
          {!selectedItem ? (
            <div className={styles.detailEmpty}>
              <p>왼쪽 목록에서 항목을 선택하면<br />신고 내역을 확인할 수 있습니다.</p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderTop}>
                  <span className={styles.postTypeBadge}>{POST_TYPE_LABELS[selectedItem.postType] ?? selectedItem.postType}</span>
                  <div className={styles.detailActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={handleViewContent}
                    >
                      {isPost ? '게시물 보기' : '원문 보기'}
                    </button>
                    <button
                      className={styles.dismissBtn}
                      onClick={handleDismissReports}
                      disabled={dismissing || deleting}
                      title="본문은 유지하고 신고 내역만 제거합니다"
                    >
                      {dismissing ? '처리 중...' : '신고 제외'}
                    </button>
                    <button
                      className={styles.deleteContentBtn}
                      onClick={handleDeleteContent}
                      disabled={deleting || dismissing}
                    >
                      {deleting ? '삭제 중...' : isPost ? '게시물 삭제' : '댓글 삭제'}
                    </button>
                  </div>
                </div>
                <h3 className={styles.detailTitle}>{selectedItem.postTitle}</h3>
                <p className={styles.detailMeta}>총 신고 {selectedItem.reportCount}건</p>
              </div>

              {detailLoading ? (
                <p className={styles.empty}>불러오는 중...</p>
              ) : reports.length === 0 ? (
                <p className={styles.empty}>신고 내역이 없습니다.</p>
              ) : (
                <div className={styles.reportList}>
                  {reports.map((r, i) => (
                    <div key={r.reportId} className={styles.reportItem}>
                      <div className={styles.reportItemHeader}>
                        <span className={styles.reportIdx}>#{i + 1}</span>
                        <span className={styles.reporterNickname}>{r.reporterNickname}</span>
                        <span className={styles.reportDate}>{formatDate(r.reportedAt)}</span>
                      </div>
                      <div className={styles.reasonTags}>
                        {r.reasons.map(reason => (
                          <span key={reason} className={styles.reasonTag}>
                            {REPORT_REASON_LABELS[reason] ?? reason}
                          </span>
                        ))}
                      </div>
                      {r.customReason && (
                        <p className={styles.customReason}>💬 {r.customReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
