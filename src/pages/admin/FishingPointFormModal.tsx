import { useState, useEffect } from 'react';
import {
  type FishingPointDetail,
  type FishingPointCreateRequest,
  type Province,
  type SafetyLevel,
  type TerrainType,
  type BottomType,
  type DepthFeature,
  type StructureDensity,
  PROVINCE_OPTIONS,
  SAFETY_LEVEL_OPTIONS,
  TERRAIN_TYPE_OPTIONS,
  BOTTOM_TYPE_OPTIONS,
  DEPTH_FEATURE_OPTIONS,
  STRUCTURE_DENSITY_OPTIONS,
  createFishingPoint,
  updateFishingPoint,
} from '../../api/fishingPointApi';
import styles from './FishingPointFormModal.module.css';

interface BoolFieldMeta {
  key: keyof FormState;
  label: string;
  description: string;
}

const STATUS_FIELDS: BoolFieldMeta[] = [
  {
    key: 'walkingAccessible',
    label: '도보 접근 가능',
    description: '도보로 접근할 수 있는 포인트입니다. 사용자 검색 필터에 영향을 줍니다.',
  },
  {
    key: 'fishingAllowed',
    label: '낚시 가능 여부',
    description: '낚시가 가능한 포인트입니다.',
  },
  {
    key: 'publicVisible',
    label: '사용자 노출',
    description: '검토 완료 후 사용자에게 이 포인트를 표시합니다.',
  },
  {
    key: 'enabled',
    label: '서비스 활성화',
    description: '비활성화하면 모든 사용자에게 완전히 숨겨집니다.',
  },
];

const TERRAIN_FEATURE_FIELDS: BoolFieldMeta[] = [
  {
    key: 'isHomtong',
    label: '홈통',
    description: '굽은 만(灣) 형태의 지형입니다. 물고기가 모이기 쉬운 환경을 형성합니다.',
  },
  {
    key: 'isCape',
    label: '곶(케이프)',
    description: '바다 쪽으로 돌출된 지형입니다. 조류가 만나는 지점으로 어족이 풍부합니다.',
  },
  {
    key: 'isEstuary',
    label: '기수역',
    description: '민물과 바닷물이 혼합되는 구역입니다. 다양한 어종이 서식합니다.',
  },
  {
    key: 'isRockField',
    label: '돌밭',
    description: '넓은 암석·돌이 분포한 지형입니다.',
  },
  {
    key: 'isUnderwaterReef',
    label: '수중여',
    description: '물속에 잠긴 암초 지형입니다. 어류 서식처로 좋습니다.',
  },
  {
    key: 'hasFoam',
    label: '포말 빈번',
    description: '거품이 자주 생기는 지점입니다. 먹이 활동이 활발한 신호입니다.',
  },
  {
    key: 'hasCurrentChange',
    label: '조류 변화 빈번',
    description: '조류 흐름이 자주 변하는 지점입니다.',
  },
  {
    key: 'baitFrequent',
    label: '베이트피시 빈번',
    description: '작은 먹잇감 물고기(베이트)가 자주 출몰하는 포인트입니다.',
  },
];

interface FormState {
  name: string;
  province: Province | '';
  region: string;
  latitude: string;
  longitude: string;
  description: string;
  walkingAccessible: boolean;
  fishingAllowed: boolean;
  publicVisible: boolean;
  enabled: boolean;
  safetyLevel: SafetyLevel;
  terrainType: TerrainType;
  bottomType: BottomType;
  depthFeature: DepthFeature;
  structureDensity: StructureDensity;
  isHomtong: boolean;
  isCape: boolean;
  isEstuary: boolean;
  isRockField: boolean;
  isUnderwaterReef: boolean;
  hasFoam: boolean;
  hasCurrentChange: boolean;
  baitFrequent: boolean;
}

const DEFAULT_FORM: FormState = {
  name: '',
  province: '',
  region: '',
  latitude: '',
  longitude: '',
  description: '',
  walkingAccessible: false,
  fishingAllowed: true,
  publicVisible: false,
  enabled: true,
  safetyLevel: 'NORMAL',
  terrainType: 'UNKNOWN',
  bottomType: 'UNKNOWN',
  depthFeature: 'UNKNOWN',
  structureDensity: 'UNKNOWN',
  isHomtong: false,
  isCape: false,
  isEstuary: false,
  isRockField: false,
  isUnderwaterReef: false,
  hasFoam: false,
  hasCurrentChange: false,
  baitFrequent: false,
};

function detailToForm(d: FishingPointDetail): FormState {
  return {
    name: d.name,
    province: d.province,
    region: d.region,
    latitude: String(d.latitude),
    longitude: String(d.longitude),
    description: d.description ?? '',
    walkingAccessible: d.walkingAccessible,
    fishingAllowed: d.fishingAllowed,
    publicVisible: d.publicVisible,
    enabled: d.enabled,
    safetyLevel: d.safetyLevel,
    terrainType: d.terrainType,
    bottomType: d.bottomType,
    depthFeature: d.depthFeature,
    structureDensity: d.structureDensity,
    isHomtong: d.isHomtong,
    isCape: d.isCape,
    isEstuary: d.isEstuary,
    isRockField: d.isRockField,
    isUnderwaterReef: d.isUnderwaterReef,
    hasFoam: d.hasFoam,
    hasCurrentChange: d.hasCurrentChange,
    baitFrequent: d.baitFrequent,
  };
}

interface Props {
  open: boolean;
  editTarget: FishingPointDetail | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function FishingPointFormModal({ open, editTarget, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(editTarget ? detailToForm(editTarget) : DEFAULT_FORM);
      setErrors({});
      setServerError('');
    }
  }, [open, editTarget]);

  if (!open) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) newErrors.name = '이름을 입력하세요.';
    if (!form.province) newErrors.province = '시/도를 선택하세요.';
    const lat = parseFloat(form.latitude);
    if (!form.latitude.trim() || isNaN(lat) || lat < -90 || lat > 90)
      newErrors.latitude = '위도는 -90~90 사이 숫자여야 합니다.';
    const lng = parseFloat(form.longitude);
    if (!form.longitude.trim() || isNaN(lng) || lng < -180 || lng > 180)
      newErrors.longitude = '경도는 -180~180 사이 숫자여야 합니다.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setServerError('');
    const payload: FishingPointCreateRequest = {
      name: form.name.trim(),
      province: form.province as Province,
      region: form.region.trim(),
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      description: form.description.trim() || undefined,
      walkingAccessible: form.walkingAccessible,
      fishingAllowed: form.fishingAllowed,
      publicVisible: form.publicVisible,
      enabled: form.enabled,
      safetyLevel: form.safetyLevel,
      terrainType: form.terrainType,
      bottomType: form.bottomType,
      depthFeature: form.depthFeature,
      structureDensity: form.structureDensity,
      isHomtong: form.isHomtong,
      isCape: form.isCape,
      isEstuary: form.isEstuary,
      isRockField: form.isRockField,
      isUnderwaterReef: form.isUnderwaterReef,
      hasFoam: form.hasFoam,
      hasCurrentChange: form.hasCurrentChange,
      baitFrequent: form.baitFrequent,
    };
    try {
      if (editTarget) {
        await updateFishingPoint(editTarget.id, payload);
      } else {
        await createFishingPoint(payload);
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
            {editTarget ? '포인트 수정' : '새 포인트 추가'}
          </h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">
            ✕
          </button>
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
                  placeholder="예: 영도 하리 갯바위"
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
                <label className={styles.label}>지역</label>
                <input
                  className={`${styles.input} ${errors.region ? styles.inputError : ''}`}
                  value={form.region}
                  onChange={(e) => set('region', e.target.value)}
                  placeholder="예: 영도, 기장"
                  maxLength={100}
                />
                {errors.region && <p className={styles.errorMsg}>{errors.region}</p>}
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>위도 <span className={styles.required}>*</span></label>
                <input
                  className={`${styles.input} ${errors.latitude ? styles.inputError : ''}`}
                  value={form.latitude}
                  onChange={(e) => set('latitude', e.target.value)}
                  placeholder="예: 35.0891"
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
                  placeholder="예: 129.0622"
                  inputMode="decimal"
                />
                {errors.longitude && <p className={styles.errorMsg}>{errors.longitude}</p>}
              </div>
            </div>
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

          {/* 분류 정보 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>분류 정보</h3>
            <div className={styles.row2}>
              <div className={styles.field}>
                <label className={styles.label}>안전등급</label>
                <select
                  className={styles.select}
                  value={form.safetyLevel}
                  onChange={(e) => set('safetyLevel', e.target.value as SafetyLevel)}
                >
                  {SAFETY_LEVEL_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
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
              </div>
              <div className={styles.field}>
                <label className={styles.label}>바닥 유형</label>
                <select
                  className={styles.select}
                  value={form.bottomType}
                  onChange={(e) => set('bottomType', e.target.value as BottomType)}
                >
                  {BOTTOM_TYPE_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>수심 특성</label>
                <select
                  className={styles.select}
                  value={form.depthFeature}
                  onChange={(e) => set('depthFeature', e.target.value as DepthFeature)}
                >
                  {DEPTH_FEATURE_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>수중 구조물 밀도</label>
                <select
                  className={styles.select}
                  value={form.structureDensity}
                  onChange={(e) => set('structureDensity', e.target.value as StructureDensity)}
                >
                  {STRUCTURE_DENSITY_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <p className={styles.fieldHint}>암초·수중여 등 어류 은신처 밀도 (내가 서 있는 발판 기준이 아닌 캐스팅 수역 기준)</p>
              </div>
            </div>
          </section>

          {/* 상태 설정 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>상태 설정</h3>
            <div className={styles.boolGrid}>
              {STATUS_FIELDS.map(({ key, label, description }) => (
                <label key={key} className={styles.boolField}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={form[key] as boolean}
                    onChange={(e) => set(key, e.target.checked)}
                  />
                  <div className={styles.boolContent}>
                    <span className={styles.boolLabel}>{label}</span>
                    <span className={styles.boolDesc}>{description}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* 지형 특성 */}
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>지형 특성</h3>
            <div className={styles.boolGrid}>
              {TERRAIN_FEATURE_FIELDS.map(({ key, label, description }) => (
                <label key={key} className={styles.boolField}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={form[key] as boolean}
                    onChange={(e) => set(key, e.target.checked)}
                  />
                  <div className={styles.boolContent}>
                    <span className={styles.boolLabel}>{label}</span>
                    <span className={styles.boolDesc}>{description}</span>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {serverError && <p className={styles.serverError}>{serverError}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
            {saving ? '저장 중...' : editTarget ? '수정 완료' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}
