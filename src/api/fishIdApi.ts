import api from './authApi';

/**
 * 사진 어종판별 API — 회원 전용, 계정당 하루 3회 (관리자 무제한, 예시 테스트 포함).
 * 이미지는 판별 후 서버에 저장되지 않는다 (조과글로 게시할 때 처음 저장).
 */

export interface FishIdCandidate {
  code: string;
  nameKr: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  features: string[];
}

export interface FishIdQuestion {
  text: string;
  yesCode: string;
  noCode: string;
  yesNameKr: string;
  noNameKr: string;
}

export interface FishIdSize {
  minCm: number | null;
  maxCm: number | null;
  reliability: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FishIdVerdict {
  result: 'OK' | 'BORDERLINE' | 'RELEASE' | 'CLOSED_SEASON' | 'NO_REGULATION' | 'MANUAL_CHECK';
  reason: string;
  limitText: string | null;
  closedSeasonText: string | null;
  legalBasis: string;
  effectiveDate: string;
  regionUsed: string | null;
  caution: string | null;
  /**
   * 이 어종을 무엇으로 재야 하는가. 화면은 이 값으로 측정 UI를 바꾼다.
   *  NONE   크기를 안 봄 (금어기만 있거나 규제 없음)
   *  TOTAL  전장 — 입 끝 ~ 꼬리 끝 (4탭 가능)
   *  MANTLE 외투장 — 다리 뺀 몸통 (살오징어, 4탭 가능)
   *  ANAL   항문장 (갈치) / DISC 체반폭 (가오리) — 사진에서 짚기 어려워 직접 입력만
   *  WEIGHT 무게(g) — 대문어. 저울 값만 받는다
   */
  measureTarget: 'NONE' | 'TOTAL' | 'MANTLE' | 'ANAL' | 'DISC' | 'WEIGHT';
  measureLabel: string;
  measureUnit: string;
  measureGuide: string;
  measureTappable: boolean;
}

export interface FishIdResponse {
  status: 'OK' | 'NEED_CONFIRM' | 'UNIDENTIFIED' | 'NOT_FISH';
  logId: string | null;
  candidates: FishIdCandidate[];
  question: FishIdQuestion | null;
  verdict: FishIdVerdict | null;
  size: FishIdSize | null;
  /** 서버가 들려 보내는 한 줄 안내 — 못 한 이유(NOT_FISH) 또는 무엇을 기준으로 답했는지. */
  notice: string | null;
}

export async function analyzeFish(image: Blob, region?: string): Promise<FishIdResponse> {
  const form = new FormData();
  form.append('image', image, 'fish.jpg');
  if (region) form.append('region', region);
  const { data } = await api.post('/fish-id', form);
  return data.data;
}

export async function confirmFish(params: {
  logId: string | null;
  speciesCode: string;
  region?: string;
  measuredMm?: number;
  measureSource?: 'MANUAL' | 'TAP_CARD' | 'TAP_HAND' | 'TAP_HAND_DEFAULT';
  measuredWeightG?: number;
  /** AI가 고른 어종을 사용자가 직접 바꾼 경우 — 오판 분석·참조 보강에 쓰인다 */
  userCorrected?: boolean;
  llmMinCm?: number | null;
  llmMaxCm?: number | null;
  llmReliability?: string;
}): Promise<FishIdVerdict> {
  const { data } = await api.post('/fish-id/confirm', params);
  return data.data;
}

/**
 * 오늘 남은 판별 횟수.
 *
 * 판별 응답에 얹지 않고 따로 받는 이유 — 예시 사진 결과는 서버에서 캐시되므로
 * 거기에 남은 횟수를 넣으면 값이 얼어붙는다. 화면 진입 시 한 번, 판별 후 한 번 부른다.
 */
export interface FishIdQuota {
  limit: number;
  used: number;
  remaining: number;
  /** 관리자 — true면 화면에 횟수를 표시하지 않는다 */
  unlimited: boolean;
}

export async function fetchFishIdQuota(): Promise<FishIdQuota> {
  const { data } = await api.get('/fish-id/quota');
  return data.data;
}

export async function fetchFishIdExample(): Promise<{ imageUrl: string; result: FishIdResponse }> {
  const { data } = await api.get('/fish-id/example');
  return data.data;
}

/**
 * 업로드 전 클라이언트 리사이즈 — 긴 변 1024px JPEG.
 * 바다에서 업로드가 가볍고, 캔버스 재인코딩으로 EXIF(GPS)가 자연히 제거된다.
 */
export async function resizeImage(file: File, maxEdge = 1024): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환 실패'))),
      'image/jpeg',
      0.85,
    ),
  );
}
