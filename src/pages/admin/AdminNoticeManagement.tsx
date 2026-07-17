import { useState, useEffect, useCallback } from 'react';
import PostFormModal from '../../components/common/PostFormModal';
import Pagination from '../../components/common/Pagination';
import {
  getNoticesPage, getNoticeDetail, createNotice, updateNotice, deleteNotice,
  type NoticeListItem, type NoticeDetail,
} from '../../api/noticeApi';
import styles from './AdminNoticeManagement.module.css';

type View = 'list' | 'detail';
const PAGE_SIZE = 20;

export default function AdminNoticeManagement() {
  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<NoticeListItem[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NoticeDetail | null>(null);

  const fetchList = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const r = await getNoticesPage(page, PAGE_SIZE);
      setItems(r.content); setTotalPages(r.totalPages); setCurrentPage(r.page);
    } catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(0); }, [fetchList]);

  const openDetail = async (id: string) => {
    setDetail(null); setView('detail');
    try { setDetail(await getNoticeDetail(id)); }
    catch { setError('공지사항을 불러오지 못했습니다.'); setView('list'); }
  };

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    if (editing) {
      await updateNotice(editing.id, title, content, photoUrls);
    } else {
      await createNotice(title, content, photoUrls);
    }
    fetchList(0);
    setView('list');
    setDetail(null);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('공지사항을 삭제하시겠습니까?')) return;
    try { await deleteNotice(detail.id); fetchList(0); setView('list'); setDetail(null); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  const fmt = (s: string) => new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div className={styles.page}>
      {view === 'list' ? (
        <>
          <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>공지사항 관리</h2>
            <button className={styles.createBtn} onClick={() => { setEditing(null); setModalOpen(true); }}>+ 공지 등록</button>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <div className={styles.skeletons}>{[1,2,3].map(i => <div key={i} className={styles.skeleton} />)}</div>
          ) : items.length === 0 ? (
            <p className={styles.empty}>등록된 공지사항이 없습니다.</p>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>제목</th><th>작성자</th><th>등록일</th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className={styles.tr} onClick={() => openDetail(item.id)}>
                        <td>{item.title}</td>
                        <td>{item.authorNickname}</td>
                        <td>{fmt(item.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchList}
              />
            </>
          )}
        </>
      ) : (
        <>
          <button className={styles.backBtn} onClick={() => { setView('list'); setError(''); }}>← 목록으로</button>
          {detail && (
            <div className={styles.detailCard}>
              <h3 className={styles.detailTitle}>{detail.title}</h3>
              <div className={styles.detailMeta}>
                <span>{detail.authorNickname}</span>
                <span className={styles.dot}>·</span>
                <span>{fmt(detail.createdAt)}</span>
                {detail.updatedAt && <span className={styles.updated}>(수정됨: {fmt(detail.updatedAt)})</span>}
              </div>
              <div className={styles.divider} />
              <p className={styles.detailContent}>{detail.content}</p>
              {detail.photoUrls?.length > 0 && (
                <div className={styles.photoGrid}>
                  {detail.photoUrls.map((url, i) => (
                    <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.photo} />
                  ))}
                </div>
              )}
              <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => { setEditing(detail); setModalOpen(true); }}>수정</button>
                <button className={styles.deleteBtn} onClick={handleDelete}>삭제</button>
              </div>
            </div>
          )}
        </>
      )}

      <PostFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        modalTitle={editing ? '공지사항 수정' : '공지사항 등록'}
        titlePlaceholder="제목을 입력하세요."
        contentPlaceholder="내용을 입력하세요."
        initialTitle={editing?.title}
        initialContent={editing?.content}
        maxPhotos={null}
        boardType="NOTICE"
        initialPhotoUrls={editing?.photoUrls ?? []}
      />
    </div>
  );
}
