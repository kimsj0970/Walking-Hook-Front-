import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { uploadImage } from '../../api/s3Api';
import TackleThumb from '../../components/tackle/TackleThumb';
import {
  createTackleProduct, deleteTackleProduct, fetchAdminTackleProducts, seaLabel,
  SPEC_LABELS, SPEC_ORDER, STYLE_LABELS, TIER_LABELS, updateTackleProduct,
  type FishingStyle, type Sea, type SpecKey, type TackleProduct, type TackleProductInput, type Tier,
} from '../../api/tackleApi';
import styles from './TackleProductManagementPage.module.css';

/**
 * 관리자 "입문 상품 관리" — 루어 채비 화면에 붙는 쿠팡 파트너스 제품.
 *
 * 운영 규칙 (기획안 §10)
 * - 정렬은 가격대 하한값으로 서버가 매긴다. 정렬 입력란을 만들지 않는다.
 * - (항목·방식·해역·등급) 그룹당 활성 3개 상한. 서버도 409 로 막는다.
 * - 상품 설명(왜 골랐는지)이 없으면 저장하지 않는다.
 * - 썸네일은 사진 사용 허락을 받은 제품만. 파일을 직접 올린다(S3 tackle-products/, ADMIN 만). 비우면 기본 썸네일.
 * - 쿠팡 링크는 파트너스에서 만든 단축 URL 을 그대로 붙여넣는다(가공 금지).
 */

const MAX_PER_GROUP = 3;
const STALE_MONTHS = 12;

const EMPTY: TackleProductInput = {
  specKey: 'ROD', style: 'SHORE', sea: 'WEST', tier: 'ENTRY',
  name: '', summary: '', reason: '', priceBand: '', imageUrl: '', linkUrl: '',
  active: true, checkedAt: today(), attrs: [],
};

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function groupKey(p: { specKey: SpecKey; style: FishingStyle | null; sea: Sea | null; tier: Tier }) {
  return `${p.specKey}|${p.style ?? ''}|${p.sea ?? ''}|${p.tier}`;
}

function isStale(checkedAt?: string | null) {
  if (!checkedAt) return true;
  const d = new Date(checkedAt);
  const limit = new Date();
  limit.setMonth(limit.getMonth() - STALE_MONTHS);
  return d < limit;
}

function errorMessage(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;
}

export default function TackleProductManagementPage() {
  const [items, setItems] = useState<TackleProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TackleProductInput | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdminTackleProducts()
      .then(setItems)
      .catch((e) => setError(errorMessage(e, '목록을 불러오지 못했습니다.')))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const groups = useMemo(() => {
    const map = new Map<string, TackleProduct[]>();
    for (const p of items) {
      const k = groupKey(p);
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()].sort(([a], [b]) => {
      const sa = SPEC_ORDER.indexOf(a.split('|')[0] as SpecKey);
      const sb = SPEC_ORDER.indexOf(b.split('|')[0] as SpecKey);
      return sa - sb || a.localeCompare(b);
    });
  }, [items]);

  const openNew = (preset?: Partial<TackleProductInput>) => {
    setEditingId(null);
    setForm({ ...EMPTY, ...preset, checkedAt: today(), attrs: [] });
    setError('');
  };

  const openEdit = (p: TackleProduct) => {
    setEditingId(p.id);
    setForm({
      specKey: p.specKey, style: p.style, sea: p.sea, tier: p.tier,
      name: p.name, summary: p.summary ?? '', reason: p.reason ?? '', priceBand: p.priceBand,
      imageUrl: p.imageUrl ?? '', linkUrl: p.linkUrl ?? '', active: p.active !== false,
      checkedAt: p.checkedAt ?? today(), attrs: p.attrs ?? [],
    });
    setError('');
  };

  const save = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.reason.trim() || !form.priceBand.trim() || !form.linkUrl.trim()) {
      setError('제품명 · 상품 설명 · 가격대 · 쿠팡 링크는 필수입니다.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = { ...form, attrs: form.attrs.filter((a) => a.label.trim() && a.value.trim()) };
      if (editingId) await updateTackleProduct(editingId, body);
      else await createTackleProduct(body);
      setForm(null);
      load();
    } catch (e) {
      setError(errorMessage(e, '저장하지 못했습니다.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: TackleProduct) => {
    if (!window.confirm(`"${p.name}" 을(를) 삭제할까요? 잠깐 내리는 거라면 비활성으로 바꾸세요.`)) return;
    try {
      await deleteTackleProduct(p.id);
      load();
    } catch (e) {
      setError(errorMessage(e, '삭제하지 못했습니다.'));
    }
  };

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPickImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일을 다시 골라도 onChange 가 뜨게
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file, 'TACKLE_PRODUCT');
      set('imageUrl', url);
    } catch (err) {
      setError(errorMessage(err, err instanceof Error ? err.message : '사진을 올리지 못했습니다.'));
    } finally {
      setUploading(false);
    }
  };

  const set = <K extends keyof TackleProductInput>(k: K, v: TackleProductInput[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>입문 상품 관리</h1>
        <p className={styles.subtitle}>루어 채비 화면에 붙는 쿠팡 파트너스 제품 · 그룹당 활성 {MAX_PER_GROUP}개까지</p>
        <button type="button" className={styles.primary} onClick={() => openNew()}>제품 추가</button>
      </div>

      {error && !form && <p className={styles.error}>{error}</p>}
      {loading && <p className={styles.muted}>불러오는 중…</p>}
      {!loading && items.length === 0 && <p className={styles.muted}>아직 등록된 제품이 없습니다.</p>}

      {groups.map(([key, list]) => {
        const first = list[0];
        const activeCount = list.filter((p) => p.active !== false).length;
        const full = activeCount >= MAX_PER_GROUP;
        return (
          <section key={key} className={styles.group}>
            <div className={styles.groupHead}>
              <strong>{SPEC_LABELS[first.specKey]}</strong>
              <span>{first.style ? STYLE_LABELS[first.style] : '모든 방식'}</span>
              <span>{seaLabel(first.sea)}</span>
              <span>{TIER_LABELS[first.tier]}</span>
              <span className={full ? styles.countFull : styles.count}>{activeCount}/{MAX_PER_GROUP}</span>
              <button
                type="button"
                className={styles.small}
                disabled={full}
                title={full ? '활성 제품이 3개입니다. 하나를 비활성으로 바꾸세요.' : undefined}
                onClick={() => openNew({ specKey: first.specKey, style: first.style, sea: first.sea, tier: first.tier })}
              >
                이 그룹에 추가
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr><th></th><th>제품명</th><th>가격대</th><th>확인일</th><th>상태</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td><TackleThumb src={p.imageUrl} size={44} /></td>
                    <td>{p.name}</td>
                    <td>{p.priceBand}</td>
                    <td>
                      {p.checkedAt ?? '-'}
                      {isStale(p.checkedAt) && <span className={styles.warn}>확인 필요</span>}
                    </td>
                    <td>{p.active !== false ? '활성' : <span className={styles.off}>비활성</span>}</td>
                    <td className={styles.actions}>
                      <button type="button" className={styles.small} onClick={() => openEdit(p)}>수정</button>
                      <button type="button" className={styles.danger} onClick={() => remove(p)}>삭제</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      {form && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={editingId ? '제품 수정' : '제품 추가'}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{editingId ? '제품 수정' : '제품 추가'}</h2>

            <div className={styles.grid4}>
              <label>항목
                <select value={form.specKey} onChange={(e) => set('specKey', e.target.value as SpecKey)}>
                  {SPEC_ORDER.map((k) => <option key={k} value={k}>{SPEC_LABELS[k]}</option>)}
                </select>
              </label>
              <label>방식
                <select value={form.style ?? ''} onChange={(e) => set('style', (e.target.value || null) as FishingStyle | null)}>
                  <option value="">모든 방식 (공통)</option>
                  {(Object.keys(STYLE_LABELS) as FishingStyle[]).map((k) => <option key={k} value={k}>{STYLE_LABELS[k]}</option>)}
                </select>
              </label>
              <label>해역
                <select value={form.sea ?? ''} onChange={(e) => set('sea', (e.target.value || null) as Sea | null)}>
                  <option value="">모든 해역 (공통)</option>
                  <option value="WEST">서해 · 남해</option>
                  <option value="EAST">동해</option>
                  <option value="SOUTH">남해 전용 (에깅·라이트게임용)</option>
                </select>
              </label>
              <label>등급
                <select value={form.tier} onChange={(e) => set('tier', e.target.value as Tier)}>
                  {(Object.keys(TIER_LABELS) as Tier[]).map((k) => <option key={k} value={k}>{TIER_LABELS[k]}</option>)}
                </select>
              </label>
            </div>

            <label>제품명 *
              <input value={form.name} maxLength={120} onChange={(e) => set('name', e.target.value)} />
            </label>
            <label>한 줄 설명 (목록에 보임)
              <input value={form.summary} maxLength={200} onChange={(e) => set('summary', e.target.value)} />
            </label>
            <label>상품 설명 * — 왜 이 제품인가 ("직접 써봤다" / "이 규격대에서 가장 많이 쓰는 모델")
              <textarea rows={4} value={form.reason} onChange={(e) => set('reason', e.target.value)} />
            </label>
            <div className={styles.grid2}>
              <label>가격대 * (예: 9~12만원대)
                <input value={form.priceBand} maxLength={40} onChange={(e) => set('priceBand', e.target.value)} />
              </label>
              <label>링크 확인일
                <input type="date" value={form.checkedAt ?? ''} onChange={(e) => set('checkedAt', e.target.value || null)} />
              </label>
            </div>
            <label>쿠팡 링크 * (파트너스 단축 URL 그대로)
              <input value={form.linkUrl} maxLength={500} placeholder="https://link.coupang.com/..." onChange={(e) => set('linkUrl', e.target.value)} />
            </label>
            <div className={styles.thumbRow}>
              <TackleThumb src={form.imageUrl || null} size={96} />
              <div className={styles.grow}>
                <div className={styles.thumbLabel}>썸네일 사진 (사진 사용 허락을 받은 경우만, 없으면 기본 썸네일)</div>
                <div className={styles.thumbBtns}>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={onPickImage} />
                  <button type="button" className={styles.small} disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? '올리는 중…' : form.imageUrl ? '사진 바꾸기' : '사진 올리기'}
                  </button>
                  {form.imageUrl && !uploading && (
                    <button type="button" className={styles.small} onClick={() => set('imageUrl', '')}>사진 빼기</button>
                  )}
                </div>
                <div className={styles.thumbHint}>JPG · PNG · GIF · WebP, 10MB 이하</div>
              </div>
            </div>

            <div className={styles.attrHead}>
              <span>상세 사양 (무게·기어비 등)</span>
              <button type="button" className={styles.small} onClick={() => set('attrs', [...form.attrs, { label: '', value: '' }])}>행 추가</button>
            </div>
            {form.attrs.map((a, i) => (
              <div key={i} className={styles.attrRow}>
                <input placeholder="이름 (무게)" value={a.label} maxLength={40}
                  onChange={(e) => set('attrs', form.attrs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                <input placeholder="값 (182g)" value={a.value} maxLength={100}
                  onChange={(e) => set('attrs', form.attrs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                <button type="button" className={styles.danger} onClick={() => set('attrs', form.attrs.filter((_, j) => j !== i))}>삭제</button>
              </div>
            ))}

            <label className={styles.check}>
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              화면에 노출 (활성)
            </label>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondary} onClick={() => setForm(null)}>취소</button>
              <button type="button" className={styles.primary} disabled={saving} onClick={save}>{saving ? '저장 중…' : '저장'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
