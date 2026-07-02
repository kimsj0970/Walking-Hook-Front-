import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import PhotoUploader from '../components/common/PhotoUploader';
import ImageLightbox from '../components/common/ImageLightbox';
import {
  getMigratoryPostsPage, getMigratoryPostDetail, createMigratoryPost,
  updateMigratoryPost, deleteMigratoryPost,
  getMigratoryPostComments, addMigratoryPostComment, deleteMigratoryPostComment,
  type MigratoryPostListItem, type MigratoryPostDetail, type MigratoryPostCreateRequest,
  type MigratoryPostComment,
} from '../api/migratoryPostApi';
import {
  fetchMigratoryFishPointMapMarkers,
  MIGRATORY_SPECIES_OPTIONS, MIGRATORY_SPECIES_LABELS,
  type MigratorySpecies, type MigratoryFishPointMapMarker,
} from '../api/migratoryFishPointApi';
import { PROVINCE_LABELS, PROVINCE_OPTIONS, type Province } from '../api/fishingPointApi';
import { fetchFishingZones, type FishingZone } from '../api/fishingZoneApi';
import ReportModal from '../components/common/ReportModal';
import styles from './MigratoryPostPage.module.css';

type View = 'list' | 'detail';
const PAGE_SIZE = 10;

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderFishingZones(kakao: any, map: any, zones: FishingZone[]) {
  zones.forEach((zone) => {
    try {
      const parsed = JSON.parse(zone.geoJson);
      const ring: [number, number][] = parsed.coordinates[0];
      const path = ring.slice(0, -1).map(([lng, lat]: [number, number]) =>
        new kakao.maps.LatLng(lat, lng)
      );
      const color = zone.zoneType === 'PROHIBITED' ? '#DC2626' : '#EA580C';
      const poly = new kakao.maps.Polygon({
        map,
        path,
        strokeWeight: 2,
        strokeColor: color,
        strokeOpacity: 0.9,
        fillColor: color,
        fillOpacity: 0.2,
      });
      const infoWindow = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:12px 16px;width:220px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;word-break:keep-all;overflow-wrap:break-word;white-space:normal;">
            <strong style="font-size:14px;color:${color};display:block;">${escapeHtml(zone.name)}</strong>
            <div style="font-size:11px;color:#94A3B8;margin:3px 0 6px;">${zone.zoneType === 'PROHIBITED' ? '🔴 낚시금지구역' : '🟠 낚시제한구역'}</div>
            ${zone.description ? `<p style="font-size:12px;color:#334155;margin:0;line-height:1.5;">${escapeHtml(zone.description)}</p>` : ''}
          </div>`,
        removable: true,
      });
      kakao.maps.event.addListener(poly, 'click', (e: { latLng: unknown }) => {
        infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
      });
    } catch {
      // GeoJSON 파싱 실패 시 무시
    }
  });
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

/* ── 지도 포인트 선택 모달 ───────────────────────────────────────── */
interface MapPickerProps {
  points: MigratoryFishPointMapMarker[];
  onSelect: (point: MigratoryFishPointMapMarker) => void;
  onClose: () => void;
}

function MigratoryPointMapPicker({ points, onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) { setMapStatus('error'); return; }

    let cancelled = false;

    Promise.all([
      loadKakaoSDK(appKey),
      fetchFishingZones().catch(() => [] as FishingZone[]),
    ]).then(([, zones]) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 13,
        });

        // 모달이 막 열리는 시점엔 flex 레이아웃(.mapPickerMap { flex: 1 })이
        // 아직 확정되지 않아 지도 타일이 실제 크기보다 작게 잡히는 문제가 있어 보정한다.
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        renderFishingZones(kakao, map, zones);

        const hoverInfoWindow = new kakao.maps.InfoWindow({ removable: false });

        const markers = points.map((fp) => {
          const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
          const marker = new kakao.maps.Marker({ position });

          kakao.maps.event.addListener(marker, 'mouseover', () => {
            hoverInfoWindow.setContent(
              `<div style="padding:5px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">📍 ${escapeHtml(fp.name)}</div>`
            );
            hoverInfoWindow.open(map, marker);
          });

          kakao.maps.event.addListener(marker, 'mouseout', () => {
            hoverInfoWindow.close();
          });

          const pickInfoWindow = new kakao.maps.InfoWindow({
            content: `
              <div style="padding:10px 14px;font-family:'Pretendard','Noto Sans KR',sans-serif;text-align:center;white-space:nowrap;">
                <strong style="font-size:13px;color:#0B3D91;display:block;margin-bottom:8px;">📍 ${escapeHtml(fp.name)}</strong>
                <button id="pick-${fp.id}" style="padding:6px 16px;background:#0B3D91;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">이 포인트 선택</button>
              </div>`,
            removable: true,
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            hoverInfoWindow.close();
            pickInfoWindow.open(map, marker);
            setTimeout(() => {
              const btn = document.getElementById(`pick-${fp.id}`);
              if (btn) btn.onclick = () => { pickInfoWindow.close(); onSelect(fp); };
            }, 0);
          });

          return marker;
        });

        new kakao.maps.MarkerClusterer({
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
  }, [points, onSelect]);

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
        <p className={styles.mapPickerHint}>
          마커를 탭하면 이름이 뜨고, "이 포인트 선택"을 누르면 선택됩니다 · <span style={{ color: '#DC2626' }}>■</span> 낚시금지구역 <span style={{ color: '#EA580C' }}>■</span> 낚시제한구역
        </p>
        {mapStatus === 'loading' && (
          <div className={styles.mapPickerLoading}>
            <div className={styles.spinner} />
          </div>
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

/* ── 게시글 작성/수정 모달 ────────────────────────────────────────── */
interface FormState {
  title: string;
  content: string;
  species: MigratorySpecies[];
  caughtAt: string;
  selectedProvince: Province | '';
  migratoryPointId: string;
  selectedPointName: string;
  photoUrls: string[];
  lure: string;
  fishSize: string;
  action: string;
}

interface PostFormModalProps {
  open: boolean;
  editTarget: MigratoryPostDetail | null;
  points: MigratoryFishPointMapMarker[];
  onClose: () => void;
  onSaved: () => void;
}

function PostFormModal({ open, editTarget, points, onClose, onSaved }: PostFormModalProps) {
  const [form, setForm] = useState<FormState>({
    title: '', content: '', species: [], caughtAt: todayStr(),
    selectedProvince: '', migratoryPointId: '', selectedPointName: '', photoUrls: [],
    lure: '', fishSize: '', action: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pointDropOpen, setPointDropOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      const pt = points.find(p => p.id === editTarget.migratoryPointId);
      setForm({
        title: editTarget.title,
        content: editTarget.content,
        species: editTarget.species,
        caughtAt: editTarget.caughtAt,
        selectedProvince: pt?.province ?? '',
        migratoryPointId: editTarget.migratoryPointId,
        selectedPointName: pt?.name ?? editTarget.pointName ?? '',
        photoUrls: editTarget.photoUrls ?? [],
        lure: editTarget.lure ?? '',
        fishSize: editTarget.fishSize ?? '',
        action: editTarget.action ?? '',
      });
    } else {
      setForm({ title: '', content: '', species: [], caughtAt: todayStr(), selectedProvince: '', migratoryPointId: '', selectedPointName: '', photoUrls: [], lure: '', fishSize: '', action: '' });
    }
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
    if (!form.migratoryPointId) e.migratoryPointId = '포인트를 선택하세요.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const req: MigratoryPostCreateRequest = {
      title: form.title.trim(),
      content: form.content.trim(),
      species: form.species,
      caughtAt: form.caughtAt || undefined,
      migratoryPointId: form.migratoryPointId,
      photoUrls: form.photoUrls.length > 0 ? form.photoUrls : undefined,
      lure: form.lure.trim() || null,
      fishSize: form.fishSize.trim() || null,
      action: form.action.trim() || null,
    };
    try {
      if (editTarget) {
        await updateMigratoryPost(editTarget.id, req);
      } else {
        await createMigratoryPost(req);
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
            <h2 className={styles.modalTitle}>{editTarget ? '게시글 수정' : '회유성 조황 등록'}</h2>
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

            {/* 어종 (다중 선택) + 날짜 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className={styles.field}>
                <label className={styles.label}>어종 <span className={styles.required}>*</span> <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>복수 선택 가능</span></label>
                <div className={`${styles.speciesCheckboxGroup} ${errors.species ? styles.inputError : ''}`}>
                  {MIGRATORY_SPECIES_OPTIONS.map(([code, label]) => {
                    const checked = (form.species as MigratorySpecies[]).includes(code as MigratorySpecies);
                    return (
                      <label key={code} className={styles.speciesCheckboxItem}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={e => {
                            const current = form.species as MigratorySpecies[];
                            set('species', e.target.checked
                              ? [...current, code as MigratorySpecies]
                              : current.filter(s => s !== code)
                            );
                          }}
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
                {errors.species && <p className={styles.errorMsg}>{errors.species}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>잡은 날짜</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.caughtAt}
                  max={todayStr()}
                  onChange={e => set('caughtAt', e.target.value)}
                />
                <p className={styles.fieldHint}>기본값: 오늘</p>
              </div>
            </div>

            {/* 시/도 선택 → 낚시 포인트 선택 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <div className={styles.field}>
                <label className={styles.label}>시/도 <span className={styles.required}>*</span></label>
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
                    setErrors(prev => ({ ...prev, migratoryPointId: undefined }));
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
                <label className={styles.label}>낚시 포인트 <span className={styles.required}>*</span></label>
                <div className={styles.pointDropdown} ref={dropRef}>
                  <button
                    type="button"
                    className={`${styles.pointSelectBtn} ${errors.migratoryPointId ? styles.pointSelectBtnError : ''}`}
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
                {errors.migratoryPointId && <p className={styles.errorMsg}>{errors.migratoryPointId}</p>}

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
                <input className={styles.input}
                  value={form.fishSize} onChange={e => set('fishSize', e.target.value)}
                  placeholder="예: 45cm, 1.2kg" maxLength={50} />
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
                boardType="MIGRATORY_POST"
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
export default function MigratoryPostPage() {
  const { isLoggedIn, userId, isAdmin, isModerator } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [view, setView] = useState<View>('list');
  const [items, setItems] = useState<MigratoryPostListItem[]>([]);
  const [detail, setDetail] = useState<MigratoryPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<MigratoryPostDetail | null>(null);

  const [points, setPoints] = useState<MigratoryFishPointMapMarker[]>([]);
  const [lbIdx, setLbIdx] = useState<number | null>(null);

  const [browseMapOpen, setBrowseMapOpen] = useState(false);
  const [pointFilter, setPointFilter] = useState<MigratoryFishPointMapMarker | null>(null);

  const [regionDropOpen, setRegionDropOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState<Province | null>(null);
  const regionDropRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<MigratoryPostComment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [commentReportTarget, setCommentReportTarget] = useState<{ id: string; content: string } | null>(null);

  const fetchList = useCallback(async (page: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMigratoryPostsPage(page, PAGE_SIZE, pointFilter?.id, regionFilter ?? undefined);
      setItems(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
      setCurrentPage(result.page);
    } catch {
      setError('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [pointFilter, regionFilter]);

  useEffect(() => { fetchList(0); }, [fetchList]);
  useEffect(() => { fetchMigratoryFishPointMapMarkers().then(setPoints).catch(() => {}); }, []);

  const openBrowseMap = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setBrowseMapOpen(true);
  };

  const toggleRegionDrop = () => {
    if (!isLoggedIn) { navigate('/login'); return; }
    setRegionDropOpen(v => !v);
  };

  const handleBrowseSelect = (point: MigratoryFishPointMapMarker) => {
    setRegionFilter(null);
    setPointFilter(point);
    setBrowseMapOpen(false);
  };

  const handleRegionSelect = (province: Province) => {
    setPointFilter(null);
    setRegionFilter(province);
    setRegionDropOpen(false);
  };

  const clearFilter = () => {
    setPointFilter(null);
    setRegionFilter(null);
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
      const [d, cmts] = await Promise.all([getMigratoryPostDetail(id), getMigratoryPostComments(id)]);
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
      await addMigratoryPostComment(detail.id, commentInput.trim(), replyTo?.id);
      setComments(await getMigratoryPostComments(detail.id));
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
      await deleteMigratoryPostComment(detail.id, commentId);
      setComments(await getMigratoryPostComments(detail.id));
    } catch {
      setError('댓글 삭제에 실패했습니다.');
    }
  };

  const getDescendants = (parentId: string): MigratoryPostComment[] => {
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
      const updated = await getMigratoryPostDetail(detail.id).catch(() => null);
      if (updated) setDetail(updated);
    } else {
      setView('list');
    }
    fetchList(currentPage);
  };

  const handleDelete = async () => {
    if (!detail || !window.confirm('게시글을 삭제하시겠습니까?')) return;
    try {
      await deleteMigratoryPost(detail.id);
      setView('list');
      fetchList(currentPage);
    } catch {
      setError('삭제에 실패했습니다.');
    }
  };

  const isOwner = detail?.authorId === userId || isAdmin || isModerator;

  const pageNums = (() => {
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    const arr: number[] = [];
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  })();

  return (
    <div className={styles.container}>
      <Header />
      <div className={styles.inner}>
        {/* ── 헤더 ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🐟 회유성 조황 게시판</h1>
            <p className={styles.pageDesc}>
              삼치·방어·부시리·고등어 등 회유성 어종 조황을 공유하세요.
              {view === 'list' && !loading && (
                <span className={styles.totalCount}> 총 {totalElements}개</span>
              )}
            </p>
          </div>
          {view === 'list' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
            {(pointFilter || regionFilter) && (
              <div className={styles.pointFilterBar}>
                <span>
                  {pointFilter
                    ? <>📍 <strong>{pointFilter.name}</strong>에서 잡힌 게시물</>
                    : <>🗺️ <strong>{PROVINCE_LABELS[regionFilter as Province]}</strong> 지역 게시물</>}
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
                  : '아직 등록된 게시글이 없습니다.'}
              </p>
            ) : (
              <div className={styles.list}>
                {items.map(item => (
                  <div key={item.id} className={styles.listItem} onClick={() => openDetail(item.id)}>
                    <div className={styles.listTop}>
                      <span className={styles.speciesBadge}>{item.speciesDisplayNames?.join('·') ?? ''}</span>
                      <span className={styles.listTitle}>{item.title}</span>
                      <span className={styles.listDate}>{item.caughtAt}</span>
                    </div>
                    <div className={styles.listBottom}>
                      {item.pointName
                        ? <span className={styles.listPoint}>📍 {item.pointName}</span>
                        : <span className={styles.listNoPoint}>포인트 미지정</span>}
                      <div className={styles.listMeta}>
                        <span className={styles.authorNickname}>{item.authorNickname}</span>
                        {item.photoUrls?.length > 0 && <span className={styles.photoIcon}>📷 {item.photoUrls.length}</span>}
                        <span className={styles.commentCount}>💬 {item.commentCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={currentPage === 0} onClick={() => goToPage(0)}>«</button>
                <button className={styles.pageBtn} disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>‹</button>
                {pageNums.map(n => (
                  <button
                    key={n}
                    className={`${styles.pageBtn} ${n === currentPage ? styles.pageBtnActive : ''}`}
                    onClick={() => goToPage(n)}
                  >
                    {n + 1}
                  </button>
                ))}
                <button className={styles.pageBtn} disabled={currentPage >= totalPages - 1} onClick={() => goToPage(currentPage + 1)}>›</button>
                <button className={styles.pageBtn} disabled={currentPage >= totalPages - 1} onClick={() => goToPage(totalPages - 1)}>»</button>
              </div>
            )}
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
                      </div>
                    )}
                  </div>

                  <div className={styles.detailMeta}>
                    <span className={styles.authorChip}>
                      <span className={styles.authorAvatar}>{detail.authorNickname.charAt(0)}</span>
                      {detail.authorNickname}
                    </span>
                    <span className={styles.metaDot}>·</span>
                    <span>잡은 날짜 {detail.caughtAt}</span>
                    {detail.pointName && (
                      <>
                        <span className={styles.metaDot}>·</span>
                        <span className={styles.metaPoint}>📍 {detail.pointName}</span>
                      </>
                    )}
                    <span className={styles.metaDot}>·</span>
                    <span>작성 {formatDate(detail.createdAt)}</span>
                  </div>

                  <span className={styles.speciesBadge}>잡은 어종 {detail.speciesDisplayNames?.join('·') ?? ''}</span>

                  {(detail.lure || detail.fishSize || detail.action) && (
                    <div className={styles.statGrid}>
                      {detail.fishSize && (
                        <div className={styles.statCard}>
                          <span className={styles.statIcon}>📏</span>
                          <span className={styles.statLabel}>크기</span>
                          <span className={styles.statValue}>{detail.fishSize}</span>
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
          points={points}
          onSelect={handleBrowseSelect}
          onClose={() => setBrowseMapOpen(false)}
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
          postType="MIGRATORY_POST"
          postTitle={detail.title}
          onClose={() => setReportOpen(false)}
        />
      )}
      {commentReportTarget && detail && (
        <ReportModal
          postId={commentReportTarget.id}
          postType="MIGRATORY_COMMENT"
          postTitle={commentReportTarget.content.slice(0, 100)}
          parentPostId={detail.id}
          onClose={() => setCommentReportTarget(null)}
        />
      )}
    </div>
  );
}
