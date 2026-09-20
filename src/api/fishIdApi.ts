import api from './authApi';
import { demoPath, isDemoMode } from './demoApi';

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

/**
 * 판별 요청의 응답 대기 시간.
 *
 * axios 기본값은 "무한 대기"다. 그대로 두면 서버가 죽어도 화면이 영원히 도는데,
 * 사용자는 멈춘 건지 도는 건지 알 수 없다. 앱과 같은 40초로 맞춘다 —
 * 서버의 OpenAI 읽기 제한이 30초라 정상 실패는 35초 안에 끝나므로,
 * 40초에 걸린다는 건 서버가 답 자체를 못 주고 있다는 뜻이다.
 */
const ANALYZE_TIMEOUT_MS = 40_000;

/**
 * 어종판별 실패 문구 — **앱(api_exception.dart)과 같은 문장을 쓴다.**
 *
 * 서버가 내려주는 message 를 그대로 띄우지 않고 여기서 한 번 더 잡는 이유는,
 * 앱이 5xx 응답의 문구를 믿지 않고 자체 문구로 덮기 때문이다. 양쪽을 서버 문구에
 * 맡겨 두면 같은 상황에서 웹과 앱이 다른 말을 하게 된다.
 *
 * 여기 없는 것 — "어종을 못 알아봤다"는 실패가 아니라 정상 응답(200)이다.
 * status = UNIDENTIFIED / NOT_FISH 로 내려오고 결과 화면이 notice 를 띄운다.
 */
const FISH_ID_MESSAGES: Record<string, string> = {
  FISH_ID_TIMEOUT: '분석이 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.',
  FISH_ID_AI_ERROR: 'AI 분석 서버에 문제가 있어요. 잠시 후 다시 시도해 주세요.',
  FISH_ID_IMAGE_UNREADABLE: '사진을 읽지 못했어요. 다른 사진으로 다시 시도해 주세요.',
  FISH_ID_IMAGE_TOO_LARGE: '사진 용량이 너무 커요. 8MB 이하로 줄여서 올려주세요.',
  FISH_ID_DAILY_LIMIT: '오늘의 판별 횟수(3회)를 모두 사용했어요. 내일 다시 이용해 주세요.',
  FISH_ID_EXAMPLE_NOT_READY: '예시 사진이 아직 준비되지 않았어요.',
  // 체험판(비로그인) 전용 — IP 별 3회(RATE_LIMIT_EXCEEDED)와 하루 전체 상한. 사용자가 할 일은
  // 둘 다 "가입하기" 로 같아서 화면은 한 카드로 보여준다.
  RATE_LIMIT_EXCEEDED: '오늘 체험은 여기까지예요. 내일 다시 열려요.',
  DEMO_DAILY_CAP: '오늘 체험판 분량을 모두 썼어요. 내일 다시 열려요.',
};

/** 응답을 못 받은 경우 — 서버가 코드를 줄 수 없으니 여기서 이름을 붙인다. */
const REQUEST_TIMEOUT = '응답이 오래 걸려 중단했어요. 잠시 후 다시 시도해 주세요.';
const NETWORK_ERROR = '네트워크 연결을 확인해주세요.';  // 앱의 전역 문구와 동일

/**
 * 어떤 오류든 사용자에게 보여줄 한 줄로 바꾼다.
 *
 * 우선순위: ① 우리가 이름 붙인 코드 → ② 서버 문구 → ③ 화면이 준 기본 문구.
 * ①이 맨 앞인 이유는 앱과 문장을 맞추기 위해서다.
 */
export function fishIdErrorMessage(error: unknown, fallback: string): string {
  const e = error as {
    code?: string;
    response?: { status?: number; data?: { code?: string; message?: string } };
  };

  // 응답 자체가 없는 경우 — axios 는 타임아웃도 네트워크 단절도 response 를 안 준다.
  if (!e?.response) {
    if (e?.code === 'ECONNABORTED' || e?.code === 'ETIMEDOUT') return REQUEST_TIMEOUT;
    return NETWORK_ERROR;
  }

  const code = e.response.data?.code;
  if (code && FISH_ID_MESSAGES[code]) return FISH_ID_MESSAGES[code];
  return e.response.data?.message ?? fallback;
}

/**
 * @param handSpanMm 체험판(비로그인)에서만 쓴다. 회원은 서버가 users 표의 값을 쓰므로 무시된다.
 *                   체험판은 저장하지 않고 매 요청에 실어 보낸다 — 화면이 매번 입력받는다.
 */
export async function analyzeFish(
  image: Blob,
  region?: string,
  handSpanMm?: number,
): Promise<FishIdResponse> {
  const form = new FormData();
  form.append('image', image, 'fish.jpg');
  if (region) form.append('region', region);
  if (isDemoMode() && handSpanMm != null) form.append('handSpanMm', String(handSpanMm));
  const { data } = await api.post(demoPath('/fish-id'), form, { timeout: ANALYZE_TIMEOUT_MS });
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
  const { data } = await api.post(demoPath('/fish-id/confirm'), params);
  return data.data;
}

/**
 * 오늘 남은 판별 횟수.
 *
 * 판별 응답에 얹지 않고 따로 받는 이유 — 남은 횟수는 판별 결과와 수명이 다르다.
 * 화면 진입 시 한 번, 판별 후 한 번 부른다.
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
  // 예시도 캐시 없이 실제 파이프라인을 그대로 돌므로 판별과 같은 만큼 걸릴 수 있다.
  const { data } = await api.get(demoPath('/fish-id/example'), { timeout: ANALYZE_TIMEOUT_MS });
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
