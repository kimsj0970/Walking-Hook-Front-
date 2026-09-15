import api from './authApi';

export type Province =
  | 'SEOUL' | 'BUSAN' | 'DAEGU' | 'INCHEON' | 'GWANGJU' | 'DAEJEON' | 'ULSAN' | 'SEJONG'
  | 'GYEONGGI' | 'GANGWON' | 'CHUNGBUK' | 'CHUNGNAM' | 'JEONBUK' | 'JEONNAM'
  | 'GYEONGBUK' | 'GYEONGNAM' | 'JEJU';

export type SafetyLevel = 'SAFE' | 'NORMAL' | 'CAUTION' | 'DANGEROUS';
export type TerrainType = 'UNKNOWN' | 'BEACH' | 'BREAKWATER' | 'ROCKY_SHORE' | 'PORT';
export type BottomType = 'UNKNOWN' | 'SAND' | 'MUD' | 'GRAVEL' | 'ROCK' | 'MIXED' | 'TETRAPOD';
export type DepthFeature = 'UNKNOWN' | 'SHALLOW' | 'GENTLE_SLOPE' | 'DEPTH_BREAK' | 'WATER_CHANNEL' | 'DEEP_DROP';
export type StructureDensity = 'UNKNOWN' | 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export const PROVINCE_LABELS: Record<Province, string> = {
  SEOUL: '서울특별시',
  BUSAN: '부산광역시',
  DAEGU: '대구광역시',
  INCHEON: '인천광역시',
  GWANGJU: '광주광역시',
  DAEJEON: '대전광역시',
  ULSAN: '울산광역시',
  SEJONG: '세종특별자치시',
  GYEONGGI: '경기도',
  GANGWON: '강원특별자치도',
  CHUNGBUK: '충청북도',
  CHUNGNAM: '충청남도',
  JEONBUK: '전북특별자치도',
  JEONNAM: '전라남도',
  GYEONGBUK: '경상북도',
  GYEONGNAM: '경상남도',
  JEJU: '제주특별자치도',
};

export const PROVINCE_OPTIONS = Object.entries(PROVINCE_LABELS) as [Province, string][];

export const SAFETY_LEVEL_LABELS: Record<SafetyLevel, string> = {
  SAFE: '안전',
  NORMAL: '보통',
  CAUTION: '주의',
  DANGEROUS: '위험',
};

export const TERRAIN_TYPE_LABELS: Record<TerrainType, string> = {
  UNKNOWN: '미상',
  BEACH: '백사장',
  BREAKWATER: '방파제',
  ROCKY_SHORE: '갯바위',
  PORT: '항구',
};

export const BOTTOM_TYPE_LABELS: Record<BottomType, string> = {
  UNKNOWN: '미상',
  SAND: '모래',
  MUD: '펄·뻘',
  GRAVEL: '자갈',
  ROCK: '암반',
  MIXED: '혼합',
  TETRAPOD: '테트라포드',
};

export const DEPTH_FEATURE_LABELS: Record<DepthFeature, string> = {
  UNKNOWN: '미상',
  SHALLOW: '얕음',
  GENTLE_SLOPE: '완경사',
  DEPTH_BREAK: '수심 급변',
  WATER_CHANNEL: '물골',
  DEEP_DROP: '급심',
};

export const STRUCTURE_DENSITY_LABELS: Record<StructureDensity, string> = {
  UNKNOWN: '미상',
  NONE: '없음',
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
};

export const SAFETY_LEVEL_OPTIONS = Object.entries(SAFETY_LEVEL_LABELS) as [SafetyLevel, string][];
export const TERRAIN_TYPE_OPTIONS = Object.entries(TERRAIN_TYPE_LABELS) as [TerrainType, string][];
export const BOTTOM_TYPE_OPTIONS = Object.entries(BOTTOM_TYPE_LABELS) as [BottomType, string][];
export const DEPTH_FEATURE_OPTIONS = Object.entries(DEPTH_FEATURE_LABELS) as [DepthFeature, string][];
export const STRUCTURE_DENSITY_OPTIONS = Object.entries(STRUCTURE_DENSITY_LABELS) as [StructureDensity, string][];

export interface FishingPointSummary {
  id: string;
  name: string;
  region: string;
  safetyLevel: SafetyLevel;
  terrainType: TerrainType;
  enabled: boolean;
  publicVisible: boolean;
  latitude: number;
  longitude: number;
  lastAnalyzedAt: string | null;
}

export interface FishingPointMapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface FishingPointDetail {
  id: string;
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  description: string | null;
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

export interface FishingPointCreateRequest {
  name: string;
  province: Province;
  region: string;
  latitude: number;
  longitude: number;
  description?: string;
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

export type FishingPointUpdateRequest = Partial<FishingPointCreateRequest>;

export async function searchFishingPoints(name?: string): Promise<FishingPointSummary[]> {
  const params = name ? { name } : {};
  const { data } = await api.get('/admin/fish-points', { params });
  return (data.data ?? []) as FishingPointSummary[];
}

export async function getFishingPoint(id: string): Promise<FishingPointDetail> {
  const { data } = await api.get(`/admin/fish-points/${id}`);
  return data.data as FishingPointDetail;
}

export async function createFishingPoint(req: FishingPointCreateRequest): Promise<string> {
  const { data } = await api.post('/admin/fish-points', req);
  return data.data as string;
}

export async function updateFishingPoint(id: string, req: FishingPointUpdateRequest): Promise<void> {
  await api.patch(`/admin/fish-points/${id}`, req);
}

export async function deleteFishingPoint(id: string): Promise<void> {
  await api.delete(`/admin/fish-points/${id}`);
}

export async function fetchPublicFishingPointsForMap(): Promise<FishingPointMapMarker[]> {
  const { data } = await api.get('/fishing-points/map');
  return (data.data ?? []) as FishingPointMapMarker[];
}

export interface ProvinceItem {
  code: string;
  displayName: string;
}

export async function fetchProvinces(): Promise<ProvinceItem[]> {
  const { data } = await api.get('/fishing-points/provinces');
  return (data.data ?? []) as ProvinceItem[];
}

export async function fetchFishingPointsByProvince(province: string): Promise<FishingPointMapMarker[]> {
  const { data } = await api.get('/fishing-points/by-province', { params: { province } });
  return (data.data ?? []) as FishingPointMapMarker[];
}

export interface SpeciesAnalysis {
  species: string;
  score: number;
  summary: string;
  conditionReason: string;
  pointReason: string;
  strategy: string;
  tackle: string;
  caution: string;
}

export type OutingStatus = 'SAFE' | 'CAUTION' | 'IMPOSSIBLE';

export interface TideEvent {
  time: string;       // "HH:mm"
  heightCm: number;
  highTide: boolean;  // true = 만조, false = 간조
  dayOffset?: number; // 0 = 오늘, 1 = 내일 (없으면 0으로 간주)
}

export interface TidePoint {
  minuteOffset: number; // 어제 00:00 기준 경과 분 (오늘 00:00 = 1440)
  heightCm: number;
}

export type TideFlowPhase =
  | 'RISING_FAST'
  | 'RISING_SLOW'
  | 'HIGH_SLACK'
  | 'FALLING_FAST'
  | 'FALLING_SLOW'
  | 'LOW_SLACK'
  | 'UNKNOWN';

export const TIDE_FLOW_LABELS: Record<TideFlowPhase, string> = {
  RISING_FAST:  '들물 본 때',
  RISING_SLOW:  '막들물',
  HIGH_SLACK:   '만조 전환기',
  FALLING_FAST: '날물 본 때',
  FALLING_SLOW: '막끝물',
  LOW_SLACK:    '간조 전환기',
  UNKNOWN:      '—',
};

/**
 * GET /fishing-points/{id}/conditions 의 `hourly[]` — 기상청 초단기예보 한 시점.
 *
 * 관측값은 여기 들어오지 않는다. 계기 타일이 "지금"을 맡고 이 배열은 미래만 맡는다.
 * 예보 풍속은 육상 5km 격자 기준이라 해상 실측과 계통이 달라, 한 줄에 섞으면 값이 튄다.
 */
export interface HourlyForecast {
  /** "HH:mm" — 날짜 없음. 오늘 안의 시각이다. */
  time: string;
  sky: string | null;
  precipitationType: string | null;
  precipitationProbability: number | null;
  temperature: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  /** 초단기예보에는 파고가 없다. 서버가 단기예보 WAV 로 채우며, 없으면 null. */
  waveHeight: number | null;
  /**
   * 초단기예보 RN1 원문. 기상청이 "1.0mm 미만" 같은 범주형 문자열을 주기도 해서
   * 서버가 숫자로 바꾸지 않고 그대로 넘긴다. 강수가 없으면 null.
   */
  precipitation: string | null;
}

/**
 * `daily[]` — 단기예보를 오전/오후 반일로 집계한 한 칸. 하루에 두 개.
 *
 * 범위(min~max)는 서버가 그 반일에 해당하는 시각 칸들에서 집계한 값이다.
 * 수온은 예보 소스가 없어 여기 없다.
 */
export interface DailyForecast {
  /** "yyyy-MM-dd" */
  date: string;
  afternoon: boolean;
  sky: string | null;
  precipitationProbability: number | null;
  tempMin: number | null;
  tempMax: number | null;
  windSpeedMin: number | null;
  windSpeedMax: number | null;
  waveHeightMin: number | null;
  waveHeightMax: number | null;
  fishingIndex: string | null;
  /** 단기예보 PCP 원문. 그 반일에서 가장 센 값 하나. 강수가 없으면 null. */
  precipitation: string | null;
  /**
   * 몇물 / 만조 시각 — 서버가 아직 오늘 하루치 조석만 계산해서 각각 null, [] 로 온다.
   * 내일·모레를 채우려면 TideService 를 날짜별로 부르는 작업이 따로 필요하다.
   * 값이 없을 때는 자리를 비우지 말고 아예 감춘다.
   */
  waterNumber: string | null;
  highTides: string[];
}

export interface FishingConditionsResult {
  pointName: string;
  stationName: string | null;
  observedAt: string | null;
  waterTemp: number | null;
  waveHeight: number | null;
  windSpeed: number | null;
  windDirection: string | null;
  sky: string | null;
  precipitationType: string | null;
  precipitationAmount: number | null;
  precipitationProbability: number | null;
  hasLightning: boolean;
  temperature: number | null;
  tideDescription: string | null;
  fishingIndex: string | null;
  tideFlowPhase: TideFlowPhase | null;
  waterNumber: string | null;
  tideEvents: TideEvent[] | null;
  tideSeries: TidePoint[] | null;
  tideStationName: string | null;
  outingStatus: OutingStatus;
  outingWarning: string | null;
  windSourceLabel: string | null;
  windDirectionSourceLabel: string | null;
  temperatureSourceLabel: string | null;
  waterTempSourceLabel: string | null;
  waveHeightSourceLabel: string | null;
  precipitationSourceLabel: string | null;
  skySourceLabel: string | null;
  tideSourceLabel: string | null;
  sunriseTime: string | null;
  sunsetTime: string | null;
  /** 비어 있으면 서버가 null 로 보낸다(빈 배열이 아니다) — 화면에서 블록 자체를 감춘다. */
  hourly: HourlyForecast[] | null;
  daily: DailyForecast[] | null;
}

export interface FishingAnalysisResult {
  results: SpeciesAnalysis[] | null;
  refreshing: boolean;
  analyzedAt: string | null;
}

export async function fetchConditions(id: string): Promise<FishingConditionsResult> {
  const { data } = await api.get(`/fishing-points/${id}/conditions`);
  return data.data as FishingConditionsResult;
}

export async function analyzeFishingPoint(id: string): Promise<FishingAnalysisResult> {
  const { data } = await api.get(`/fishing-points/${id}/analysis`);
  return data.data as FishingAnalysisResult;
}

// ── AI 캐시 스케줄러 Admin API ─────────────────────────────────────────────

/** 스케줄러 실행 상태 + 동작 시간대 (KST, [startHour, endHour) 구간. endHour 24 = 자정) */
export interface AiScheduleStatus {
  running: boolean;
  startHour: number;
  endHour: number;
  /** 동일 포인트를 다시 갱신하기까지의 간격(시간). 1~12 */
  intervalHours: number;
  /** 스케줄러 대상 포인트 수 — 예상 호출량 계산용 */
  pointCount: number;
}

export async function getAiScheduleStatus(): Promise<AiScheduleStatus> {
  const { data } = await api.get('/admin/fish-points/ai-schedule/status');
  return data.data as AiScheduleStatus;
}

/**
 * 스케줄러 시작 — 이미 실행 중이면 서버가 새 설정으로 다시 시작하므로
 * "설정 변경"에도 그대로 쓴다. 끄고 다시 켤 필요 없다.
 */
export async function startAiSchedule(
  startHour: number,
  endHour: number,
  intervalHours: number,
): Promise<void> {
  await api.post('/admin/fish-points/ai-schedule/start', { startHour, endHour, intervalHours });
}

export async function stopAiSchedule(): Promise<void> {
  await api.post('/admin/fish-points/ai-schedule/stop');
}

export async function deletePointAnalysis(id: string): Promise<void> {
  await api.delete(`/admin/fish-points/${id}/analysis`);
}
