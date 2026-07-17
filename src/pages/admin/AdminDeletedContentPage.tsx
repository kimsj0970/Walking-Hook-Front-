import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchDeletedReportedContents, fetchDeletedContentDetail,
  restoreDeletedContent, hardDeleteContent,
  REPORT_REASON_LABELS, POST_TYPE_LABELS,
  type DeletedContentSummary, type DeletedContentDetail,
} from '../../api/reportApi';
import styles from './AdminDeletedContentPage.module.css';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/** 목록/상세에서 제목이 없는(댓글) 항목의 표시용 라벨 */
function displayTitle(title: string | null, preview: string | null): string {
  return title ?? preview ?? '(내용 없음)';
}

export default function AdminDeletedContentPage() {
  const { isAdmin } = useAuth();

  const [summaries, setSummaries] = useState<DeletedContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<DeletedContentSummary | null>(null);
  const [detail, setDetail] = useState<DeletedContentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [acting, setActing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelected(null);
    setDetail(null);
    try {
      setSummaries(await fetchDeletedReportedContents());
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openDetail = async (summary: DeletedContentSummary) => {
    setSelected(summary);
    setDetail(null);
    setShowContent(false);
    setDetailLoading(true);
    try {
      setDetail(await fetchDeletedContentDetail(summary.postType, summary.contentId));
    } catch {
      setError('상세 정보를 불러오지 못했습니다.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selected) return;
    const typeLabel = POST_TYPE_LABELS[selected.postType] ?? '콘텐츠';
    if (!window.confirm(`이 ${typeLabel}을(를) 복구하시겠습니까?\n복구하면 다시 사용자에게 노출됩니다.`)) return;
    setActing(true);
    try {
      await restoreDeletedContent(selected.postType, selected.contentId);
      await fetchList();
    } catch {
      setError('복구에 실패했습니다.');
    } finally {
      setActing(false);
    }
  };

  const handleHardDelete = async () => {
    if (!selected) return;
    const typeLabel = POST_TYPE_LABELS[selected.postType] ?? '콘텐츠';
    if (!window.confirm(`이 ${typeLabel}을(를) 영구 삭제하시겠습니까?\n영구 삭제하면 데이터베이스에서 완전히 제거되어 복구할 수 없습니다.`)) return;
    setActing(true);
    try {
      await hardDeleteContent(selected.postType, selected.contentId);
      await fetchList();
    } catch {
      setError('영구 삭제에 실패했습니다.');
    } finally {
      setActing(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>신고·삭제 콘텐츠 관리</h2>
      <p className={styles.pageDesc}>
        신고된 후 삭제된 게시물·댓글을 열람하고, 필요 시 복구하거나 영구 삭제할 수 있습니다.
      </p>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.layout}>
        {/* 목록 패널 */}
        <div className={styles.listPanel}>
          <p className={styles.listHint}>항목을 클릭하면 본문과 신고 내역을 확인할 수 있습니다.</p>
          {loading ? (
            <p className={styles.empty}>불러오는 중...</p>
          ) : summaries.length === 0 ? (
            <p className={styles.empty}>신고 후 삭제된 콘텐츠가 없습니다.</p>
          ) : (
            <div className={styles.list}>
              {summaries.map(s => (
                <div
                  key={`${s.postType}-${s.contentId}`}
                  className={`${styles.listItem} ${selected?.contentId === s.contentId ? styles.listItemActive : ''}`}
                  onClick={() => openDetail(s)}
                >
                  <div className={styles.listItemTop}>
                    <span className={styles.postTypeBadge}>{POST_TYPE_LABELS[s.postType] ?? s.postType}</span>
                    <span className={`${styles.delBadge} ${s.deletedBySelf ? styles.delBadgeSelf : styles.delBadgeAdmin}`}>
                      {s.deletedBySelf ? '본인 삭제' : '관리자·탈퇴 삭제'}
                    </span>
                    <span className={styles.reportCount}>신고 {s.reportCount}건</span>
                  </div>
                  <p className={styles.postTitle}>{displayTitle(s.title, s.preview)}</p>
                  <p className={styles.latestDate}>
                    {s.authorNickname} · 삭제: {formatDate(s.deletedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 상세 패널 */}
        <div className={styles.detailPanel}>
          {!selected ? (
            <div className={styles.detailEmpty}>
              <p>왼쪽 목록에서 항목을 선택하면<br />본문과 신고 내역을 확인할 수 있습니다.</p>
            </div>
          ) : (
            <>
              <div className={styles.detailHeader}>
                <div className={styles.detailHeaderTop}>
                  <span className={styles.postTypeBadge}>{POST_TYPE_LABELS[selected.postType] ?? selected.postType}</span>
                  <div className={styles.detailActions}>
                    <button
                      className={styles.viewBtn}
                      onClick={() => setShowContent(v => !v)}
                      disabled={detailLoading || !detail}
                    >
                      {showContent ? '본문 숨기기' : '열람'}
                    </button>
                    <button
                      className={styles.restoreBtn}
                      onClick={handleRestore}
                      disabled={acting}
                    >
                      {acting ? '처리 중...' : '복구'}
                    </button>
                    {isAdmin && (
                      <button
                        className={styles.deleteContentBtn}
                        onClick={handleHardDelete}
                        disabled={acting}
                      >
                        {acting ? '처리 중...' : '영구 삭제'}
                      </button>
                    )}
                  </div>
                </div>
                <h3 className={styles.detailTitle}>{displayTitle(selected.title, selected.preview)}</h3>
                <p className={styles.detailMeta}>작성자: {selected.authorNickname} · 총 신고 {selected.reportCount}건</p>
                <p className={styles.detailMeta}>
                  삭제: {formatDate(selected.deletedAt)} ({selected.deletedBySelf ? '작성자 본인' : '관리자·탈퇴 등'})
                </p>
              </div>

              {detailLoading ? (
                <p className={styles.empty}>불러오는 중...</p>
              ) : !detail ? (
                <p className={styles.empty}>상세 정보를 불러오지 못했습니다.</p>
              ) : (
                <>
                  {showContent && (
                    <div className={styles.contentBox}>
                      <p className={styles.contentLabel}>본문</p>
                      <p className={styles.contentBody}>{detail.content}</p>
                    </div>
                  )}

                  <p className={styles.sectionLabel}>신고 내역 ({detail.reports.length}건)</p>
                  {detail.reports.length === 0 ? (
                    <p className={styles.empty}>신고 내역이 없습니다.</p>
                  ) : (
                    <div className={styles.reportList}>
                      {detail.reports.map((r, i) => (
                        <div key={i} className={styles.reportItem}>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
