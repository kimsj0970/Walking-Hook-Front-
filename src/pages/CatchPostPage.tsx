import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Pagination from '../components/common/Pagination';
import PhotoUploader from '../components/common/PhotoUploader';
import ImageLightbox from '../components/common/ImageLightbox';
import MigratoryPointMapPicker from '../components/map/MigratoryPointMapPicker';
import {
  getCatchPostsPage, getCatchPostDetail, createCatchPost,
  updateCatchPost, deleteCatchPost, getCatchPostMapPoints,
  getCatchPostComments, addCatchPostComment, deleteCatchPostComment,
  type CatchPostListItem, type CatchPostDetail, type CatchPostCreateRequest,
  type CatchPostComment,
} from '../api/catchPostApi';
import {
  FISH_SPECIES_BY_GROUP, FISH_SPECIES_LABELS, SPECIES_GROUP_LABELS,
  MAX_SPECIES_COUNT, MAX_SPECIES_NAME_LENGTH,
  normalizeSpeciesName, validateSpeciesName,
  type FishSpecies,
} from '../api/fishSpecies';
import {
  fetchMigratoryFishPointMapMarkers,
  type MigratoryFishPointMapMarker,
} from '../api/migratoryFishPointApi';
import { PROVINCE_LABELS, PROVINCE_OPTIONS, type Province } from '../api/fishingPointApi';
import { blockUser } from '../api/blockApi';
import ReportModal from '../components/common/ReportModal';
import MonthYearPicker from '../components/common/MonthYearPicker';
import ReactionBar from '../components/common/ReactionBar';
import styles from './CatchPostPage.module.css';

type View = 'list' | 'detail';
const PAGE_SIZE = 10;

/** 어종 필터 칩·빈 목록 문구에 쓸 이름. 'CUSTOM' 은 목록에 없는 어종을 모은 항목이다. */
function speciesFilterLabel(filter: FishSpecies | 'CUSTOM' | null): string {
  if (!filter) return '';
  return filter === 'CUSTOM' ? '기타 어종' : FISH_SPECIES_LABELS[filter];
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── 게시글 작성/수정 모달 ────────────────────────────────────────── */
interface FormState {
  title: string;
  content: string;
  /** 어종명 목록. 칩에서 고른 것과 직접 입력한 것이 섞여 순서대로 쌓인다. */
  species: string[];
  caughtAt: string;
  selectedProvince: Province | '';
  migratoryPointId: string;
  selectedPointName: string;
  photoUrls: string[];
  lure: string;
  fishSizeCm: string;
  action: string;
}

interface PostFormModalProps {
  open: boolean;
  editTarget: CatchPostDetail | null;
  points: MigratoryFishPointMapMarker[];
  onClose: () => void;
  onSaved: () => void;
}

function PostFormModal({ open, editTarget, points, onClose, onSaved }: PostFormModalProps) {
  const [form, setForm] = useState<FormState>({
    title: '', content: '', species: [], caughtAt: todayStr(),
    selectedProvince: '', migratoryPointId: '', selectedPointName: '', photoUrls: [],
    lure: '', fishSizeCm: '', action: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pointDropOpen, setPointDropOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  /** 아직 확정되지 않은 직접 입력 텍스트 */
  const [speciesDraft, setSpeciesDraft] = useState('');
  const [speciesError, setSpeciesError] = useState('');

  /** 어종명이 목록에 있는 어종인지 — 태그 색을 가르는 데 쓴다. */
  const speciesCodeOf = (name: string): FishSpecies | null => {
    const found = FISH_SPECIES_BY_GROUP.flatMap(([, items]) => items).find(([, label]) => label === name);
    return found ? found[0] : null;
  };

  /** 입력창의 텍스트를 태그로 확정한다. 규칙 위반이면 문구만 띄우고 추가하지 않는다. */
  const commitSpeciesDraft = () => {
    const message = validateSpeciesName(speciesDraft, form.species);
    if (message) {
      setSpeciesError(message);
      return;
    }
    set('species', [...form.species, normalizeSpeciesName(speciesDraft)]);
    setSpeciesDraft('');
    setSpeciesError('');
  };

  /**
   * 칩을 누르면 입력창에 쓰던 텍스트를 버리고 그 어종을 태그로 확정한다.
   * 이미 담긴 어종을 다시 누르면 제거한다(토글).
   */
  const toggleSpeciesChip = (label: string) => {
    if (form.species.includes(label)) {
      set('species', form.species.filter(s => s !== label));
      return;
    }
    if (form.species.length >= MAX_SPECIES_COUNT) {
      setSpeciesError(`어종은 최대 ${MAX_SPECIES_COUNT}개까지 추가할 수 있습니다.`);
      return;
    }
    setSpeciesDraft('');
    setSpeciesError('');
    set('species', [...form.species, label]);
  };

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      const pt = editTarget.migratoryPointId
        ? points.find(p => p.id === editTarget.migratoryPointId)
        : undefined;
      setForm({
        title: editTarget.title,
        content: editTarget.content,
        species: editTarget.species.map(s => s.name),
        caughtAt: editTarget.caughtAt,
        selectedProvince: pt?.province ?? '',
        migratoryPointId: editTarget.migratoryPointId ?? '',
        selectedPointName: pt?.name ?? editTarget.pointName ?? '',
        photoUrls: editTarget.photoUrls ?? [],
        lure: editTarget.lure ?? '',
        fishSizeCm: editTarget.fishSizeCm != null ? String(editTarget.fishSizeCm) : '',
        action: editTarget.action ?? '',
      });
    } else {
      setForm({ title: '', content: '', species: [], caughtAt: todayStr(), selectedProvince: '', migratoryPointId: '', selectedPointName: '', photoUrls: [], lure: '', fishSizeCm: '', action: '' });
    }
    setSpeciesDraft('');
    setSpeciesError('');
    setErrors({});
    setServerError('');
    setPointDropOpen(false);
    setMapPickerOpen(false);
  }, [open, editTarget, points]);

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

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors(prev => ({ ...prev, [k]: undefined }));
  };

  const filteredPoints = form.selectedProvince
    ? points.filter(p => p.province === form.selectedProvince)
    : [];

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

  const validate = () => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = '제목을 입력하세요.';
    if (!form.content.trim()) e.content = '내용을 입력하세요.';
    if (form.species.length === 0) e.species = '어종을 1개 이상 선택하세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const req: CatchPostCreateRequest = {
      title: form.title.trim(),
      content: form.content.trim(),
      species: form.species,
      caughtAt: form.caughtAt || undefined,
      migratoryPointId: form.migratoryPointId || undefined,
      photoUrls: form.photoUrls.length > 0 ? form.photoUrls : undefined,
      lure: form.lure.trim() || null,
      fishSizeCm: form.fishSizeCm.trim() ? Number(form.fishSizeCm.trim()) : null,
      action: form.action.trim() || null,
    };
    try {
      if (editTarget) {
        await updateCatchPost(editTarget.id, req);
      } else {
        await createCatchPost(req);
      }
      onSaved();
    } catch {
      setServerError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={styles.overlay}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>{editTarget ? '게시글 수정' : '조황 등록'}</h2>
            <button className={styles.modalClose} onClick={onClose} disabled={saving}>✕</button>
          </div>

          <div className={styles.modalBody}>
            {/* 제목 */}
            <div className={styles.field}>
              <label className={styles.label}>제목 <span className={styles.required}>*</span></label>
              <input
                className={`${styles.input} ${errors.title ? styles.inputError : ''}`}
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="게시글 제목을 입력하세요"
                maxLength={200}
              />
              {errors.title && <p className={styles.errorMsg}>{errors.title}</p>}
            </div>

            {/* 어종 — 칩이 세 그룹이라 폭을 전부 쓴다 */}
            <div className={styles.field}>
                <label className={styles.label}>
                  어종 <span className={styles.required}>*</span>{' '}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    최대 {MAX_SPECIES_COUNT}개 · 목록에 없으면 직접 입력
                  </span>
                </label>
                <div className={styles.speciesInputRow}>
                  <input
                    className={`${styles.input} ${errors.species ? styles.inputError : ''}`}
                    value={speciesDraft}
                    maxLength={MAX_SPECIES_NAME_LENGTH}
                    placeholder="어종을 선택하거나 직접 입력하세요"
                    onChange={e => { setSpeciesDraft(e.target.value); setSpeciesError(''); }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); commitSpeciesDraft(); }
                    }}
                  />
                  <button type="button" className={styles.speciesAddBtn} onClick={commitSpeciesDraft}>
                    추가
                  </button>
                </div>
                {form.species.length > 0 && (
                  <div className={styles.speciesTagList}>
                    {form.species.map(name => (
                      <span
                        key={name}
                        className={
                          speciesCodeOf(name) ? styles.speciesTag : styles.speciesTagCustom
                        }
                      >
                        {name}
                        <button
                          type="button"
                          className={styles.speciesTagRemove}
                          onClick={() => set('species', form.species.filter(s => s !== name))}
                          aria-label={`${name} 삭제`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.speciesChipGroups}>
                  {FISH_SPECIES_BY_GROUP.map(([group, items]) => (
                    <div key={group} className={styles.speciesChipGroup}>
                      <span className={styles.speciesGroupLabel}>{SPECIES_GROUP_LABELS[group]}</span>
                      <div className={styles.speciesChips}>
                        {items.map(([code, label]) => (
                          <button
                            key={code}
                            type="button"
                            className={
                              form.species.includes(label) ? styles.speciesChipOn : styles.speciesChip
                            }
                            onClick={() => toggleSpeciesChip(label)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {(speciesError || errors.species) && (
                  <p className={styles.errorMsg}>{speciesError || errors.species}</p>
                )}
            </div>

            {/* 잡은 날짜 + 시/도 → 낚시 포인트 — 짧은 입력 셋을 한 줄에 모아 빈 공간을 없앤다 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 12 }}>
              <div className={styles.field}>
                <label className={styles.label}>
                  잡은 날짜{' '}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    (기본값: 오늘)
                  </span>
                </label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.caughtAt}
                  max={todayStr()}
                  onChange={e => set('caughtAt', e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>시/도</label>
                <select
                  className={styles.select}
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
                <label className={styles.label}>낚시 포인트 <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(선택)</span></label>
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
                          {form.selectedProvince ? '포인트를 선택하세요' : '시/도를 먼저 선택하세요'}
                        </span>}
                    {form.selectedProvince && <span>{pointDropOpen ? '▲' : '▼'}</span>}
                  </button>
                  {pointDropOpen && form.selectedProvince && (
                    <div className={styles.pointList}>
                      <div
                        className={`${styles.pointListItem} ${!form.migratoryPointId ? styles.pointListItemSelected : ''}`}
                        onClick={() => {
                          set('migratoryPointId', '');
                          set('selectedPointName', '');
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
                            set('migratoryPointId', p.id);
                            set('selectedPointName', p.name);
                            setPointDropOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 지도로 선택 버튼 */}
                <button
                  type="button"
                  className={styles.mapSelectBtn}
                  onClick={() => setMapPickerOpen(true)}
                >
                  🗺️ 지도로 선택하기
                </button>
              </div>
            </div>

            {/* 루어 / 어종 크기 / 사용한 액션 (선택) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className={styles.field}>
                <label className={styles.label}>루어 <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(선택)</span></label>
                <input className={styles.input}
                  value={form.lure} onChange={e => set('lure', e.target.value)}
                  placeholder="예: 바이브 20g" maxLength={100} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>어종 크기 <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(선택)</span></label>
                <div style={{ position: 'relative' }}>
                  <input className={styles.input}
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
                <label className={styles.label}>사용한 액션 <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>(선택)</span></label>
                <input className={styles.input}
                  value={form.action} onChange={e => set('action', e.target.value)}
                  placeholder="예: 저킹, 슬로우롤" maxLength={100} />
              </div>
            </div>

            {/* 내용 */}
            <div className={styles.field}>
              <label className={styles.label}>내용 <span className={styles.required}>*</span></label>
              <textarea
                className={`${styles.textarea} ${errors.content ? styles.inputError : ''}`}
                value={form.content}
                onChange={e => set('content', e.target.value)}
                placeholder="조황 내용을 입력하세요"
                rows={5}
                maxLength={1000}
              />
              <span className={styles.charCount}>{form.content.length}/1000자</span>
              {errors.content && <p className={styles.errorMsg}>{errors.content}</p>}
            </div>

            {/* 사진 업로드 (최대 3장) */}
            <div className={styles.field}>
              <label className={styles.label}>사진 (최대 3장)</label>
              <PhotoUploader
                value={form.photoUrls}
                onChange={urls => set('photoUrls', urls)}
                boardType="CATCH_POST"
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
      </div>

      {mapPickerOpen && (
        <MigratoryPointMapPicker
          points={points}
          onSelect={handleMapSelect}
          onClose={() => setMapPickerOpen(false)}
        />
      )}
    </>
  );
}

/* ── 메인 페이지 ─────────────────────────────────────────────── */
export default function CatchPostPage() {
  const { isLoggedIn, userId, isAdmin, isModerator } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<CatchPostListItem[]>([]);
  const [detail, setDetail] = useState<CatchPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<CatchPostDetail | null>(null);

  const [points, setPoints] = useState<MigratoryFishPointMapMarker[]>([]);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const [browseMapOpen, setBrowseMapOpen] = useState(false);
  const [browseMapPoints, setBrowseMapPoints] = useState<MigratoryFishPointMapMarker[]>([]);
  const [pointFilter, setPointFilter] = useState<MigratoryFishPointMapMarker | null>(null);

  const [regionDropOpen, setRegionDropOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState<Province | null>(null);
  const regionDropRef = useRef<HTMLDivElement>(null);

  const [dateDropOpen, setDateDropOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ year: number; month: number } | null>(null);
  const dateDropRef = useRef<HTMLDivElement>(null);

  const [speciesDropOpen, setSpeciesDropOpen] = useState(false);
  /** 어종 필터. 'CUSTOM' 은 목록에 없는 어종을 직접 입력한 글만 보는 "기타" 항목이다. */
  const [speciesFilter, setSpeciesFilter] = useState<FishSpecies | 'CUSTOM' | null>(null);
  const speciesDropRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CatchPostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentReportTarget, setCommentReportTarget] = useState<{ id: string; content: string } | null>(null);

  const fetchList = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getCatchPostsPage({
        page,
        size: PAGE_SIZE,
        migratoryPointId: pointFilter?.id,
        province: regionFilter ?? undefined,
        year: dateFilter?.year,
        month: dateFilter?.month,
        species: speciesFilter && speciesFilter !== 'CUSTOM' ? [speciesFilter] : undefined,
        customSpeciesOnly: speciesFilter === 'CUSTOM',
      });
      setItems(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
      setCurrentPage(result.page);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [pointFilter, regionFilter, dateFilter, speciesFilter]);

  useEffect(() => { fetchList(0); }, [fetchList]);
  useEffect(() => { fetchMigratoryFishPointMapMarkers().then(setPoints).catch(() => {}); }, []);

  /** "지도로 보기"는 전체 포인트가 아니라 조황 게시물이 실제로 존재하는 포인트만 표시한다 */
  useEffect(() => {
    if (!browseMapOpen) return;
    let cancelled = false;
    getCatchPostMapPoints().then((pts) => {
      if (cancelled) return;
      setBrowseMapPoints(pts.map((p) => ({
        id: p.pointId, name: p.name, province: p.province, region: p.region,
        latitude: p.latitude, longitude: p.longitude, targetSpecies: [],
      })));
    }).catch(() => setBrowseMapPoints([]));
    return () => { cancelled = true; };
  }, [browseMapOpen]);

  const openBrowseMap = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setBrowseMapOpen(true);
  };

  const toggleRegionDrop = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setRegionDropOpen(v => !v);
  };

  const toggleDateDrop = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setDateDropOpen(v => !v);
  };

  const toggleSpeciesDrop = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setSpeciesDropOpen(v => !v);
  };

  const handleBrowseSelect = (point: MigratoryFishPointMapMarker) => {
    setRegionFilter(null);
    setDateFilter(null);
    setSpeciesFilter(null);
    setPointFilter(point);
    setBrowseMapOpen(false);
  };

  const handleRegionSelect = (province: Province) => {
    setPointFilter(null);
    setDateFilter(null);
    setSpeciesFilter(null);
    setRegionFilter(province);
    setRegionDropOpen(false);
  };

  const handleDateSelect = (year: number, month: number) => {
    setPointFilter(null);
    setRegionFilter(null);
    setSpeciesFilter(null);
    setDateFilter({ year, month });
    setDateDropOpen(false);
  };

  const handleSpeciesSelect = (species: FishSpecies | 'CUSTOM') => {
    setPointFilter(null);
    setRegionFilter(null);
    setDateFilter(null);
    setSpeciesFilter(species);
    setSpeciesDropOpen(false);
  };

  const clearFilter = () => {
    setPointFilter(null);
    setRegionFilter(null);
    setDateFilter(null);
    setSpeciesFilter(null);
  };

  useEffect(() => {
    if (!regionDropOpen) return;
    const onClickOut = (e: MouseEvent) => {
      if (regionDropRef.current && !regionDropRef.current.contains(e.target as Node)) setRegionDropOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [regionDropOpen]);

  useEffect(() => {
    if (!speciesDropOpen) return;
    const onClickOut = (e: MouseEvent) => {
      if (speciesDropRef.current && !speciesDropRef.current.contains(e.target as Node)) setSpeciesDropOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [speciesDropOpen]);

  useEffect(() => {
    if (!dateDropOpen) return;
    const onClickOut = (e: MouseEvent) => {
      if (dateDropRef.current && !dateDropRef.current.contains(e.target as Node)) setDateDropOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, [dateDropOpen]);

  useEffect(() => {
    const state = location.state as { openPostId?: string; openWrite?: boolean } | null;
    if (state?.openPostId) {
      openDetail(state.openPostId);
      window.history.replaceState({}, document.title);
    } else if (state?.openWrite) {
      // 커뮤니티 홈의 "글쓰기"에서 넘어온 경우 — 작성 폼(어종 입력이 있는 쪽)을 바로 띄운다.
      setEditingPost(null);
      setModalOpen(true);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (page: number) => {
    fetchList(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openDetail = async (id: string) => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }
    setDetailLoading(true);
    setDetail(null);
    setComments([]);
    setCommentInput('');
    setReplyTo(null);
    setView('detail');
    try {
      const [d, cmts] = await Promise.all([getCatchPostDetail(id), getCatchPostComments(id)]);
      setDetail(d);
      setComments(cmts);
    } catch {
      setError('게시글을 불러오지 못했습니다.');
      setView('list');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!detail || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await addCatchPostComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getCatchPostComments(detail.id));
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
      await deleteCatchPostComment(detail.id, commentId);
      setComments(await getCatchPostComments(detail.id));
    } catch {
      setError('댓글 삭제에 실패했습니다.');
    }
  };

  const getDescendants = (parentId: string): CatchPostComment[] => {
    const children = comments.filter(c => c.parentId === parentId);
    return children.flatMap(child => [child, ...getDescendants(child.id)]);
  };

  const openCreate = () => {
    if (!isLoggedIn) { setError('로그인 후 이용 가능합니다.'); return; }
    setEditingPost(null);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingPost(detail);
    setModalOpen(true);
  };

  const handleSaved = async () => {
    setModalOpen(false);
    if (editingPost && detail) {
      const updated = await getCatchPostDetail(detail.id).catch(() => null);
      if (updated) setDetail(updated);
    } else {
      setView('list');
    }
    fetchList(currentPage);
  };

  /** 자유게시판과 동일한 동작 — FreePostPage.tsx 의 같은 함수 참고. */
  const handleBlockUser = async (targetId: string, nickname: string, isPostAuthor: boolean) => {
    if (!detail) return;
    const ok = window.confirm(
      `${nickname} 님을 차단하시겠습니까?\n\n` +
      '이 사용자의 게시글과 댓글이 목록에 보이지 않습니다. ' +
      '마이페이지 > 차단한 사용자에서 해제할 수 있습니다.',
    );
    if (!ok) return;
    try {
      await blockUser(targetId);
      if (isPostAuthor) {
        setView('list');
        fetchList(currentPage);
      } else {
        setComments(await getCatchPostComments(detail.id));
      }
    } catch { setError('차단에 실패했습니다.'); }
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteCatchPost(detail.id);
      setView('list');
      fetchList(currentPage);
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const isOwner = detail?.authorId === userId || isAdmin || isModerator;

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>
        {/* ── 헤더 ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🐟 조황 게시판</h1>
            <p className={styles.pageDesc}>
              오늘의 조황을 어종·포인트와 함께 공유하세요.
              {view === 'list' && !loading && (
                <span className={styles.totalCount}> 총 {totalElements}개</span>
              )}
            </p>
          </div>
          {view === 'list' && (
            <div className={styles.headerActions}>
              <button className={styles.iconActionBtn} onClick={openBrowseMap}>🗺️ 지도로 보기</button>
              <div className={styles.pointDropdown} ref={regionDropRef}>
                <button className={styles.iconActionBtn} onClick={toggleRegionDrop}>📍 지역으로 보기</button>
                {regionDropOpen && (
                  <div className={styles.pointList}>
                    {PROVINCE_OPTIONS.map(([code, label]) => (
                      <div
                        key={code}
                        className={`${styles.pointListItem} ${regionFilter === code ? styles.pointListItemSelected : ''}`}
                        onClick={() => handleRegionSelect(code)}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.pointDropdown} ref={dateDropRef}>
                <button className={styles.iconActionBtn} onClick={toggleDateDrop}>📅 날짜로 보기</button>
                {dateDropOpen && (
                  <MonthYearPicker value={dateFilter} onSelect={handleDateSelect} />
                )}
              </div>
              <div className={styles.pointDropdown} ref={speciesDropRef}>
                <button className={styles.iconActionBtn} onClick={toggleSpeciesDrop}>🐟 어종으로 찾기</button>
                {speciesDropOpen && (
                  <div className={styles.pointList}>
                    {FISH_SPECIES_BY_GROUP.map(([group, items]) => (
                      <div key={group}>
                        <div className={styles.pointListGroupLabel}>{SPECIES_GROUP_LABELS[group]}</div>
                        {items.map(([code, label]) => (
                          <div
                            key={code}
                            className={styles.pointListItem}
                            onClick={() => handleSpeciesSelect(code)}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    ))}
                    <div
                      className={styles.pointListItem}
                      onClick={() => handleSpeciesSelect('CUSTOM')}
                    >
                      기타 (목록에 없는 어종)
                    </div>
                  </div>
                )}
              </div>
              {isLoggedIn && (
                <button className={styles.createBtn} onClick={openCreate}>글쓰기</button>
              )}
            </div>
          )}
          {view === 'detail' && (
            <button className={styles.backBtn} onClick={() => setView('list')}>← 목록</button>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {/* ── 목록 ── */}
        {view === 'list' && (
          <>
            {(pointFilter || regionFilter || dateFilter || speciesFilter) && (
              <div className={styles.pointFilterBar}>
                <span>
                  {pointFilter
                    ? <>📍 <strong>{pointFilter.name}</strong>에서 잡힌 게시물</>
                    : regionFilter
                    ? <>🗺️ <strong>{PROVINCE_LABELS[regionFilter as Province]}</strong> 지역 게시물</>
                    : dateFilter
                    ? <>📅 <strong>{dateFilter.year}년 {dateFilter.month}월</strong> 게시물</>
                    : <>🐟 <strong>{speciesFilterLabel(speciesFilter)}</strong> 게시물</>}
                </span>
                <button onClick={clearFilter}>필터 해제 ✕</button>
              </div>
            )}

            {loading ? (
              <div className={styles.loading}><div className={styles.spinner} /></div>
            ) : items.length === 0 ? (
              <p className={styles.empty}>
                {pointFilter
                  ? `"${pointFilter.name}"에서 잡힌 게시글이 아직 없습니다.`
                  : regionFilter
                  ? `"${PROVINCE_LABELS[regionFilter]}"에 잡힌 게시글이 아직 없습니다.`
                  : dateFilter
                  ? `${dateFilter.year}년 ${dateFilter.month}월에 잡힌 게시글이 아직 없습니다.`
                  : speciesFilter
                  ? `"${speciesFilterLabel(speciesFilter)}" 게시글이 아직 없습니다.`
                  : '아직 등록된 게시글이 없습니다.'}
              </p>
            ) : (
              <div className={styles.list}>
                {items.map(item => (
                  <div key={item.id} className={styles.listItem} onClick={() => openDetail(item.id)}>
                    <div className={styles.listMain}>
                      <div className={styles.listTop}>
                        <span className={styles.speciesBadge}>{item.species.map(sp => sp.name).join('·')}</span>
                        <span className={styles.listTitle}>{item.title}</span>
                      </div>
                      <div className={styles.listBottom}>
                        {item.pointName
                          ? <span className={styles.listPoint}>📍 {item.pointName}</span>
                          : <span className={styles.listNoPoint}>포인트 미지정</span>}
                        <span className={styles.authorNickname}>{item.authorNickname}</span>
                        {item.photoUrls?.length > 0 && <span className={styles.photoIcon}>📷 {item.photoUrls.length}</span>}
                        <span className={styles.commentCount}>💬 {item.commentCount ?? 0}</span>
                        <span className={styles.commentCount}>👍 {item.likeCount ?? 0}</span>
                      </div>
                    </div>
                    <div className={styles.listDates}>
                      <span className={styles.listDate}>작성일 {formatDateTime(item.createdAt)}</span>
                      <span className={styles.listWriteDate}>잡은 날짜 {item.caughtAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          </>
        )}

        {/* ── 상세 ── */}
        {view === 'detail' && (
          <>
            {detailLoading ? (
              <div className={styles.loading}><div className={styles.spinner} /></div>
            ) : detail ? (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={styles.detailTitleRow}>
                    <h2 className={styles.detailTitle}>{detail.title}</h2>
                    {isLoggedIn && (
                      <div className={styles.detailTopActions}>
                        {isOwner && (
                          <button className={styles.iconActionBtn} onClick={openEdit} title="수정">
                            <span>✏️</span>수정
                          </button>
                        )}
                        {isOwner && (
                          <button className={`${styles.iconActionBtn} ${styles.iconActionBtnDanger}`} onClick={handleDelete} title="삭제">
                            <span>🗑️</span>삭제
                          </button>
                        )}
                        <button className={styles.iconActionBtn} onClick={() => setReportOpen(true)} title="신고하기">
                          <span>🚨</span>신고
                        </button>
                        {detail.authorId !== userId && (
                          <button
                            className={styles.iconActionBtn}
                            onClick={() => handleBlockUser(detail.authorId, detail.authorNickname, true)}
                            title="이 사용자 차단"
                          >
                            <span>🚫</span>차단
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className={styles.detailMeta}>
                    <span className={styles.authorChip}>
                      <span className={styles.authorAvatar}>{detail.authorNickname.charAt(0)}</span>
                      {detail.authorNickname}
                    </span>
                    <span className={styles.metaDot}>·</span>
                    <span>잡은 날짜: {detail.caughtAt}</span>
                    {detail.pointName && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaPoint}>📍 {detail.pointName}</span>
                      </>
                    )}
                    <span className={styles.metaDot}>·</span>
                    <span>작성 날짜: {formatDate(detail.createdAt)}</span>
                  </div>

                  <span className={styles.speciesBadge}>잡은 어종 {detail.species.map(sp => sp.name).join('·')}</span>

                  {(detail.lure || detail.fishSizeCm != null || detail.action) && (
                    <div className={styles.statGrid}>
                      {detail.fishSizeCm != null && (
                        <div className={styles.statCard}>
                          <span className={styles.statIcon}>📏</span>
                          <span className={styles.statLabel}>크기</span>
                          <span className={styles.statValue}>{detail.fishSizeCm}cm</span>
                        </div>
                      )}
                      {detail.lure && (
                        <div className={styles.statCard}>
                          <span className={styles.statIcon}>🎣</span>
                          <span className={styles.statLabel}>루어</span>
                          <span className={styles.statValue}>{detail.lure}</span>
                        </div>
                      )}
                      {detail.action && (
                        <div className={styles.statCard}>
                          <span className={styles.statIcon}>💫</span>
                          <span className={styles.statLabel}>액션</span>
                          <span className={styles.statValue}>{detail.action}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <h3 className={styles.contentLabel}>📝 게시물 내용</h3>
                <p className={styles.detailContent}>{detail.content}</p>

                {detail.photoUrls?.length > 0 && (
                  <div className={`${styles.photoGrid} ${detail.photoUrls.length === 1 ? styles.photoGridSingle : ''}`}>
                    {detail.photoUrls.map((url, i) => (
                      <img key={i} src={url} alt={`조황 사진 ${i + 1}`} className={styles.detailPhoto}
                        onClick={() => setLbIdx(i)} />
                    ))}
                  </div>
                )}

                <ReactionBar
                  key={detail.id}
                  targetType="CATCH_POST"
                  targetId={detail.id}
                  initial={{
                    likeCount: detail.likeCount ?? 0,
                    dislikeCount: detail.dislikeCount ?? 0,
                    myReaction: detail.myReaction ?? null,
                  }}
                  isLoggedIn={isLoggedIn}
                  onRequireLogin={() => navigate('/login')}
                />

                {/* ── 댓글 ── */}
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
                              {isLoggedIn && c.authorId !== userId && (
                                <button className={styles.reportCommentBtn} onClick={() => handleBlockUser(c.authorId, c.authorNickname, false)}>차단</button>
                              )}
                              {(isOwner || isAdmin || isModerator || c.authorId === userId) && (
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
                                  {isLoggedIn && r.authorId !== userId && (
                                    <button className={styles.reportCommentBtn} onClick={() => handleBlockUser(r.authorId, r.authorNickname, false)}>차단</button>
                                  )}
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
            ) : null}
          </>
        )}
      </div>

      <PostFormModal
        open={modalOpen}
        editTarget={editingPost}
        points={points}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
      {browseMapOpen && (
        <MigratoryPointMapPicker
          points={browseMapPoints}
          onSelect={handleBrowseSelect}
          onClose={() => setBrowseMapOpen(false)}
          emptyMessage="아직 조황 게시물이 등록된 포인트가 없습니다."
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
      {reportOpen && detail && (
        <ReportModal
          postId={detail.id}
          postType="CATCH_POST"
          postTitle={detail.title}
          onClose={() => setReportOpen(false)}
        />
      )}
      {commentReportTarget && detail && (
        <ReportModal
          postId={commentReportTarget.id}
          postType="CATCH_COMMENT"
          postTitle={commentReportTarget.content.slice(0, 100)}
          parentPostId={detail.id}
          onClose={() => setCommentReportTarget(null)}
        />
      )}
    </div>
  );
}
