import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import PhotoUploader from '../components/common/PhotoUploader';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  getFishingPostsPage, getFishingPostDetail, createFishingPost, updateFishingPost, deleteFishingPost,
  getFishingPostComments, addFishingPostComment, deleteFishingPostComment,
  type FishingPostListItem, type FishingPostDetail, type FishingPostComment,
} from '../api/fishingPostApi';
import {
  fetchMigratoryFishPointMapMarkers,
  MIGRATORY_SPECIES_LABELS,
  type MigratoryFishPointMapMarker,
} from '../api/migratoryFishPointApi';
import { PROVINCE_LABELS, PROVINCE_OPTIONS, type Province } from '../api/fishingPointApi';
import ReportModal from '../components/common/ReportModal';
import styles from './FishingPostPage.module.css';

type View = 'list' | 'detail';

const ADMIN_NICKNAMES = ['운영자', '관리자', 'admin', 'Admin'];
const PAGE_SIZE = 10;

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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 로드 실패'));
    document.head.appendChild(script);
  });
}

/* ── 지도 포인트 선택 모달 ── */
interface MapPickerProps {
  points: MigratoryFishPointMapMarker[];
  onSelect: (point: MigratoryFishPointMapMarker) => void;
  onClose: () => void;
}

function FishingPostMapPicker({ points, onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // 모달 열린 동안 배경 스크롤 잠금
  useEffect(() => {
    const saved = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = saved; };
  }, []);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) { setMapStatus('error'); return; }
    let cancelled = false;
    loadKakaoSDK(appKey).then(() => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;
        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 13,
        });
        const markers = points.map((fp) => {
          const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
          const marker = new kakao.maps.Marker({ position });
          kakao.maps.event.addListener(marker, 'click', () => onSelectRef.current(fp));
          return marker;
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        new (kakao.maps as any).MarkerClusterer({
          map,
          markers,
          gridSize: 60,
          averageCenter: true,
          minLevel: 5,
        });
        setMapStatus('ready');
      });
    }).catch(() => setMapStatus('error'));
    return () => { cancelled = true; };
  }, [points]); // onSelect는 ref로 안정화 — deps에서 제외

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.mapPickerOverlay} onClick={onClose}>
      <div className={styles.mapPickerModal} onClick={e => e.stopPropagation()}>
        <div className={styles.mapPickerHeader}>
          <span>지도에서 포인트 선택</span>
          <button className={styles.mapPickerClose} onClick={onClose}>✕</button>
        </div>
        <p className={styles.mapPickerHint}>마커를 클릭하면 포인트가 선택됩니다</p>
        {mapStatus === 'loading' && (
          <div className={styles.mapPickerLoading}><div className={styles.spinner} /></div>
        )}
        {mapStatus === 'error' && (
          <div className={styles.mapPickerLoading}>
            <p style={{ color: '#E53E3E', fontSize: 14 }}>지도를 불러오지 못했습니다.</p>
          </div>
        )}
        <div ref={mapRef} className={styles.mapPickerMap} />
      </div>
    </div>
  );
}

/* ── 글쓰기/수정 모달 ──────────────────────────────────────────── */
interface FishingFormState {
  title: string;
  content: string;
  selectedProvince: Province | '';
  migratoryPointId: string;
  selectedPointName: string;
  photoUrls: string[];
  caughtAt: string;
}

interface FishingPostFormModalProps {
  open: boolean;
  editTarget: FishingPostDetail | null;
  points: MigratoryFishPointMapMarker[];
  onClose: () => void;
  onSaved: () => void;
}

function FishingPostFormModal({ open, editTarget, points, onClose, onSaved }: FishingPostFormModalProps) {
  const [form, setForm] = useState<FishingFormState>({
    title: '', content: '', selectedProvince: '',
    migratoryPointId: '', selectedPointName: '', photoUrls: [], caughtAt: todayStr(),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FishingFormState, string>>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pointDropOpen, setPointDropOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      const pt = editTarget.migratoryPointId
        ? points.find(p => p.id === editTarget.migratoryPointId)
        : undefined;
      setForm({
        title: editTarget.title,
        content: editTarget.content,
        selectedProvince: pt?.province ?? '',
        migratoryPointId: editTarget.migratoryPointId ?? '',
        selectedPointName: pt?.name ?? editTarget.pointName ?? '',
        photoUrls: editTarget.photoUrls ?? [],
        caughtAt: editTarget.caughtAt ?? todayStr(),
      });
    } else {
      setForm({ title: '', content: '', selectedProvince: '', migratoryPointId: '', selectedPointName: '', photoUrls: [], caughtAt: todayStr() });
    }
    setErrors({});
    setServerError('');
    setPointDropOpen(false);
    setMapPickerOpen(false);
  }, [open, editTarget, points]);

  const handleMapSelect = (fp: MigratoryFishPointMapMarker) => {
    setForm(prev => ({
      ...prev,
      migratoryPointId: fp.id,
      selectedPointName: fp.name,
      selectedProvince: fp.province,
    }));
    setErrors(prev => ({ ...prev, migratoryPointId: undefined }));
    setMapPickerOpen(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mapPickerOpen) { setMapPickerOpen(false); return; }
        if (pointDropOpen) { setPointDropOpen(false); return; }
        onClose();
      }
    };
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, pointDropOpen, mapPickerOpen]);

  useEffect(() => {
    if (!pointDropOpen) return;
    const onClickOut = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setPointDropOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [pointDropOpen]);

  if (!open) return null;

  const set = <K extends keyof FishingFormState>(k: K, v: FishingFormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const filteredPoints = form.selectedProvince
    ? points.filter(p => p.province === form.selectedProvince)
    : [];

  const validate = () => {
    const e: Partial<Record<keyof FishingFormState, string>> = {};
    if (!form.title.trim()) e.title = '제목을 입력하세요.';
    if (!form.content.trim()) e.content = '내용을 입력하세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const pointId = form.migratoryPointId || undefined;
    const caughtAt = form.caughtAt || undefined;
    try {
      if (editTarget) {
        await updateFishingPost(editTarget.id, form.title.trim(), form.content.trim(), form.photoUrls, pointId, caughtAt);
      } else {
        await createFishingPost(form.title.trim(), form.content.trim(), form.photoUrls, pointId, caughtAt);
      }
      onSaved();
    } catch {
      setServerError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{editTarget ? '조황 수정' : '조황 등록'}</h2>
          <button className={styles.modalClose} onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* 제목 */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>제목 <span className={styles.required}>*</span></label>
            <input
              className={`${styles.fieldInput} ${errors.title ? styles.fieldInputError : ''}`}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="게시글 제목을 입력하세요"
              maxLength={200}
            />
            {errors.title && <p className={styles.errorMsg}>{errors.title}</p>}
          </div>

          {/* 날짜 */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>조황 날짜</label>
            <input type="date" className={styles.fieldInput}
              value={form.caughtAt} max={todayStr()}
              onChange={e => set('caughtAt', e.target.value)} />
          </div>

          {/* 시/도 + 포인트 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>시/도</label>
              <select
                className={styles.fieldSelect}
                value={form.selectedProvince}
                onChange={e => {
                  const prov = e.target.value as Province | '';
                  setForm(prev => ({
                    ...prev,
                    selectedProvince: prov,
                    migratoryPointId: '',
                    selectedPointName: '',
                  }));
                  setPointDropOpen(false);
                }}
              >
                <option value="">시/도 선택</option>
                {PROVINCE_OPTIONS.map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>낚시 포인트 <span className={styles.fieldHint}>(선택)</span></label>
              <div className={styles.pointDropdown} ref={dropRef}>
                <button
                  type="button"
                  className={styles.pointSelectBtn}
                  onClick={() => { if (form.selectedProvince) setPointDropOpen(v => !v); }}
                  disabled={!form.selectedProvince}
                  style={!form.selectedProvince ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                >
                  {form.selectedPointName
                    ? <span>{form.selectedPointName}</span>
                    : <span className={styles.pointSelectPlaceholder}>
                        {form.selectedProvince ? '포인트 선택' : '시/도를 먼저 선택하세요'}
                      </span>}
                  {form.selectedProvince && <span>{pointDropOpen ? '▲' : '▼'}</span>}
                </button>
                {pointDropOpen && form.selectedProvince && (
                  <div className={styles.pointList}>
                    <div
                      className={`${styles.pointListItem} ${!form.migratoryPointId ? styles.pointListItemSelected : ''}`}
                      onClick={() => {
                        setForm(prev => ({ ...prev, migratoryPointId: '', selectedPointName: '' }));
                        setPointDropOpen(false);
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>포인트 없음</span>
                    </div>
                    {filteredPoints.length === 0 ? (
                      <div className={styles.pointListItem} style={{ cursor: 'default', color: 'var(--color-text-muted)' }}>
                        {PROVINCE_LABELS[form.selectedProvince as Province]}에 등록된 포인트가 없습니다
                      </div>
                    ) : filteredPoints.map(p => (
                      <div
                        key={p.id}
                        className={`${styles.pointListItem} ${form.migratoryPointId === p.id ? styles.pointListItemSelected : ''}`}
                        onClick={() => {
                          setForm(prev => ({ ...prev, migratoryPointId: p.id, selectedPointName: p.name }));
                          setErrors(prev => ({ ...prev, migratoryPointId: undefined }));
                          setPointDropOpen(false);
                        }}
                      >
                        <span>{p.name}</span>
                        <span className={styles.pointListItemRegion}>
                          {p.targetSpecies.map(s => MIGRATORY_SPECIES_LABELS[s]).join('·')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.mapSelectBtn}
                onClick={() => setMapPickerOpen(true)}
              >
                🗺️ 지도로 선택하기
              </button>
            </div>
          </div>

          {/* 내용 */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>내용 <span className={styles.required}>*</span></label>
            <textarea
              className={`${styles.fieldTextarea} ${errors.content ? styles.fieldInputError : ''}`}
              value={form.content}
              onChange={e => set('content', e.target.value)}
              placeholder="조황 내용을 공유해 주세요"
              rows={5}
              maxLength={1000}
            />
            <span className={styles.charCount}>{form.content.length}/1000자</span>
            {errors.content && <p className={styles.errorMsg}>{errors.content}</p>}
          </div>

          {/* 사진 */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>사진 (최대 3장)</label>
            <PhotoUploader
              value={form.photoUrls}
              onChange={urls => set('photoUrls', urls)}
              boardType="FISHING_POST"
              maxPhotos={3}
              disabled={saving}
            />
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

      {mapPickerOpen && (
        <FishingPostMapPicker
          points={points}
          onSelect={handleMapSelect}
          onClose={() => setMapPickerOpen(false)}
        />
      )}
    </div>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────────── */
export default function FishingPostPage() {
  const { isLoggedIn, isAdmin, isModerator, userId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView]     = useState<View>('list');
  const [items, setItems]   = useState<FishingPostListItem[]>([]);
  const [detail, setDetail] = useState<FishingPostDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError]   = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen]     = useState(false);
  const [editingPost, setEditingPost] = useState<FishingPostDetail | null>(null);

  const [points, setPoints] = useState<MigratoryFishPointMapMarker[]>([]);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const [comments, setComments] = useState<FishingPostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentReportTarget, setCommentReportTarget] = useState<{ id: string; content: string } | null>(null);

  const fetchList = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getFishingPostsPage(page, PAGE_SIZE);
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
  useEffect(() => { fetchMigratoryFishPointMapMarkers().then(setPoints).catch(() => {}); }, []);

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
    if (!isLoggedIn) { navigate('/login'); return; }
    setDetailLoading(true); setDetail(null); setComments([]); setCommentInput(''); setReplyTo(null); setView('detail');
    try {
      const [d, c] = await Promise.all([getFishingPostDetail(id), getFishingPostComments(id)]);
      setDetail(d); setComments(c);
    }
    catch { setError('게시글을 불러오지 못했습니다.'); setView('list'); }
    finally { setDetailLoading(false); }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addFishingPostComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getFishingPostComments(detail.id));
      setCommentInput(''); setReplyTo(null);
    } catch { setError('댓글 작성에 실패했습니다.'); }
    finally { setCommentSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!detail || !window.confirm('댓글을 삭제하시겠습니까?')) return;
    try {
      await deleteFishingPostComment(detail.id, commentId);
      setComments(await getFishingPostComments(detail.id));
    } catch { setError('댓글 삭제에 실패했습니다.'); }
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
    fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try { await deleteFishingPost(detail.id); await fetchList(currentPage); setView('list'); }
    catch { setError('삭제에 실패했습니다.'); }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

  const getDescendants = (parentId: string): FishingPostComment[] => {
    const children = comments.filter(c => c.parentId === parentId);
    return children.flatMap(child => [child, ...getDescendants(child.id)]);
  };

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🐟 조황 게시판</h1>
            <p className={styles.pageDesc}>
              낚시 조황을 공유하고 정보를 나눠보세요.
              {view === 'list' && totalElements > 0 && <span className={styles.totalCount}> 총 {totalElements}개</span>}
            </p>
          </div>
          {view === 'list' && isLoggedIn && (
            <button className={styles.createBtn} onClick={openCreate}>글쓰기</button>
          )}
          {view === 'detail' && (
            <button className={styles.iconActionBtn} onClick={() => setView('list')}>← 목록</button>
          )}
        </div>

        {view === 'list' && (
          <>
            {error && <p className={styles.error}>{error}</p>}

            {loading ? (
              <p className={styles.empty}>불러오는 중...</p>
            ) : items.length === 0 ? (
              <p className={styles.empty}>아직 게시글이 없습니다. 첫 번째 조황을 공유해 보세요!</p>
            ) : (
              <>
                <div className={styles.list}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.listItem} onClick={() => openDetail(item.id)}>
                      <div className={styles.listTop}>
                        <span className={styles.listTitle}>{item.title}</span>
                        <span className={styles.listDate}>{formatDate(item.createdAt)}</span>
                      </div>
                      <div className={styles.listBottom}>
                        {item.pointName
                          ? <span className={styles.listPoint}>📍 {item.pointName}</span>
                          : <span className={styles.listNoPoint}>포인트 미지정</span>}
                        <div className={styles.listMeta}>
                          {item.photoUrls?.length > 0 && <span className={styles.listPhotoIcon}>📷</span>}
                          {(item.commentCount ?? 0) > 0 && <span className={styles.listCommentCount}>💬 {item.commentCount}</span>}
                          <AuthorLabel nickname={item.authorNickname} />
                        </div>
                      </div>
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
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailTitleRow}>
                    <h2 className={styles.detailTitle}>{detail.title}</h2>
                    <div className={styles.detailTopActions}>
                      {isLoggedIn && (
                        <>
                          <button className={styles.iconActionBtn} onClick={openEdit}><span>✏️</span>수정</button>
                          <button className={`${styles.iconActionBtn} ${styles.iconActionBtnDanger}`} onClick={handleDelete}><span>🗑️</span>삭제</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className={styles.detailMeta}>
                    <span className={styles.authorChip}>
                      <span className={styles.authorAvatar}>{detail.authorNickname.charAt(0)}</span>
                      {detail.authorNickname}
                    </span>
                    {detail.caughtAt && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span>🗓 {detail.caughtAt}</span>
                      </>
                    )}
                    {detail.pointName && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaPoint}>📍 {detail.pointName}</span>
                      </>
                    )}
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

                <h3 className={styles.contentLabel}>📝 게시물 내용</h3>
                <p className={styles.detailContent}>{detail.content}</p>

                {detail.photoUrls?.length > 0 && (
                  <div className={`${styles.photoGrid} ${detail.photoUrls.length === 1 ? styles.photoGridSingle : ''}`}>
                    {detail.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`사진 ${i + 1}`} className={styles.detailPhoto}
                        onClick={() => setLbIdx(i)} />
                    ))}
                  </div>
                )}

                {/* 댓글 영역 */}
                <div className={styles.commentSection}>
                  <h4 className={styles.commentTitle}>댓글 <span className={styles.commentCountNum}>{comments.filter(c => !c.deleted).length}</span></h4>

                  {comments.filter(c => !c.parentId).map(c => (
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
                              {isLoggedIn && <button className={styles.replyBtn} onClick={() => setReplyTo({ id: c.id, nickname: c.authorNickname })}>답글</button>}
                              {isLoggedIn && <button className={styles.reportCommentBtn} onClick={() => setCommentReportTarget({ id: c.id, content: c.content })}>신고</button>}
                              {(isAdmin || isModerator || c.authorId === userId) && (
                                <button className={styles.delBtn} onClick={() => handleDeleteComment(c.id)}>삭제</button>
                              )}
                            </div>
                          </div>
                          <p className={styles.commentContent}>{c.content}</p>
                        </>
                      )}

                      {getDescendants(c.id).map(r => (
                        <div key={r.id} className={styles.reply}>
                          {r.deleted ? (
                            <p className={styles.deletedComment}>삭제된 댓글입니다.</p>
                          ) : (
                            <>
                              <div className={styles.commentHeader}>
                                <span className={styles.replyArrow}>↳</span>
                                <span className={styles.commentAvatar}>{r.authorNickname.charAt(0)}</span>
                                <span className={styles.commentAuthor}>{r.authorNickname}</span>
                                <span className={styles.commentDate}>{formatDate(r.createdAt)}</span>
                                <div className={styles.commentActions}>
                                  {isLoggedIn && <button className={styles.replyBtn} onClick={() => setReplyTo({ id: r.id, nickname: r.authorNickname })}>답글</button>}
                                  {isLoggedIn && <button className={styles.reportCommentBtn} onClick={() => setCommentReportTarget({ id: r.id, content: r.content })}>신고</button>}
                                  {(isAdmin || isModerator || r.authorId === userId) && (
                                    <button className={styles.delBtn} onClick={() => handleDeleteComment(r.id)}>삭제</button>
                                  )}
                                </div>
                              </div>
                              <p className={styles.commentContent}>{r.content}</p>
                            </>
                          )}
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
              </div>
            )}
          </>
        )}

      </div>

      <FishingPostFormModal
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
      {commentReportTarget && detail && (
        <ReportModal
          postId={commentReportTarget.id}
          postType="FISHING_COMMENT"
          postTitle={commentReportTarget.content.slice(0, 100)}
          parentPostId={detail.id}
          onClose={() => setCommentReportTarget(null)}
        />
      )}
    </div>
  );
}
