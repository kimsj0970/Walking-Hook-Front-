import api from './authApi';

/**
 * 루어 채비 제휴 제품 (쿠팡 파트너스).
 *
 * - 공개 목록 `GET /tackle-products` 에는 쿠팡 링크가 없다. 링크는 상세(`GET /tackle-products/{id}`)에서만 준다 —
 *   목록에서 바로 외부로 나가지 않고, 상세 화면에서 확인한 뒤 누르게 하려는 것.
 * - 해역·방식·등급 필터는 화면이 한다. 전체가 수십 행이라 한 번에 받는 편이 빠르다.
 * - style·sea 가 null 이면 공통.
 */

export type SpecKey = 'ROD' | 'REEL' | 'LINE' | 'LEADER' | 'SWIVEL' | 'LURE';
export type FishingStyle = 'SHORE' | 'SURF' | 'LIGHT_GAME' | 'EGING';
export type Sea = 'WEST' | 'EAST' | 'SOUTH';
export type Tier = 'ENTRY' | 'MID' | 'HIGH';

export interface TackleAttr {
  label: string;
  value: string;
}

export interface TackleProduct {
  id: string;
  specKey: SpecKey;
  style: FishingStyle | null;
  sea: Sea | null;
  tier: Tier;
  name: string;
  summary: string | null;
  priceBand: string;
  imageUrl: string | null;
  /** 상세·관리자에서만 */
  reason?: string | null;
  linkUrl?: string | null;
  active?: boolean | null;
  checkedAt?: string | null;
  attrs?: TackleAttr[] | null;
}

export interface TackleProductInput {
  specKey: SpecKey;
  style: FishingStyle | null;
  sea: Sea | null;
  tier: Tier;
  name: string;
  summary: string;
  reason: string;
  priceBand: string;
  imageUrl: string;
  linkUrl: string;
  active: boolean;
  checkedAt: string | null;
  attrs: TackleAttr[];
}

export const SPEC_LABELS: Record<SpecKey, string> = {
  ROD: '로드',
  REEL: '릴',
  LINE: '원줄',
  LEADER: '쇼크리더',
  SWIVEL: '도래',
  LURE: '루어',
};

/** "한눈에 보는 채비" 그림 번호와 같다. 매듭은 제품이 없어 번호가 없다. */
export const SPEC_ORDER: SpecKey[] = ['ROD', 'REEL', 'LINE', 'LEADER', 'SWIVEL', 'LURE'];

export const TIER_LABELS: Record<Tier, string> = { ENTRY: '입문', MID: '중급', HIGH: '고급' };

export const STYLE_LABELS: Record<FishingStyle, string> = {
  SHORE: '갯바위·방파제',
  SURF: '서프 루어',
  LIGHT_GAME: '라이트게임',
  EGING: '에깅',
};

/** 화면 해역 라벨. 2026-10-21 결정 — 남해는 서해와 묶는다. */
export function seaLabel(sea: Sea | null): string {
  if (sea === 'WEST') return '서해 · 남해';
  if (sea === 'EAST') return '동해';
  if (sea === 'SOUTH') return '남해';
  return '공통';
}

export async function fetchTackleProducts(): Promise<TackleProduct[]> {
  const { data } = await api.get('/tackle-products');
  return (data.data ?? []) as TackleProduct[];
}

export async function fetchTackleProduct(id: string): Promise<TackleProduct> {
  const { data } = await api.get(`/tackle-products/${encodeURIComponent(id)}`);
  return data.data as TackleProduct;
}

// ── 관리자 ────────────────────────────────────────────────

export async function fetchAdminTackleProducts(): Promise<TackleProduct[]> {
  const { data } = await api.get('/admin/tackle-products');
  return (data.data ?? []) as TackleProduct[];
}

export async function createTackleProduct(input: TackleProductInput): Promise<string> {
  const { data } = await api.post('/admin/tackle-products', input);
  return data.data as string;
}

export async function updateTackleProduct(id: string, input: TackleProductInput): Promise<void> {
  await api.put(`/admin/tackle-products/${encodeURIComponent(id)}`, input);
}

export async function deleteTackleProduct(id: string): Promise<void> {
  await api.delete(`/admin/tackle-products/${encodeURIComponent(id)}`);
}
