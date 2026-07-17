import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Pagination from '../components/common/Pagination';
import PostFormModal from '../components/common/PostFormModal';
import PhotoUploader from '../components/common/PhotoUploader';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  getFishingPostsPage, getFishingPostDetail, createFishingPost, updateFishingPost, deleteFishingPost,
  type FishingPostListItem, type FishingPostDetail,
} from '../api/fishingPostApi';
import {
  fetchMigratoryFishPointMapMarkers, MIGRATORY_SPECIES_LABELS,
  type MigratoryFishPointMapMarker,
} from '../api/migratoryFishPointApi';
import { PROVINCE_LABELS, PROVINCE_OPTIONS, type Province } from '../api/fishingPointApi';
import {
  getNoticesPreview, getNoticesPage, getNoticeDetail, createNotice, updateNotice, deleteNotice,
  type NoticeListItem, type NoticeDetail,
} from '../api/noticeApi';
import {
  getFreePostsPreview,
  type FreePostListItem,
} from '../api/freePostApi';
import ReportModal from '../components/common/ReportModal';
import styles from './CommunityPage.module.css';

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── 조황 작성/수정 모달 ──────────────────────────────────────────── */
interface FishingWriteState {
  title: string; content: string; photoUrls: string[];
  selectedProvince: Province | ''; migratoryPointId: string; selectedPointName: string;
  caughtAt: string;
  lure: string; fishSizeCm: string; action: string;
}
interface FishingWriteModalProps {
  open: boolean; editTarget: FishingPostDetail | null;
  points: MigratoryFishPointMapMarker[];
  onClose: () => void; onSaved: () => void;
}
function FishingWriteModal({ open, editTarget, points, onClose, onSaved }: FishingWriteModalProps) {
  const [form, setForm] = useState<FishingWriteState>({
    title: '', content: '', photoUrls: [],
    selectedProvince: '', migratoryPointId: '', selectedPointName: '', caughtAt: todayStr(),
    lure: '', fishSizeCm: '', action: '',
  });
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      const pt = editTarget.migratoryPointId ? points.find(p => p.id === editTarget.migratoryPointId) : undefined;
      setForm({
        title: editTarget.title, content: editTarget.content, photoUrls: editTarget.photoUrls ?? [],
        selectedProvince: pt?.province ?? '',
        migratoryPointId: editTarget.migratoryPointId ?? '',
        selectedPointName: pt?.name ?? editTarget.pointName ?? '',
        caughtAt: editTarget.caughtAt ?? todayStr(),
        lure: editTarget.lure ?? '',
        fishSizeCm: editTarget.fishSizeCm != null ? String(editTarget.fishSizeCm) : '',
        action: editTarget.action ?? '',
      });
    } else {
      setForm({ title: '', content: '', photoUrls: [], selectedProvince: '', migratoryPointId: '', selectedPointName: '', caughtAt: todayStr(), lure: '', fishSizeCm: '', action: '' });
    }
    setErrors({}); setServerError(''); setDropOpen(false);
  }, [open, editTarget, points]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { if (dropOpen) setDropOpen(false); else onClose(); } };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, dropOpen]);

  useEffect(() => {
    if (!dropOpen) return;
    const onClick = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [dropOpen]);

  if (!open) return null;

  const set = <K extends keyof FishingWriteState>(k: K, v: FishingWriteState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const filteredPoints = form.selectedProvince ? points.filter(p => p.province === form.selectedProvince) : [];

  const handleSubmit = async () => {
    const e: { title?: string; content?: string } = {};
    if (!form.title.trim()) e.title = '제목을 입력하세요.';
    if (!form.content.trim()) e.content = '내용을 입력하세요.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true); setServerError('');
    const pointId = form.migratoryPointId || undefined;
    const caughtAt = form.caughtAt || undefined;
    const lure = form.lure.trim() || undefined;
    const fishSizeCm = form.fishSizeCm.trim() ? Number(form.fishSizeCm.trim()) : undefined;
    const action = form.action.trim() || undefined;
    try {
      if (editTarget) {
        await updateFishingPost(editTarget.id, form.title.trim(), form.content.trim(), form.photoUrls, pointId, caughtAt, lure, fishSizeCm, action);
      } else {
        await createFishingPost(form.title.trim(), form.content.trim(), form.photoUrls, pointId, caughtAt, lure, fishSizeCm, action);
      }
      onSaved();
    } catch { setServerError('저장 중 오류가 발생했습니다.'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editTarget ? '조황 수정' : '조황 등록'}</h2>
          <button className={styles.modalClose} onClick={onClose} disabled={saving}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>제목 <span className={styles.required}>*</span></label>
            <input className={`${styles.fieldInput} ${errors.title ? styles.fieldInputError : ''}`}
              value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="게시글 제목을 입력하세요" maxLength={200} />
            {errors.title && <p className={styles.errorMsg}>{errors.title}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>조황 날짜</label>
              <input type="date" className={styles.fieldInput}
                value={form.caughtAt} max={todayStr()}
                onChange={e => set('caughtAt', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>시/도</label>
              <select className={styles.fieldSelect} value={form.selectedProvince}
                onChange={e => { const v = e.target.value as Province | '';
                  setForm(prev => ({ ...prev, selectedProvince: v, migratoryPointId: '', selectedPointName: '' }));
                  setDropOpen(false); }}>
                <option value="">시/도 선택</option>
                {PROVINCE_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>낚시 포인트 <span className={styles.fieldHint}>(선택)</span></label>
            <div className={styles.pointDropdown} ref={dropRef}>
              <button type="button" className={styles.pointSelectBtn}
                onClick={() => { if (form.selectedProvince) setDropOpen(v => !v); }}
                disabled={!form.selectedProvince}
                style={!form.selectedProvince ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                {form.selectedPointName
                  ? <span>{form.selectedPointName}</span>
                  : <span className={styles.pointSelectPlaceholder}>{form.selectedProvince ? '포인트 선택' : '시/도를 먼저 선택하세요'}</span>}
                {form.selectedProvince && <span>{dropOpen ? '▲' : '▼'}</span>}
              </button>
              {dropOpen && form.selectedProvince && (
                <div className={styles.pointList}>
                  <div className={`${styles.pointListItem} ${!form.migratoryPointId ? styles.pointListItemSelected : ''}`}
                    onClick={() => { setForm(prev => ({ ...prev, migratoryPointId: '', selectedPointName: '' })); setDropOpen(false); }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>포인트 없음</span>
                  </div>
                  {filteredPoints.length === 0
                    ? <div className={styles.pointListItem} style={{ cursor: 'default', color: 'var(--color-text-muted)' }}>
                        {PROVINCE_LABELS[form.selectedProvince as Province]}에 등록된 포인트가 없습니다
                      </div>
                    : filteredPoints.map(p => (
                        <div key={p.id}
                          className={`${styles.pointListItem} ${form.migratoryPointId === p.id ? styles.pointListItemSelected : ''}`}
                          onClick={() => { setForm(prev => ({ ...prev, migratoryPointId: p.id, selectedPointName: p.name })); setDropOpen(false); }}>
                          <span>{p.name}</span>
                          <span className={styles.pointListItemRegion}>{p.targetSpecies.map(s => MIGRATORY_SPECIES_LABELS[s]).join('·')}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>내용 <span className={styles.required}>*</span></label>
            <textarea className={`${styles.fieldTextarea} ${errors.content ? styles.fieldInputError : ''}`}
              value={form.content} onChange={e => set('content', e.target.value)}
              placeholder="조황 내용을 공유해 주세요" rows={5} />
            {errors.content && <p className={styles.errorMsg}>{errors.content}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>루어 <span className={styles.fieldHint}>(선택)</span></label>
              <input className={styles.fieldInput}
                value={form.lure} onChange={e => set('lure', e.target.value)}
                placeholder="예: 바이브 20g" maxLength={100} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>어종 크기 <span className={styles.fieldHint}>(선택)</span></label>
              <div style={{ position: 'relative' }}>
                <input className={styles.fieldInput}
                  style={{ paddingRight: 36 }}
                  value={form.fishSizeCm}
                  onChange={e => set('fishSizeCm', e.target.value.replace(/[^0-9]/g, ''))}
                  inputMode="numeric"
                  placeholder="예: 45" maxLength={4} />
                <span style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: 'var(--color-text-muted)', pointerEvents: 'none',
                }}>cm</span>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>사용한 액션 <span className={styles.fieldHint}>(선택)</span></label>
              <input className={styles.fieldInput}
                value={form.action} onChange={e => set('action', e.target.value)}
                placeholder="예: 저킹, 슬로우롤" maxLength={100} />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>사진 (최대 3장)</label>
            <PhotoUploader value={form.photoUrls} onChange={urls => set('photoUrls', urls)}
              boardType="FISHING_POST" maxPhotos={3} disabled={saving} />
          </div>

          {serverError && <p className={styles.serverError}>{serverError}</p>}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>취소</button>
          <button className={styles.submitBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : editTarget ? '수정 완료' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
export function FishingBoard({ isLoggedIn, className, navigateOnClick }: { isLoggedIn: boolean; className?: string; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const { userId, isAdmin, isModerator } = useAuth();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<FishingPostListItem[]>([]);
  const [detail, setDetail] = useState<FishingPostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FishingPostDetail | null>(null);
  const [points, setPoints] = useState<MigratoryFishPointMapMarker[]>([]);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchList = useCallback(async (page = 0) => {
    setLoading(true);
    try {
      if (navigateOnClick) {
        setItems((await getFishingPostsPage(0, 5)).content);
      } else {
        const result = await getFishingPostsPage(page, 10);
        setItems(result.content);
        setTotalPages(result.totalPages);
        setCurrentPage(result.page);
      }
    }
    catch { setError('목록을 불러오지 못했습니다.'); }
    finally { setLoading(false); }
  }, [navigateOnClick]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchMigratoryFishPointMapMarkers().then(setPoints).catch(() => {}); }, []);

  const openDetail = async (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getFishingPostDetail(id)); }
    catch { setError('게시글을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => { setEditingPost(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingPost(detail); setModalOpen(true); };

  const handleSaved = async () => {
    setModalOpen(false);
    if (editingPost && detail) {
      const updated = await getFishingPostDetail(detail.id).catch(() => null);
      if (updated) setDetail(updated);
    } else {
      setView('list');
    }
    await fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try { await deleteFishingPost(detail.id); await fetchList(currentPage); setView('list'); }
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
                <div key={item.id} className={styles.boardItem}
                  onClick={() => {
                    if (!isLoggedIn) { navigate('/login'); return; }
                    if (navigateOnClick) navigate('/fishing-posts', { state: { openPostId: item.id } });
                    else openDetail(item.id);
                  }}>
                  <div className={styles.boardTop}>
                    <span className={styles.boardTitle}>{item.title}</span>
                    <span className={styles.boardDate}>{item.caughtAt ?? formatDate(item.createdAt)}</span>
                  </div>
                  <div className={styles.boardBottom}>
                    {item.pointName
                      ? <span className={styles.boardPoint}>📍 {item.pointName}</span>
                      : <span />}
                    <div className={styles.boardMeta}>
                      {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷 {item.photoUrls.length}</span>}
                      {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                      <AuthorLabel nickname={item.authorNickname} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {navigateOnClick ? (
              <button className={styles.moreBtn} onClick={() => navigate('/fishing-posts')}>더보기</button>
            ) : totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={fetchList}
              />
            )}
          </>
      )}

      {view === 'detail' && (
        detailLoading || !detail ? <p className={styles.empty}>불러오는 중...</p>
        : <div className={styles.detailWrap}>
            <div className={styles.detailHeader}>
              <h3 className={styles.detailTitle}>{detail.title}</h3>
              <div className={styles.detailMeta}>
                <AuthorLabel nickname={detail.authorNickname} />
                {detail.caughtAt && <span>🗓 {detail.caughtAt}</span>}
                {detail.pointName && <span>📍 {detail.pointName}</span>}
                <span>{formatDate(detail.createdAt)}</span>
              </div>
              {isLoggedIn && (
                <button className={styles.reportBtn} onClick={() => setReportOpen(true)}>신고하기</button>
              )}
            </div>
            {(detail.lure || detail.fishSizeCm != null || detail.action) && (
              <div className={styles.catchInfoRow}>
                {detail.lure && <span className={styles.catchInfoTag}>🎣 {detail.lure}</span>}
                {detail.fishSizeCm != null && <span className={styles.catchInfoTag}>📏 {detail.fishSizeCm}cm</span>}
                {detail.action && <span className={styles.catchInfoTag}>💫 {detail.action}</span>}
              </div>
            )}
            <p className={styles.detailContent}>{detail.content}</p>
            {detail.photoUrls?.length > 0 && (
              <div className={styles.photoGrid}>
                {detail.photoUrls.map((url, i) => (
                  <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.photo}
                    style={{ cursor: 'pointer' }} onClick={() => setLbIdx(i)} />
                ))}
              </div>
            )}
            {(detail.authorId === userId || isAdmin || isModerator) && (
              <div className={styles.detailActions}>
                <button className={styles.deleteBtn} onClick={handleDelete}>삭제</button>
                <button className={styles.editBtn} onClick={openEdit}>수정</button>
              </div>
            )}
          </div>
      )}

      {reportOpen && detail && (
        <ReportModal
          postId={detail.id}
          postType="FISHING_POST"
          postTitle={detail.title}
          onClose={() => setReportOpen(false)}
        />
      )}

      <FishingWriteModal
        open={modalOpen}
        editTarget={editingPost}
        points={points}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
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

/* ─────────────────────────────────────────────────────────── */
/* 공지사항 게시판                                              */
/* ─────────────────────────────────────────────────────────── */
export function NoticeBoard({ isAdmin, navigateOnClick }: { isAdmin: boolean; navigateOnClick?: boolean }) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [view, setView]     = useState<BoardView>('list');
  const [items, setItems]   = useState<NoticeListItem[]>([]);
  const [detail, setDetail] = useState<NoticeDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');
  const [modalOpen, setModalOpen]   = useState(false);
  const [editingNotice, setEditingNotice] = useState<NoticeDetail | null>(null);
  const [lbIdx, setLbIdx] = useState<number | null>(null);
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

  const openDetail = async (id: string) => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setView('detail');
    try { setDetail(await getNoticeDetail(id)); }
    catch { setError('공지사항을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const openCreate = () => { setEditingNotice(null); setModalOpen(true); };
  const openEdit   = () => { if (!detail) return; setEditingNotice(detail); setModalOpen(true); };

  const handleSubmit = async (title: string, content: string, photoUrls: string[]) => {
    if (editingNotice) {
      await updateNotice(editingNotice.id, title, content, photoUrls);
      setDetail(await getNoticeDetail(editingNotice.id));
    } else {
      await createNotice(title, content, photoUrls);
      setView('list');
    }
    await fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('공지사항을 삭제하시겠습니까?')) return;
    try { await deleteNotice(detail.id); await fetchList(currentPage); setView('list'); }
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
                <div key={item.id} className={styles.boardItem}
                  onClick={() => {
                    if (!isLoggedIn) { navigate('/login'); return; }
                    if (navigateOnClick) navigate('/notices', { state: { openPostId: item.id } });
                    else openDetail(item.id);
                  }}>
                  <span className={styles.boardTitle}>{item.title}</span>
                  <span className={styles.boardMeta}>
                    {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷</span>}
                    {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                    <AuthorLabel nickname={item.authorNickname} />
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
            {detail.photoUrls?.length > 0 && (
              <div className={styles.photoGrid}>
                {detail.photoUrls.map((url, i) => (
                  <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.photo}
                    style={{ cursor: 'pointer' }} onClick={() => setLbIdx(i)} />
                ))}
              </div>
            )}
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

/* ─────────────────────────────────────────────────────────── */
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
    if (!isLoggedIn) { navigate('/login'); return; }
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
                    {item.photoUrls?.length > 0 && <span className={styles.boardBadgeIcon}>📷 {item.photoUrls.length}</span>}
                    {(item.commentCount ?? 0) > 0 && <span className={styles.boardBadgeIcon}>💬 {item.commentCount}</span>}
                    <AuthorLabel nickname={item.authorNickname} />
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
