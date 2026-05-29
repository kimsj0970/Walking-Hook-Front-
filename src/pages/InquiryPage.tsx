import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import {
  createInquiry,
  getMyInquiries,
  getAllInquiries,
  getInquiryDetail,
  type InquiryListItem,
  type AdminInquiryListItem,
  type InquiryDetail,
} from '../api/inquiryApi';
import styles from './InquiryPage.module.css';

type View = 'list' | 'detail' | 'create';

export default function InquiryPage() {
  const { isAdmin } = useAuth();

  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<InquiryListItem[] | AdminInquiryListItem[]>([]);
  const [detail, setDetail] = useState<InquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = isAdmin ? await getAllInquiries() : await getMyInquiries();
      setItems(result);
    } catch {
      setError('목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setView('detail');
    try {
      const result = await getInquiryDetail(id);
      setDetail(result);
    } catch {
      setError('문의 상세를 불러오지 못했습니다.');
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimTitle = formTitle.trim();
    const trimContent = formContent.trim();
    if (!trimTitle) { setFormError('제목을 입력해 주세요.'); return; }
    if (!trimContent) { setFormError('내용을 입력해 주세요.'); return; }
    setFormError('');
    setSubmitLoading(true);
    try {
      await createInquiry(trimTitle, trimContent);
      setFormTitle('');
      setFormContent('');
      setView('list');
      await fetchList();
    } catch {
      setFormError('문의 등록에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

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
                  {isAdmin ? '전체 문의 목록입니다.' : '내 문의 내역을 확인할 수 있습니다.'}
                </p>
              </div>
              {!isAdmin && (
                <button
                  className={styles.createBtn}
                  onClick={() => { setFormError(''); setView('create'); }}
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
                  {isAdmin ? '접수된 문의가 없습니다.' : '등록된 문의가 없습니다.'}
                </p>
                {!isAdmin && (
                  <button
                    className={styles.createBtn}
                    onClick={() => { setFormError(''); setView('create'); }}
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
                        <td className={styles.tdTitle}>{item.title}</td>
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
              </div>
            ) : null}
          </>
        )}

        {/* ── Create View ── */}
        {view === 'create' && (
          <>
            <button className={styles.backBtn} onClick={() => setView('list')}>
              ← 목록으로
            </button>
            <div className={styles.formCard}>
              <h2 className={styles.formTitle}>문의 등록</h2>
              <form onSubmit={handleSubmitCreate} className={styles.form}>
                <label className={styles.label}>
                  제목
                  <input
                    className={styles.input}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    maxLength={200}
                    placeholder="문의 제목을 입력해 주세요."
                  />
                </label>
                <label className={styles.label}>
                  내용
                  <textarea
                    className={styles.textarea}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    placeholder="문의 내용을 자세히 입력해 주세요."
                    rows={8}
                  />
                </label>
                {formError && <p className={styles.formError}>{formError}</p>}
                <div className={styles.formBtnRow}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setView('list')}
                    disabled={submitLoading}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={submitLoading}
                  >
                    {submitLoading ? '등록 중...' : '문의 등록'}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
