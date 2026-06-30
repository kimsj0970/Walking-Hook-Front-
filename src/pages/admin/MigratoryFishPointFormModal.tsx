import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type MigratoryFishPointDetail,
  type MigratoryFishPointCreateRequest,
  type MigratorySpecies,
  MIGRATORY_SPECIES_OPTIONS,
  createMigratoryFishPoint,
  updateMigratoryFishPoint,
} from '../../api/migratoryFishPointApi';
import {
  type Province,
  type TerrainType,
  PROVINCE_OPTIONS,
  TERRAIN_TYPE_OPTIONS,
} from '../../api/fishingPointApi';
import styles from './FishingPointFormModal.module.css';

interface FormState {
  name: string;
  province: Province | '';
  region: string;
  latitude: string;
  longitude: string;
  terrainType: TerrainType;
  targetSpecies: MigratorySpecies[];
  description: string;
  enabled: boolean;
  publicVisible: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  province: '',
  region: '',
  latitude: '',
  longitude: '',
  terrainType: 'UNKNOWN',
  targetSpecies: [],
  description: '',
  enabled: true,
  publicVisible: false,
};

function detailToForm(d: MigratoryFishPointDetail): FormState {
  return {
    name: d.name,
    province: d.province,
    region: d.region,
    latitude: String(d.latitude),
    longitude: String(d.longitude),
    terrainType: d.terrainType,
    targetSpecies: d.targetSpecies,
    description: d.description ?? '',
    enabled: d.enabled,
    publicVisible: d.publicVisible,
  };
}

interface Props {
  open: boolean;
  editTarget: MigratoryFishPointDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Kakao = any;

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

export default function MigratoryFishPointFormModal({ open, editTarget, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');

  const [showMap, setShowMap] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<Kakao>(null);
  const markerRef = useRef<Kakao>(null);

  useEffect(() => {
    if (open) {
      setForm(editTarget ? detailToForm(editTarget) : DEFAULT_FORM);
      setErrors({});
      setServerError('');
      setShowMap(false);
    }
  }, [open, editTarget]);

  // 지도 초기화
  const initMap = useCallback(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey || !mapContainerRef.current) return;

    loadKakaoSDK(appKey).then(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (!mapContainerRef.current) return;

        const lat = parseFloat(form.latitude);
        const lng = parseFloat(form.longitude);
        const hasCoord = !isNaN(lat) && !isNaN(lng);
        const center = hasCoord
          ? new kakao.maps.LatLng(lat, lng)
          : new kakao.maps.LatLng(36.5, 127.8);

        const map = new kakao.maps.Map(mapContainerRef.current, {
          center,
          level: hasCoord ? 5 : 13,
        });
        kakaoMapRef.current = map;

        // 기존 좌표가 있으면 마커 표시
        if (hasCoord) {
          markerRef.current = new kakao.maps.Marker({ position: center, map });
        }

        // 클릭 시 좌표 자동 입력
        kakao.maps.event.addListener(map, 'click', (e: Kakao) => {
          const clickLat = e.latLng.getLat();
          const clickLng = e.latLng.getLng();

          setForm(prev => ({
            ...prev,
            latitude: clickLat.toFixed(7),
            longitude: clickLng.toFixed(7),
          }));
          setErrors(prev => ({ ...prev, latitude: undefined, longitude: undefined }));

          // 마커 이동
          const pos = new kakao.maps.LatLng(clickLat, clickLng);
          if (markerRef.current) {
            markerRef.current.setPosition(pos);
          } else {
            markerRef.current = new kakao.maps.Marker({ position: pos, map });
          }
        });
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  useEffect(() => {
    if (showMap) {
      // DOM이 그려진 후 초기화
      const timer = setTimeout(initMap, 50);
      return () => clearTimeout(timer);
    } else {
      kakaoMapRef.current = null;
      markerRef.current = null;
    }
  }, [showMap, initMap]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleSpecies = (species: MigratorySpecies) => {
    set(
      'targetSpecies',
      form.targetSpecies.includes(species)
        ? form.targetSpecies.filter((s) => s !== species)
        : [...form.targetSpecies, species],
    );
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = '이름을 입력하세요.';
    if (!form.province) newErrors.province = '시/도를 선택하세요.';
    if (!form.region.trim()) newErrors.region = '세부 지역명을 입력하세요.';
    const lat = parseFloat(form.latitude);
    if (!form.latitude.trim() || isNaN(lat) || lat < -90 || lat > 90)
      newErrors.latitude = '위도는 -90~90 사이 숫자여야 합니다.';
    const lng = parseFloat(form.longitude);
    if (!form.longitude.trim() || isNaN(lng) || lng < -180 || lng > 180)
      newErrors.longitude = '경도는 -180~180 사이 숫자여야 합니다.';
    if (form.targetSpecies.length === 0)
      newErrors.targetSpecies = '어종을 최소 1개 이상 선택하세요.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const payload: MigratoryFishPointCreateRequest = {
      name: form.name.trim(),
      province: form.province as Province,
      region: form.region.trim(),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      terrainType: form.terrainType,
      targetSpecies: form.targetSpecies,
      description: form.description.trim() || undefined,
      enabled: form.enabled,
      publicVisible: form.publicVisible,
    };
    try {
      if (editTarget) {
        await updateMigratoryFishPoint(editTarget.id, payload);
      } else {
        await createMigratoryFishPoint(payload);
      }
      onSaved();
    } catch {
      setServerError('저장 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {editTarget ? '회유성 포인트 수정' : '새 회유성 포인트 추가'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className={styles.body}>
          {/* 기본 정보 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>기본 정보</h3>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>이름 <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="예: 기장 대변항 방파제"
                  maxLength={100}
                />
                {errors.name && <p className={styles.errorMsg}>{errors.name}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>시/도 <span className={styles.required}>*</span></label>
                <select
                  className={`${styles.select} ${errors.province ? styles.inputError : ''}`}
                  value={form.province}
                  onChange={(e) => set('province', e.target.value as Province)}
                >
                  <option value="">시/도 선택</option>
                  {PROVINCE_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {errors.province && <p className={styles.errorMsg}>{errors.province}</p>}
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>세부 지역명 <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${errors.region ? styles.inputError : ''}`}
                  value={form.region}
                  onChange={(e) => set('region', e.target.value)}
                  placeholder="예: 기장, 여수 돌산"
                  maxLength={100}
                />
                {errors.region && <p className={styles.errorMsg}>{errors.region}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>지형</label>
                <select
                  className={styles.select}
                  value={form.terrainType}
                  onChange={(e) => set('terrainType', e.target.value as TerrainType)}
                >
                  {TERRAIN_TYPE_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className={styles.fieldHint}>방파제(테트라 포함)·갯바위·해변 중 선택</p>
              </div>
            </div>

            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>위도 <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${errors.latitude ? styles.inputError : ''}`}
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  placeholder="예: 35.2456"
                  inputMode="decimal"
                />
                {errors.latitude && <p className={styles.errorMsg}>{errors.latitude}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>경도 <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${errors.longitude ? styles.inputError : ''}`}
                  value={form.longitude}
                  onChange={(e) => set('longitude', e.target.value)}
                  placeholder="예: 129.2103"
                  inputMode="decimal"
                />
                {errors.longitude && <p className={styles.errorMsg}>{errors.longitude}</p>}
              </div>
            </div>

            <button
              type="button"
              className={styles.mapToggleBtn}
              onClick={() => setShowMap(v => !v)}
            >
              🗺️ {showMap ? '지도 닫기' : '지도에서 선택'}
            </button>

            {showMap && (
              <div className={styles.mapArea}>
                <div ref={mapContainerRef} className={styles.mapCanvas} />
                <p className={styles.mapHint}>지도를 클릭하면 위도·경도가 자동으로 입력됩니다</p>
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label}>설명</label>
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="관리자 메모 (선택사항)"
                rows={3}
              />
            </div>
          </section>

          {/* 주요 어종 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>주요 회유 어종 <span className={styles.required}>*</span></h3>
            {errors.targetSpecies && <p className={styles.errorMsg}>{errors.targetSpecies}</p>}
            <div className={styles.boolGrid}>
              {MIGRATORY_SPECIES_OPTIONS.map(([code, label]) => (
                <label key={code} className={styles.boolField}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={form.targetSpecies.includes(code)}
                    onChange={() => toggleSpecies(code)}
                  />
                  <div className={styles.boolContent}>
                    <span className={styles.boolLabel}>{label}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* 상태 설정 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>상태 설정</h3>
            <div className={styles.boolGrid}>
              <label className={styles.boolField}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={form.publicVisible}
                  onChange={(e) => set('publicVisible', e.target.checked)}
                />
                <div className={styles.boolContent}>
                  <span className={styles.boolLabel}>사용자 노출</span>
                  <span className={styles.boolDesc}>검토 완료 후 사용자에게 이 포인트를 표시합니다.</span>
                </div>
              </label>
              <label className={styles.boolField}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={form.enabled}
                  onChange={(e) => set('enabled', e.target.checked)}
                />
                <div className={styles.boolContent}>
                  <span className={styles.boolLabel}>서비스 활성화</span>
                  <span className={styles.boolDesc}>비활성화하면 지도·포인트 선택에서 완전히 숨겨집니다.</span>
                </div>
              </label>
            </div>
          </section>

          {serverError && <p className={styles.serverError}>{serverError}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>취소</button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : editTarget ? '수정 완료' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
