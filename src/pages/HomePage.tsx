import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import SpeciesPanel from '../components/fish/SpeciesPanel';
import {
  fetchPublicFishingPointsForMap, fetchConditions, analyzeFishingPoint,
  PROVINCE_OPTIONS, type FishingPointMapMarker,
  type FishingConditionsResult, type FishingAnalysisResult,
  type TideEvent, type TidePoint, TIDE_FLOW_LABELS,
} from '../api/fishingPointApi';
import { useAuth } from '../context/AuthContext';
import { NoticeBoard } from './CommunityPage';
import LoginModal from '../components/common/LoginModal';
import AdSlot from '../components/common/AdSlot';
import { speciesClosedThisMonth } from '../data/fishRegulations';
import { useFishRegulations } from '../hooks/useFishRegulations';
import { getCatchPostsPage, type CatchPostListItem } from '../api/catchPostApi';
import { getFreePostsPage, type FreePostListItem } from '../api/freePostApi';
import { getThisMonthTopCatch, type TopCatch } from '../api/topCatchApi';
import { fetchFishIdQuota, type FishIdQuota } from '../api/fishIdApi';
import { setPostLoginRedirect } from '../lib/postLoginRedirect';
import {
  fetchAllMigratoryFishPointMapMarkers,
  fetchMigratoryFishPointDetail,
  fetchMigratoryPointChannels,
  type MigratoryFishPointMapMarker,
  type MigratoryPointChannelList,
} from '../api/migratoryFishPointApi';
import MapTypeControl from '../components/map/MapTypeControl';
import { HourlyForecastStrip, DailyForecastCard } from '../components/home/ForecastBlocks';
import PointVideoListModal from '../components/map/PointVideoListModal';
import ChannelFilterPanel from '../components/map/ChannelFilterPanel';
import {
  HookIcon, PinIcon, FishIcon, CctvIcon, BanIcon, BookIcon, RulerIcon,
  ThermoIcon, WaveIcon, WindIcon, TideCycleIcon, FlowIcon, SunIcon, SunCloudIcon,
  CloudIcon, RainIcon, SnowIcon, UmbrellaIcon, SunriseIcon, SunsetIcon,
  MoonPhaseIcon, TrophyIcon, BoltIcon, AlertIcon, CameraIcon, CommentIcon, LikeIcon,
  ChevronRightIcon,
} from '../components/common/Icons';
import styles from './HomePage.module.css';

const FISH_META: Record<string, { id: string; colorFrom: string; colorTo: string }> = {
  '광어':   { id: 'flatfish',   colorFrom: '#0077B6', colorTo: '#0096C7' },
  '감성돔': { id: 'blackporgy', colorFrom: '#5A189A', colorTo: '#7B2FBE' },
  '우럭':   { id: 'rockfish',   colorFrom: '#005F73', colorTo: '#0A9396' },
  '농어':   { id: 'seabass',    colorFrom: '#AE2012', colorTo: '#CA6702' },
};


/** 하늘 상태 → 선 아이콘. 강수형태가 있으면 그것이 하늘상태를 이긴다. */
function SkyGlyph({ sky, pty, size = 22 }: { sky: string | null; pty?: string | null; size?: number }) {
  if (pty && pty !== '없음') {
    if (pty === '눈') return <SnowIcon size={size} />;
    return <RainIcon size={size} />;
  }
  if (sky === '맑음') return <SunIcon size={size} />;
  if (sky === '흐림') return <CloudIcon size={size} />;
  return <SunCloudIcon size={size} />;
}

/** 몇 물 → 달 위상(0=조금·그믐, 1=사리·보름). MoonPhaseIcon 에 넣는다. */
function getWaterMoonPhase(waterNumber: string | null | undefined): number {
  if (!waterNumber) return 0.5;
  if (waterNumber === '조금' || waterNumber === '무시') return 0.05;
  if (waterNumber.includes('사리')) return 1;
  const match = waterNumber.match(/^(\d+)물/);
  if (!match) return 0.5;
  const n = parseInt(match[1]);
  if (n <= 2) return 0.3;
  if (n <= 4) return 0.5;
  if (n <= 6) return 0.75;
  return 0.95;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  return `${date} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getWindDesc(windSpeed: number | null | undefined): string | null {
  if (windSpeed == null) return null;
  if (windSpeed <= 1.5) return '실바람 · 낚시하기 편안해요';
  if (windSpeed <= 3.3) return '산들바람 · 낚시하기 딱 좋아요';
  if (windSpeed <= 5.4) return '건들바람 · 채비 컨트롤에 신경 쓰세요';
  if (windSpeed <= 7.9) return '흔들바람 · 캐스팅 거리가 줄어들어요';
  if (windSpeed <= 12)  return '된바람 · 안전에 주의하세요';
  return '강풍 · 안전을 위해 출조 자제 권장';
}

/* ─── 조건 카드 팝업 설명 데이터 ─── */
/** max: 수치형 구간의 상한(이하). 오름차순으로 나열하며 마지막 행은 생략(=무한대). */
type InfoRow = { label: string; desc: string; highlight?: boolean; max?: number };
type ConditionInfoKey = '파고' | '풍속' | '물때' | '조류' | '몇물' | '수온';

const CONDITION_INFO: Record<ConditionInfoKey, { title: string; subtitle: string; rows: InfoRow[] }> = {
  파고: {
    title: '파고 (파도 높이)',
    subtitle: '파도가 높을수록 물이 탁해져 물고기 경계심이 낮아지지만, 너무 높으면 채비 컨트롤이 어렵고 위험해요.',
    rows: [
      { label: '0 ~ 0.3m', desc: '잔잔함 · 물이 맑아 물고기 경계심이 높아져요. 광어·우럭 루어엔 불리하지 않지만 감성돔은 입질 적어요', max: 0.3 },
      { label: '0.3 ~ 0.5m', desc: '약한 파도 · 밑밥·루어 운용 안정적, 광어 등 저부 어종 활동 편함', max: 0.5 },
      { label: '0.5 ~ 0.7m', desc: '적당한 파도 · 채비 흐름이 생겨 루어 액션이 자연스러워요', max: 0.7 },
      { label: '0.7 ~ 1.5m', desc: '보통 파도 · 감성돔·농어 포말·탁도 활용 최고 활성', highlight: true, max: 1.5 },
      { label: '1.5 ~ 2.0m', desc: '강한 파도 · 농어 계속 활발하지만 채비 컨트롤 난이도 증가', max: 2.0 },
      { label: '2.0 ~ 2.5m', desc: '거친 파도 · 갯바위 낚시 위험 구간, 방파제 낚시 주의', max: 2.5 },
      { label: '2.5m 이상', desc: '위험 파도 · 갯바위·방파제 출조 자제 권장 ⚠️' },
    ],
  },
  풍속: {
    title: '풍속 (바람 세기)',
    subtitle: '바람이 약할수록 캐스팅이 쉽고, 강해질수록 루어 비행 거리와 방향 컨트롤이 어려워져요.',
    rows: [
      { label: '0 ~ 1.5 m/s (실바람)', desc: '캐스팅 완벽 · 단 물이 잔잔해 물고기 경계심이 높아질 수 있어요', max: 1.5 },
      { label: '1.5 ~ 3.3 m/s (산들바람)', desc: '낚시 최적 조건 · 적당한 탁도와 쉬운 캐스팅', highlight: true, max: 3.3 },
      { label: '3.3 ~ 5.4 m/s (건들바람)', desc: '루어 컨트롤에 신경 써야 해요 · 채비 흐름이 빨라져요', max: 5.4 },
      { label: '5.4 ~ 7.9 m/s (흔들바람)', desc: '캐스팅 거리 감소, 캐스팅 손실 위험 · 원투 낚시 어려워요', max: 7.9 },
      { label: '7.9 ~ 10.7 m/s (된바람)', desc: '안전에 주의하세요 ⚠️ · 갯바위·방파제 위험 구간', max: 10.7 },
      { label: '10.7 ~ 13.8 m/s (센바람)', desc: '출조 자제 권장 ⚠️ · 캐스팅 거의 불가 수준', max: 13.8 },
      { label: '13.8 m/s 이상 (강풍)', desc: '출조 금지 수준 ⛔ · 생명 안전 위협' },
    ],
  },
  물때: {
    title: '물때 (조석 세기)',
    subtitle: '한 달 동안 조류의 세기가 변하는 주기예요. 음력 15일(보름)·30일(그믐) 전후 사리, 음력 8일·23일 전후 조금이에요.',
    rows: [
      { label: '대조기', desc: '조류가 가장 강한 기간 · 농어·감성돔·돌돔 등 포식성 어종 활성 최고', highlight: true },
      { label: '중조기', desc: '중간 세기 조류 · 대부분의 어종에 무난한 조건, 조류 예민 어종도 어느 정도 반응' },
      { label: '소조기', desc: '조류가 가장 약한 기간 · 조류 의존 어종(농어·감성돔) 입질 감소. 광어·우럭은 비교적 무관' },
    ],
  },
  조류: {
    title: '조류 흐름 (들물·날물)',
    subtitle: '하루 중 바닷물이 들어오고 나가는 방향이에요. 조류가 흐를 때 물고기 먹이 활동이 활발해져요.',
    rows: [
      { label: '들물 본 때', desc: '바닷물이 밀려오는 가장 활발한 시간 · 농어·감성돔 최고 조황 기대', highlight: true },
      { label: '막들물', desc: '만조 1~2시간 전 · 조류가 서서히 느려지는 중, 입질이 점점 줄어드는 구간' },
      { label: '만조 전환기', desc: '물이 가장 높고 조류가 멈추는 구간 · 일시적 입질 공백, 수면이 높아 포인트 접근 주의' },
      { label: '날물 본 때', desc: '바닷물이 빠져나가는 가장 활발한 시간 · 높은 조황 기대', highlight: true },
      { label: '막끝물', desc: '간조 1~2시간 전 · 조류가 서서히 느려지는 중, 입질이 점점 줄어드는 구간' },
      { label: '간조 전환기', desc: '물이 가장 낮고 조류가 멈추는 구간 · 일시적 입질 공백, 수심 얕아져 밑걸림 주의' },
      { label: '정보 없음', desc: '조석 데이터를 불러오지 못한 상태 · 조류 방향 판단 불가, 직접 현장 확인 권장' },
    ],
  },
  몇물: {
    title: '몇 물 (음력 물때)',
    subtitle: '사리(가장 강함) 이후 숫자가 커지며 약해지고, 조금(가장 약함) 이후 1물부터 다시 강해져요. 동·남해는 8물때식(8물=사리), 서해는 7물때식(7물=사리)이에요.',
    rows: [
      { label: '7물(사리)', desc: '서해 조류 최대 · 서해안 기준 조차가 가장 큰 날. 포식성 어종 최고 활성', highlight: true },
      { label: '8물(사리)', desc: '동·남해 조류 최대 · 조차가 가장 큰 날. 포식성 어종 최고 활성, 최고의 조황 기대', highlight: true },
      { label: '9물', desc: '사리 직후 · 조류가 여전히 강한 편. 포식성 어종 활성 아직 높음' },
      { label: '10물', desc: '사리 이후 조류가 점차 약해지는 단계 · 중간 이상 세기 유지' },
      { label: '11물', desc: '조류 세기 중간 · 조황 평균 수준' },
      { label: '12물', desc: '조류가 많이 약해지는 구간 · 조황 기대 낮아지기 시작' },
      { label: '13물', desc: '조금을 앞두고 조류가 많이 약해진 단계 · 서해는 조금 전날' },
      { label: '14물', desc: '동·남해 전용 · 조금 전날 · 조류가 거의 멈추기 직전' },
      { label: '조금', desc: '조류가 가장 약한 날 · 물이 거의 흐르지 않아 베이트 이동 없음. 조류 의존 어종 입질 최저' },
      { label: '무시', desc: '서해 전용 · 조금 다음날, 1물 전날 · 조류가 거의 멈춘 상태. 조금과 비슷한 조건으로 조황 기대 낮아요' },
      { label: '1물', desc: '조금 직후(동·남해) 또는 무시 다음날(서해) · 조류가 아주 약하게 흐르기 시작하는 단계' },
      { label: '2물', desc: '조류가 조금씩 강해지는 중 · 아직 약한 편이지만 베이트 이동이 조금씩 시작돼요' },
      { label: '3물', desc: '조류가 점점 강해지는 중 · 일부 어종 입질이 살아나기 시작하는 구간' },
      { label: '4물', desc: '중간 세기 조류 · 대부분 어종에 무난한 조건, 조황 평균 이상 기대' },
      { label: '5물', desc: '중간 세기 조류 · 조류가 계속 강해지는 과정' },
      { label: '6물', desc: '중간~강한 세기 조류 · 먹이 이동이 활발해져 다양한 어종 입질 기대' },
      { label: '7물', desc: '동·남해에서 사리 전날 · 강한 조류 시작, 농어·감성돔·돌돔 활성 높음', highlight: true },
    ],
  },
  수온: {
    title: '수온 (물 온도)',
    subtitle: '각 어종마다 선호하는 수온 범위가 달라요. 수온이 적정 범위를 벗어나면 활성이 떨어지고 입질이 줄어들어요.',
    rows: [
      { label: '5℃ 이하', desc: '극저수온 · 거의 모든 어종 활성 최저, 깊은 곳으로 이동해 연안 낚시 매우 어려움', max: 5 },
      { label: '5 ~ 10℃', desc: '저수온 · 대부분 어종 활성 감소. 감성돔은 한겨울 패턴으로 깊은 곳 공략 필요', max: 10 },
      { label: '10 ~ 15℃', desc: '봄 초반·초겨울 · 감성돔·우럭 서서히 회복 시작, 광어는 연안 진출 중', max: 15 },
      { label: '15 ~ 20℃', desc: '봄~초여름 · 감성돔·우럭·광어 최적 활성 시작', highlight: true, max: 20 },
      { label: '20 ~ 26℃', desc: '수온 상승기로 어종별 선호 수심 편차가 커짐', highlight: true, max: 26 },
      { label: '26 ~ 28℃', desc: '고수온 초입 · 농어는 여전히 활발, 감성돔은 심층 이동 시작', max: 28 },
      { label: '28℃ 이상', desc: '고수온 · 감성돔 연안 활성 대폭 저하, 일부 어종 심층 이동. 야간 농어 여전히 활발' },
    ],
  },
};

/**
 * 현재 포인트의 수치가 어느 구간에 해당하는지 찾는다.
 * @returns 해당 행의 인덱스와 배지 문구. 값이 없거나 일치 구간이 없으면 null
 */
function findCurrentRow(
  key: ConditionInfoKey,
  c: FishingConditionsResult | null,
): { index: number; text: string } | null {
  if (!c) return null;
  const rows = CONDITION_INFO[key].rows;

  // 수치형: 오름차순 구간의 상한(max)과 비교 — 경계값은 아래쪽 구간에 포함
  const byBand = (v: number | null | undefined, text: string) => {
    if (v == null) return null;
    const index = rows.findIndex((r) => v <= (r.max ?? Infinity));
    return index < 0 ? null : { index, text };
  };
  // 문자형: 라벨 일치
  const byLabel = (label: string | null, text: string, contains = false) => {
    if (!label) return null;
    const index = rows.findIndex((r) => (contains ? label.includes(r.label) : r.label === label));
    return index < 0 ? null : { index, text };
  };

  switch (key) {
    case '수온': return byBand(c.waterTemp, `현재 ${c.waterTemp}℃`);
    case '파고': return byBand(c.waveHeight, `현재 ${c.waveHeight}m`);
    case '풍속': return byBand(c.windSpeed, `현재 ${c.windSpeed}m/s`);
    case '물때': return byLabel(c.tideDescription, '오늘', true);
    case '몇물': return byLabel(c.waterNumber, '오늘');
    case '조류': return byLabel(
      c.tideFlowPhase ? (c.tideFlowPhase === 'UNKNOWN' ? '정보 없음' : TIDE_FLOW_LABELS[c.tideFlowPhase]) : null,
      '지금',
    );
  }
  return null;
}

type PointGroup = { code: string; displayName: string; points: FishingPointMapMarker[] };

export default function HomePage() {
  const { isLoggedIn, isAdmin } = useAuth();
  /** 오늘 남은 판별 횟수 — 진입 카드의 배지에만 쓴다. 실패하면 배지를 그리지 않는다. */
  const [fishIdQuota, setFishIdQuota] = useState<FishIdQuota | null>(null);
  const navigate = useNavigate();
  // 오늘 금어기인 어종 수. 정적 데이터라 매 렌더 계산해도 부담이 없다.
  useFishRegulations(); // 서버 규제 도착 시 리렌더 — 아래 계산이 새 값을 읽는다
  const closedThisMonthCount = speciesClosedThisMonth().length;
  const [loginToast, setLoginToast] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  /* 시/도 드롭다운을 없앴다 — 포인트 셀렉트 하나에 시/도별 optgroup 으로 담는다.
     포인트가 한 번에 다 로드되므로 지도에서 고른 포인트의 시/도 역추적도 필요 없다. */
  const [pointGroups, setPointGroups] = useState<PointGroup[]>([]);
  const [selectedPointId, setSelectedPointId] = useState('');
  /** 계기판(수온·파고·풍속…) 묶음 — 포인트를 고르면 여기까지 내려 준다 */
  const dashPanelRef = useRef<HTMLDivElement>(null);

  const [pointsError, setPointsError] = useState('');
  const [pointsLoading, setPointsLoading] = useState(true);

  const [isConditionsLoading, setIsConditionsLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [conditionsResult, setConditionsResult] = useState<FishingConditionsResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<FishingAnalysisResult | null>(null);
  const [analysisRefreshing, setAnalysisRefreshing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);
  const [activeInfoKey, setActiveInfoKey] = useState<ConditionInfoKey | null>(null);
  const handleInfoClick = useCallback((key: ConditionInfoKey) => setActiveInfoKey(key), []);
  const handleInfoClose = useCallback(() => setActiveInfoKey(null), []);

  // 이번 주 조황 지도 모달
  const [migratoryMapOpen, setMigratoryMapOpen] = useState(false);
  const [allPointsMapOpen, setAllPointsMapOpen] = useState(false);
  const [boardTab, setBoardTab] = useState<'catch' | 'free'>('catch');
  const [catchPostsPreview, setCatchPostsPreview] = useState<CatchPostListItem[]>([]);
  const [freePostsPreview, setFreePostsPreview] = useState<FreePostListItem[]>([]);
  const [topCatch, setTopCatch] = useState<TopCatch | null>(null);

  /* 포인트 좌표(/fishing-points/by-province)는 인증이 필요한 API다.
     비로그인 상태로 부르면 전 지역이 401로 떨어져 "불러오지 못했습니다"가 뜨는데,
     그건 장애가 아니라 로그인을 안 한 것뿐이다. 그래서 아예 부르지 않고,
     선택 바 자리에 로그인 안내를 놓는다. 로그인하면 이 훅이 다시 돈다. */
  useEffect(() => {
    if (!isLoggedIn) {
      setPointGroups([]);
      setSelectedPointId('');
      setPointsError('');
      setPointsLoading(false);
      return;
    }
    setPointsLoading(true);
    setPointsError('');
    let cancelled = false;
    (async () => {
      try {
        // 예전에는 시/도마다 한 번씩 17번을 불렀다. 받는 데이터는 같은데 요청과
        // 쿼리만 17개였고, 새로고침마다 되풀이됐다. 전량을 한 번에 받아
        // 여기서 묶는다. 서버는 이 응답에 5분짜리 캐시 헤더를 달아 보내므로
        // 연속 새로고침은 서버까지 오지도 않는다.
        const markers = await fetchPublicFishingPointsForMap();
        if (cancelled) return;

        const byProvince = new Map<string, FishingPointMapMarker[]>();
        for (const m of markers) {
          const bucket = byProvince.get(m.province);
          if (bucket) bucket.push(m);
          else byProvince.set(m.province, [m]);
        }
        // optgroup 순서는 서버 enum 순서(PROVINCE_OPTIONS)를 따른다 —
        // 응답에 실려 오는 순서에 화면 순서를 맡기지 않는다.
        const groups: PointGroup[] = PROVINCE_OPTIONS
          .map(([code, displayName]) => ({
            code,
            displayName,
            points: byProvince.get(code) ?? [],
          }))
          .filter((g) => g.points.length > 0);

        // 백엔드가 province 를 아직 안 실어 보내는 동안(프론트가 먼저 배포된 순간)
        // 묶기만 실패하고 데이터는 멀쩡하다. 그럴 때 빈 목록을 보여 주느니
        // 한 덩어리로라도 고를 수 있게 둔다.
        if (groups.length === 0 && markers.length > 0) {
          setPointGroups([{ code: 'ALL', displayName: '전체', points: markers }]);
        } else {
          setPointGroups(groups);
          if (groups.length === 0) setPointsError('등록된 낚시 포인트가 없습니다.');
        }
      } catch {
        // 예전에는 실패를 빈 배열로 삼켜서 select 만 조용히 잠겼다.
        if (!cancelled) {
          setPointsError('낚시 포인트 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      } finally {
        if (!cancelled) setPointsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isLoggedIn]);

  useEffect(() => {
    getCatchPostsPage({ page: 0, size: 5 }).then(r => setCatchPostsPreview(r.content)).catch(() => {});
    getFreePostsPage(0, 5).then(r => setFreePostsPreview(r.content)).catch(() => {});
    getThisMonthTopCatch().then(setTopCatch).catch(() => {});
  }, []);

  // 지도 팝업 → 메인 페이지 포인트 수신. 전체 포인트가 이미 로드돼 있어 그대로 고르면 된다.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'fishing-point-selected' && event.data.pointId) {
        setSelectedPointId(event.data.pointId as string); // 즉시 분석 시작
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!selectedPointId) {
      setConditionsResult(null);
      setAnalysisResult(null);
      return;
    }
    if (!isLoggedIn) {
      setSelectedPointId('');
      setLoginToast(true);
      setTimeout(() => {
        setLoginToast(false);
        navigate('/login');
      }, 1500);
      return;
    }

    setConditionsResult(null);
    setAnalysisResult(null);
    setIsConditionsLoading(true);
    setIsAnalysisLoading(false);
    setAnalysisError('');
    setAnalysisRefreshing(false);
    setExpandedSpecies(null);

    let cancelled = false;

    async function run() {
      try {
        // 1단계: 조건 데이터 먼저 (빠름)
        const conditions = await fetchConditions(selectedPointId);
        if (cancelled) return;
        setConditionsResult(conditions);
        setIsConditionsLoading(false);

        // 2단계: 조건 완료 후 AI 분석 시작 (느림)
        setIsAnalysisLoading(true);
        const analysis = await analyzeFishingPoint(selectedPointId);
        if (cancelled) return;
        if (analysis?.refreshing) {
          setAnalysisRefreshing(true);
          setAnalysisResult(null);
          setIsAnalysisLoading(false);

          // 30초 후 1회 재시도
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, 30000);
            const check = () => { if (cancelled) { clearTimeout(t); resolve(); } };
            const id = setInterval(check, 200);
            setTimeout(() => clearInterval(id), 30500);
          });
          if (cancelled) return;

          const retry = await analyzeFishingPoint(selectedPointId);
          if (cancelled) return;
          if (retry?.refreshing) {
            setAnalysisRefreshing(false);
            setAnalysisError('AI 분석 준비에 시간이 걸리고 있습니다. 잠시 후 포인트를 다시 선택해 주세요.');
          } else {
            setAnalysisRefreshing(false);
            setAnalysisResult(retry);
          }
        } else {
          setAnalysisRefreshing(false);
          setAnalysisResult(analysis);
        }
      } catch (err: any) {
        if (cancelled) return;
        setAnalysisError(err?.response?.data?.message ?? '분석 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) {
          setIsConditionsLoading(false);
          setIsAnalysisLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  }, [selectedPointId, isLoggedIn]);

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 기준`;

  const isAnalyzing = isConditionsLoading || isAnalysisLoading;

  const hasPrecip = conditionsResult?.precipitationType && conditionsResult.precipitationType !== '없음';

  /** 로그인 필요한 진입 공통 게이트 — 퀵 메뉴에서 쓴다. */
  /* 남은 판별 횟수. 홈은 비로그인도 열리므로 로그인 상태에서만 부른다.
     실패는 삼킨다 — 배지 하나 때문에 홈에 에러를 띄울 이유가 없다. */
  useEffect(() => {
    if (!isLoggedIn) {
      setFishIdQuota(null);
      return;
    }
    let alive = true;
    fetchFishIdQuota()
      .then((q) => { if (alive) setFishIdQuota(q); })
      .catch(() => { if (alive) setFishIdQuota(null); });
    return () => { alive = false; };
  }, [isLoggedIn]);

  /**
   * 사진 어종판별 진입.
   *
   * 다른 퀵메뉴와 달리 로그인 모달을 띄우지 않고 **로그인 화면으로 보낸다.**
   * 판별은 계정당 하루 횟수를 깎고 사용자의 한 뼘(기준자)을 쓰기 때문에
   * 비로그인으로는 한 걸음도 못 간다 — 모달에서 닫으면 제자리인 것보다,
   * 로그인 화면에서 끝내고 원래 자리로 돌아오는 편이 짧다.
   */
  /** 로그인 화면으로 보내고, 끝나면 이 자리로 돌려보낸다. */
  const goLogin = (back = '/') => {
    setPostLoginRedirect(back);
    navigate('/login');
  };

  const openFishId = () => {
    if (!isLoggedIn) {
      setPostLoginRedirect('/fish-id');
      navigate('/login');
      return;
    }
    navigate('/fish-id');
  };

  /* 포인트를 고르면 계기판이 보이는 자리까지 내려 준다.
     지도 핀으로 고른 경우 화면은 그대로 히어로에 머물러 있어서,
     "골랐는데 아무 일도 안 일어났다"로 읽힌다. 결과가 있는 곳으로 데려다 준다. */
  useEffect(() => {
    if (!selectedPointId) return;
    const el = dashPanelRef.current;
    if (!el) return;

    // 헤더가 fixed 라 그 높이만큼 빼야 계기판 제목이 가려지지 않는다.
    const headerH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height'),
        10,
      ) || 64;
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;

    // 이미 그만큼 내려와 있으면 건드리지 않는다 — 읽던 자리를 뺏지 않는다.
    if (window.scrollY >= top - 4) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [selectedPointId]);

  const requireLogin = (run: () => void) => {
    if (!isLoggedIn) {
      setLoginToast(true);
      setTimeout(() => setLoginToast(false), 2000);
      setLoginModalOpen(true);
      return;
    }
    run();
  };

  return (
    <div className={styles.page}>
      <Header onDark />
      {loginToast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--color-primary)', color: '#fff', borderRadius: 12,
          padding: '14px 28px', fontSize: 15, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 300,
          whiteSpace: 'nowrap',
        }}>
          로그인 후 이용 가능한 서비스입니다
        </div>
      )}

      <main className={styles.main}>
        {/* ─── Hero ─── */}
        <section className={styles.hero}>
          {/* 상단 딥블루 밴드 — 헤더와 이어지는 색면.
              높이를 CSS 로 고정하거나 JS 로 재지 않고 **내용이 정하게** 둔다.
              포인트 이름이 길어 칩이 두 줄이 되거나 에러 배너가 떠도 곡선이 따라온다. */}
          <div className={styles.heroBandWrap}>
            <div className={styles.heroBand}>
              <div className={styles.heroInner}>
            {topCatch?.hasData && (
              <button
                className={styles.topCatchBanner}
                onClick={() => {
                  if (!isLoggedIn) {
                    setLoginToast(true);
                    setTimeout(() => {
                      setLoginToast(false);
                      navigate('/login');
                    }, 1500);
                    return;
                  }
                  navigate(
                    '/catch-posts',
                    { state: { openPostId: topCatch.postId } }
                  );
                }}
              >
                <span className={styles.topCatchBannerShimmer} />
                <span className={styles.topCatchTrophy}><TrophyIcon size={16} strokeWidth={2} /></span>
                <span className={styles.topCatchLabel}>이번 달 최대어</span>
                <span className={styles.topCatchDivider} />
                <span className={styles.topCatchNickname}>{topCatch.authorNickname}</span>
                <span className={styles.topCatchSize}>{topCatch.fishSizeCm}cm</span>
              </button>
            )}

            <h1 className={styles.heroTitle}>
              낚시 포인트
              <br />
              <span className={styles.heroAccent}>AI 조황 분석</span> 서비스
            </h1>
            <p className={styles.heroDesc}>
              낚시 포인트 별 환경을 실시간으로 분석하여<br />
              정보 제공 및 조황 기대도를 AI가 분석합니다.
            </p>

            {/* 포인트 선택 — 시/도 드롭다운 없이 한 번에 고른다(시/도는 optgroup) */}
            {isLoggedIn && pointsError && <div className={styles.errorBanner}>{pointsError}</div>}
            <div className={styles.locationBar}>
              <span className={styles.locationIcon}><PinIcon size={17} strokeWidth={2} /></span>
              {isLoggedIn ? (
                <select className={styles.locationSelect} value={selectedPointId}
                  onChange={(e) => setSelectedPointId(e.target.value)}
                  disabled={pointsLoading || pointGroups.length === 0}>
                  <option value="">
                    {pointsLoading ? '포인트 불러오는 중...' : pointsError ? '서버 연결 실패' : '낚시 포인트 선택'}
                  </option>
                  {pointGroups.map((g) => (
                    <optgroup key={g.code} label={g.displayName}>
                      {g.points.map((fp) => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              ) : (
                /* 잠긴 select 는 눌러도 아무 일이 없어 고장으로 읽힌다.
                   같은 자리·같은 모양의 버튼으로 바꿔 로그인 화면으로 보낸다. */
                <button type="button" className={styles.locationLoginBtn}
                  onClick={() => goLogin('/')}>
                  로그인하고 포인트 고르기
                </button>
              )}
              <button className={styles.mapBtn}
                onClick={() => {
                  if (!isLoggedIn) { goLogin('/'); return; }
                  window.open('/map', 'kakaomap', 'width=900,height=680,resizable=yes');
                }}>
                지도 보기
              </button>
            </div>

            {(isAnalyzing || conditionsResult) ? (
              <div className={styles.currentPointChip}>
                {conditionsResult?.pointName ?? (isAnalyzing ? '분석 중...' : '')}
              </div>
            ) : (
              <p className={styles.selectPrompt}>
                {isLoggedIn
                  ? '낚시 포인트를 선택하거나, 지도에서 핀을 클릭하세요.'
                  : '로그인하면 전국 낚시 포인트와 AI 조황 분석을 볼 수 있습니다.'}
              </p>
            )}
              </div>
            </div>
          </div>

          {/* 밴드 아래 — 밝은 바탕 위의 흰 카드들 */}
          <div className={styles.heroRest}>
            <div className={styles.heroInner}>


            {/* 사진 어종판별 진입 — 퀵메뉴 타일 하나로는 묻혀서 전용 카드로 뺐다.
                자리는 앱(home_page.dart 의 _FishIdCtaCard)과 같게 맞춘다.
                바로 위 "지도 보기"가 채운 딥블루라, 여기는 틴트로 톤을 낮춰 서로 안 싸우게 한다. */}
            <button
              type="button"
              className={styles.fishIdCta}
              onClick={openFishId}
            >
              <span className={styles.fishIdCtaIcon}><CameraIcon size={24} /></span>
              <span className={styles.fishIdCtaBody}>
                <span className={styles.fishIdCtaTitleRow}>
                  <span className={styles.fishIdCtaTitle}>사진으로 어종 판별</span>
                  {isLoggedIn && fishIdQuota && !fishIdQuota.unlimited && (
                    <span
                      className={`${styles.fishIdCtaBadge} ${
                        fishIdQuota.remaining === 0 ? styles.fishIdCtaBadgeOut : ''
                      }`}
                    >
                      {fishIdQuota.remaining === 0
                        ? '오늘 소진'
                        : `${fishIdQuota.remaining}회 남음`}
                    </span>
                  )}
                </span>
                <span className={styles.fishIdCtaDesc}>가져가도 되는 크기인지 바로 확인</span>
              </span>
              <span className={styles.fishIdCtaChevron}><ChevronRightIcon size={20} /></span>
            </button>

            {/* 서비스 퀵 메뉴 — 기존의 큰 진입 카드들(어종 현황·어종 포인트·CCTV·
                금지구역·가이드·금어기·채비)을 아이콘 바 하나로 압축했다.
                홈이 계기판에 집중하도록 세로 길이를 줄이는 것이 목적. */}
            <div className={styles.quickNavBox}>
            <div className={styles.quickNavTitle}>바로가기</div>
            <div className={styles.quickNav}>
              <button type="button" className={styles.quickItem}
                onClick={() => requireLogin(() => setMigratoryMapOpen(true))}>
                <span className={styles.quickIcon}><FishIcon size={20} /></span>
                <span className={styles.quickLabel}>어종 현황</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => requireLogin(() => setAllPointsMapOpen(true))}>
                <span className={styles.quickIcon}><PinIcon size={20} /></span>
                <span className={`${styles.quickLabel} ${styles.quickLabelWrap}`}>모든 낚시 포인트<br />&amp; 유튜버 포인트</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => requireLogin(() => window.open('/map/cctv', 'cctvmap', 'width=900,height=680,resizable=yes'))}>
                <span className={styles.quickIcon}><CctvIcon size={20} /></span>
                <span className={styles.quickLabel}>CCTV</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => requireLogin(() => window.open('/map/fishing-zones', 'fishingzones', 'width=900,height=680,resizable=yes'))}>
                <span className={styles.quickIcon}><BanIcon size={20} /></span>
                <span className={styles.quickLabel}>금지구역</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => navigate('/regulations')}>
                <span className={styles.quickIcon}>
                  <RulerIcon size={20} />
                  {closedThisMonthCount > 0 && (
                    <span className={styles.quickBadge}>{closedThisMonthCount}</span>
                  )}
                </span>
                <span className={styles.quickLabel}>금어기</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => navigate('/tackle')}>
                <span className={styles.quickIcon}><HookIcon size={20} /></span>
                <span className={styles.quickLabel}>루어 채비</span>
              </button>
              <button type="button" className={styles.quickItem}
                onClick={() => navigate('/guide')}>
                <span className={styles.quickIcon}><BookIcon size={20} /></span>
                <span className={styles.quickLabel}>낚시 가이드</span>
              </button>
            </div>
            </div>

            {/* 계기판 묶음 — 흰 페이지 위에서 이 묶음만 딥 네이비 패널로 포인트를 준다 */}
            <div className={styles.dashPanel} ref={dashPanelRef}>
            <div className={styles.dashPanelTitle}>
              {conditionsResult?.pointName ? `${conditionsResult.pointName} · 현재 조건` : '현재 조건'}
            </div>

            {/* 조건 카드 그리드 */}
            <div className={styles.conditionCards}>
              <ConditionCard icon={<ThermoIcon size={22} strokeWidth={2} />} label="수온" loading={isConditionsLoading}
                value={conditionsResult?.waterTemp != null ? `${conditionsResult.waterTemp}℃` : null}
                source={conditionsResult?.waterTempSourceLabel}
                infoKey="수온" onInfoClick={handleInfoClick} />
              <ConditionCard icon={<WaveIcon size={22} strokeWidth={2} />} label="파고" loading={isConditionsLoading}
                value={conditionsResult?.waveHeight != null ? `${conditionsResult.waveHeight}m` : null}
                source={conditionsResult?.waveHeightSourceLabel}
                infoKey="파고" onInfoClick={handleInfoClick} />
              <ConditionCard icon={<WindIcon size={22} strokeWidth={2} />} label="풍속" loading={isConditionsLoading}
                value={conditionsResult?.windSpeed != null ? `${conditionsResult.windSpeed}m/s` : null}
                desc={getWindDesc(conditionsResult?.windSpeed)}
                source={conditionsResult?.windSourceLabel}
                infoKey="풍속" onInfoClick={handleInfoClick} />
              {/* <WindDirectionCard direction={conditionsResult?.windDirection ?? null} loading={isConditionsLoading}
                source={conditionsResult?.windDirectionSourceLabel} /> */}
              <ConditionCard icon={<TideCycleIcon size={22} strokeWidth={2} />} label="물때" loading={isConditionsLoading}
                value={conditionsResult?.tideDescription ?? null}
                source={conditionsResult?.tideSourceLabel}
                infoKey="물때" onInfoClick={handleInfoClick} />
              <ConditionCard icon={<FlowIcon size={22} strokeWidth={2} />} label="조류" loading={isConditionsLoading}
                value={conditionsResult?.tideFlowPhase
                  ? TIDE_FLOW_LABELS[conditionsResult.tideFlowPhase]
                  : null}
                source={conditionsResult?.tideSourceLabel}
                infoKey="조류" onInfoClick={handleInfoClick} />
              <ConditionCard
                icon={<SkyGlyph sky={conditionsResult?.sky ?? null} />}
                label="하늘"
                loading={isConditionsLoading}
                value={conditionsResult?.sky ?? null}
                source={conditionsResult?.skySourceLabel}
              />
              <ConditionCard icon={<SunIcon size={22} strokeWidth={2} />} label="기온" loading={isConditionsLoading}
                value={conditionsResult?.temperature != null ? `${conditionsResult.temperature}℃` : null}
                source={conditionsResult?.temperatureSourceLabel} />
              <WaterNumberCard
                waterNumber={conditionsResult?.waterNumber ?? null}
                loading={isConditionsLoading}
                source={conditionsResult?.tideSourceLabel}
                onInfoClick={handleInfoClick}
              />
              <ConditionCard
                icon={hasPrecip
                  ? <SkyGlyph sky={null} pty={conditionsResult?.precipitationType} />
                  : <UmbrellaIcon size={22} strokeWidth={2} />}
                label="강수량"
                loading={isConditionsLoading}
                value={conditionsResult == null ? null : (
                  hasPrecip
                    ? `${conditionsResult.precipitationType} ${conditionsResult.precipitationAmount != null ? `${conditionsResult.precipitationAmount}mm` : '0mm'}`
                    : `${conditionsResult.precipitationAmount ?? 0}mm`
                )}
                source={conditionsResult?.precipitationSourceLabel}
              />
            </div>

            {/* 낙뢰 경고 */}
            {conditionsResult?.hasLightning && (
              <div className={styles.lightningBanner}>
                <BoltIcon size={15} strokeWidth={2} /> 낙뢰 감지 — 즉시 안전한 곳으로 대피하세요
              </div>
            )}

            {/* 일출/일몰 */}
            {(isConditionsLoading || conditionsResult) && (
              <div className={styles.sunRow}>
                <div className={styles.sunItem}>
                  <span className={styles.sunIcon}><SunriseIcon size={20} /></span>
                  <span className={styles.sunLabel}>일출</span>
                  {isConditionsLoading
                    ? <span className={styles.sunSkeleton} />
                    : <span className={styles.sunTime}>{conditionsResult?.sunriseTime ?? '—'}</span>}
                </div>
                <div className={styles.sunDivider} />
                <div className={styles.sunItem}>
                  <span className={styles.sunIcon}><SunsetIcon size={20} /></span>
                  <span className={styles.sunLabel}>일몰</span>
                  {isConditionsLoading
                    ? <span className={styles.sunSkeleton} />
                    : <span className={styles.sunTime}>{conditionsResult?.sunsetTime ?? '—'}</span>}
                </div>
              </div>
            )}

            {/* 시간별 예보 — 앞으로 6시간. 위 계기 타일이 "지금"을 맡으므로 여기는 미래만 담는다.
                데이터가 없으면 컴포넌트가 스스로 아무것도 그리지 않는다. */}
            <HourlyForecastStrip items={conditionsResult?.hourly ?? null} />

            {/* 조석 그래프 — 조건 로딩 중이거나 결과 있으면 표시 */}
            {(isConditionsLoading || conditionsResult) && (
              <TideChart
                events={conditionsResult?.tideEvents ?? null}
                series={conditionsResult?.tideSeries ?? null}
                stationName={conditionsResult?.tideStationName ?? null}
                sunriseTime={conditionsResult?.sunriseTime ?? null}
                sunsetTime={conditionsResult?.sunsetTime ?? null}
                loading={isConditionsLoading}
              />
            )}

            {/* 오늘–모레 단기예보 — 기본 접힘. 오늘 못 나갈 때 "그럼 언제?" 를 여기서 본다.
                조석 다음에 두는 이유는, 오늘 판단이 끝난 뒤에 보는 정보이기 때문이다. */}
            <DailyForecastCard items={conditionsResult?.daily ?? null} />

            </div>

            </div>
          </div>
        </section>

        {/* ─── 출조 경고 배너 ─── */}
        {conditionsResult?.outingStatus !== 'SAFE' && conditionsResult?.outingWarning && (
          <div className={`${styles.outingBanner} ${conditionsResult.outingStatus === 'IMPOSSIBLE' ? styles.outingImpossible : styles.outingCaution}`}>
            <span className={styles.outingIcon}>
              {conditionsResult.outingStatus === 'IMPOSSIBLE'
                ? <BanIcon size={20} strokeWidth={2} />
                : <AlertIcon size={20} strokeWidth={2} />}
            </span>
            <span>{conditionsResult.outingWarning}</span>
          </div>
        )}

        {/* ─── 어종별 조황 기대도 ───
            AI 응답이 있을 때(또는 분석 중·재시도·오류·출조불가처럼 상태를 알려야 할 때)만 그린다.
            포인트를 고르기 전에는 빈 칸으로 자리만 차지하지 않도록 섹션 자체를 숨긴다. */}
        {selectedPointId && (
          isAnalysisLoading || analysisRefreshing || analysisError
          || conditionsResult?.outingStatus === 'IMPOSSIBLE'
          || (analysisResult?.results && analysisResult.results.length > 0)
        ) && (
        <section className={styles.section}>
          <div className={`${styles.sectionInner} ${styles.narrowInner}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>어종별 조황 기대도</h2>
              <div className={styles.sectionSubWrap}>
                {conditionsResult && (
                  <span className={styles.sectionPointName}>{conditionsResult.pointName}</span>
                )}
                <span className={styles.sectionSub}>{timeStr}</span>
              </div>
            </div>

            {analysisError && <div className={styles.errorBanner}>{analysisError}</div>}

            {conditionsResult?.outingStatus === 'IMPOSSIBLE' ? (
              <div className={styles.impossibleBox}>
                <span className={styles.impossibleIcon}><BanIcon size={44} strokeWidth={1.6} /></span>
                <p className={styles.impossibleTitle}>출조 불가 조건</p>
                <p className={styles.impossibleDesc}>현재 기상 조건이 위험 수준입니다. 어종 점수 분석이 제공되지 않습니다.</p>
              </div>
            ) : (
              <>
                <SpeciesPanel
                  results={analysisResult?.results ?? null}
                  loading={isAnalysisLoading}
                  onPick={(species) => {
                    if (!analysisResult?.results) return;
                    const next = expandedSpecies === species ? null : species;
                    setExpandedSpecies(next);
                    if (next) {
                      setTimeout(() => {
                        document.getElementById(`reason-${next}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 50);
                    }
                  }}
                />
                {isAnalysisLoading && (
                  <div className={styles.analyzingBanner}>
                    <div className={styles.analyzingSpinner} />
                    AI가 조황을 분석하고 있습니다...
                  </div>
                )}
                {!isAnalysisLoading && analysisRefreshing && selectedPointId && (
                  <div className={styles.refreshingBanner}>
                    <div className={styles.analyzingSpinner} />
                    AI 조황 분석을 준비 중입니다. 20초 후 자동으로 재시도합니다.
                  </div>
                )}
              </>
            )}
          </div>
        </section>
        )}

        {/* ─── AI 상세 분석 ─── */}
        {analysisResult?.results && analysisResult.results.length > 0 && (
          <section className={`${styles.section} ${styles.sectionAlt}`}>
            <div className={`${styles.sectionInner} ${styles.narrowInner}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>AI 분석 이유</h2>
                <span className={styles.sectionSub}>어종별 조황 근거 — 클릭하여 펼치기</span>
              </div>

              <div className={styles.reasonGrid}>
                {analysisResult.results.map((r) => (
                  <div key={r.species}
                    id={`reason-${r.species}`}
                    className={`${styles.reasonCard} ${expandedSpecies === r.species ? styles.reasonCardActive : ''}`}
                    style={{ borderLeftColor: FISH_META[r.species]?.colorFrom ?? '#334155' }}
                    onClick={() => setExpandedSpecies(expandedSpecies === r.species ? null : r.species)}>
                    <div className={styles.reasonHeader}>
                      <span className={styles.reasonSpecies} style={{ color: FISH_META[r.species]?.colorFrom ?? '#334155' }}>
                        {r.species}
                      </span>
                      {r.summary && <span className={styles.reasonSummary}>{r.summary}</span>}
                      <span className={styles.reasonScore}>{r.score}점</span>
                      <span className={styles.reasonToggle}>{expandedSpecies === r.species ? '▲' : '▼'}</span>
                    </div>

                    {expandedSpecies === r.species && (
                      <div className={styles.reasonBody}>
                        {r.conditionReason && (
                          <ReasonSection title="현재 상황" text={r.conditionReason} />
                        )}
                        {r.pointReason && (
                          <ReasonSection title="포인트 적합성" text={r.pointReason} />
                        )}
                        {r.strategy && (
                          <ReasonSection title="공략 방향" text={r.strategy} />
                        )}
                        {r.tackle && (
                          <>
                            <ReasonSection title="채비 운용" text={r.tackle} />
                            <div className={styles.tackleShopLink}>
                              <span className={styles.tackleShopLabel}>샌드웍스 링크입니다</span>
                              <a
                                href="https://smartstore.naver.com/daehat?NaPm=ct%3D1jqba9282%7Cci%3Dshopn%7Ctr%3Dmktlnk%7Chk%3D84a6d35bbdeda97b7ef76055cc79a65840af3e29%7Ctrx%3Dundefined"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.tackleShopBtn}
                                onClick={(e) => e.stopPropagation()}
                              >
                                샌드웍스로 바로가기
                              </a>
                            </div>
                          </>
                        )}
                        {r.caution && (
                          <ReasonSection title="주의사항" text={r.caution} />
                        )}
                        {analysisResult?.analyzedAt && (
                          <div className={styles.analyzedAt}>
                            AI 분석 생성: {analysisResult.analyzedAt}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 커뮤니티 미리보기 — 조황/자유 게시판을 탭 하나로 압축 ─── */}
        <section className={styles.section}>
          <div className={`${styles.sectionInner} ${styles.boardInner}`}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>커뮤니티</h2>
              <div className={styles.boardTabs}>
                <button
                  type="button"
                  className={`${styles.boardTab} ${boardTab === 'catch' ? styles.boardTabActive : ''}`}
                  onClick={() => setBoardTab('catch')}
                >
                  조황 게시판
                </button>
                <button
                  type="button"
                  className={`${styles.boardTab} ${boardTab === 'free' ? styles.boardTabActive : ''}`}
                  onClick={() => setBoardTab('free')}
                >
                  자유게시판
                </button>
              </div>
              {isLoggedIn && (
                <button
                  onClick={() => navigate(boardTab === 'catch' ? '/catch-posts' : '/free-posts')}
                  style={{
                    padding: '7px 16px', background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', marginLeft: 'auto',
                  }}
                >
                  글쓰기
                </button>
              )}
            </div>

            {boardTab === 'catch' ? (
              catchPostsPreview.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontSize: 14 }}>
                  아직 등록된 게시글이 없습니다.
                </p>
              ) : (
                <div className={styles.previewList}>
                  {catchPostsPreview.map(item => (
                    <div
                      key={item.id}
                      className={styles.previewCard}
                      onClick={() => navigate('/catch-posts', { state: { openPostId: item.id } })}
                    >
                      <div className={styles.previewMain}>
                        <div className={styles.previewCardTop}>
                          <span className={styles.previewSpeciesBadge}>
                            {item.species.map(sp => sp.name).join('·')}
                          </span>
                          <span className={styles.previewTitle}>{item.title}</span>
                        </div>
                        <div className={styles.previewCardBottom}>
                          {item.pointName
                            ? <span className={styles.previewPointBadge}>{item.pointName}</span>
                            : <span />}
                          <span className={styles.previewAuthor}>{item.authorNickname}</span>
                          {item.photoUrls?.length > 0 && (
                            <span className={styles.previewMetaIcon}><CameraIcon size={13} /></span>
                          )}
                          {(item.commentCount ?? 0) > 0 && (
                            <span className={styles.previewMetaIcon}><CommentIcon size={13} /> {item.commentCount}</span>
                          )}
                          {(item.likeCount ?? 0) > 0 && (
                            <span className={styles.previewMetaIcon}><LikeIcon size={13} /> {item.likeCount}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.previewDates}>
                        <span className={styles.previewDate}>작성일 {formatDateTime(item.createdAt)}</span>
                        <span className={styles.previewWriteDate}>잡은 날짜 {item.caughtAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              freePostsPreview.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontSize: 14 }}>
                  아직 등록된 게시글이 없습니다.
                </p>
              ) : (
                <div className={styles.previewList}>
                  {freePostsPreview.map(item => (
                    <div
                      key={item.id}
                      className={styles.previewCard}
                      onClick={() => navigate('/free-posts', { state: { openPostId: item.id } })}
                    >
                      <div className={styles.previewMain}>
                        <div className={styles.previewCardTop}>
                          <span className={styles.previewTitle}>{item.title}</span>
                        </div>
                        <div className={styles.previewCardBottom}>
                          <span className={styles.previewAuthor}>{item.authorNickname}</span>
                          {item.photoUrls?.length > 0 && (
                            <span className={styles.previewMetaIcon}><CameraIcon size={13} /></span>
                          )}
                          {(item.commentCount ?? 0) > 0 && (
                            <span className={styles.previewMetaIcon}><CommentIcon size={13} /> {item.commentCount}</span>
                          )}
                          {(item.likeCount ?? 0) > 0 && (
                            <span className={styles.previewMetaIcon}><LikeIcon size={13} /> {item.likeCount}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.previewDates}>
                        <span className={styles.previewDate}>작성일 {formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => navigate(boardTab === 'catch' ? '/catch-posts' : '/free-posts')}
                style={{
                  padding: '8px 24px', background: 'transparent',
                  border: '1px solid var(--color-border)', borderRadius: 999,
                  fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                }}
              >
                더보기
              </button>
            </div>
          </div>
        </section>

        {/* ─── 공지사항 게시판 ─── */}
        <section className={styles.section}>
          <div className={`${styles.sectionInner} ${styles.boardInner}`}>
            <NoticeBoard isAdmin={isAdmin} navigateOnClick />
          </div>
        </section>

        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_HOME as string | undefined} />
      </main>

      <ConditionInfoSheet infoKey={activeInfoKey} current={conditionsResult} onClose={handleInfoClose} />
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      {migratoryMapOpen && <MigratoryMapModal onClose={() => setMigratoryMapOpen(false)} />}
      {allPointsMapOpen && <AllMigratoryPointsMapModal onClose={() => setAllPointsMapOpen(false)} />}
    </div>
  );
}

/* ─── 조건 설명 바텀시트 ─── */
function ConditionInfoSheet({ infoKey, current, onClose }: {
  infoKey: ConditionInfoKey | null;
  current: FishingConditionsResult | null;
  onClose: () => void;
}) {
  const info = infoKey ? CONDITION_INFO[infoKey] : null;
  const currentRow = infoKey ? findCurrentRow(infoKey, current) : null;
  const currentRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!infoKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [infoKey, onClose]);

  // 시트가 열리면 현재 구간이 보이도록 스크롤 (바텀시트 등장 애니메이션 이후)
  useEffect(() => {
    if (!infoKey || !currentRow) return;
    const timer = setTimeout(() => {
      currentRowRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 320);
    return () => clearTimeout(timer);
  }, [infoKey, currentRow?.index]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!info) return null;

  return (
    <div className={styles.infoOverlay} onClick={onClose}>
      <div className={styles.infoSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.infoSheetHandle} />
        <div className={styles.infoSheetHeader}>
          <h3 className={styles.infoSheetTitle}>{info.title}</h3>
          <button className={styles.infoSheetCloseIcon} onClick={onClose} aria-label="닫기">✕</button>
        </div>
        <p className={styles.infoSheetSubtitle}>{info.subtitle}</p>
        {currentRow && (
          <div className={styles.infoLegend}>
            <span className={styles.infoLegendItem}>
              <i className={styles.infoLegendDotCurrent} />현재 구간
            </span>
            <span className={styles.infoLegendItem}>
              <i className={styles.infoLegendDotBest} />낚시 적정 구간
            </span>
          </div>
        )}
        <div className={styles.infoRowList}>
          {info.rows.map((row, i) => {
            const isCurrent = currentRow?.index === i;
            return (
              <div
                key={row.label}
                ref={isCurrent ? currentRowRef : undefined}
                className={`${styles.infoRow} ${row.highlight ? styles.infoRowHighlight : ''} ${isCurrent ? styles.infoRowCurrent : ''}`}
              >
                <span className={styles.infoRowLabel}>{row.label}</span>
                <span className={styles.infoRowDesc}>{row.desc}</span>
                {isCurrent && <span className={styles.infoRowCurrentBadge}>{currentRow.text}</span>}
              </div>
            );
          })}
        </div>
        <button className={styles.infoSheetClose} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

/* ─── 조건 카드 ─── */
function ConditionCard({ icon, label, value, loading, className, source, desc, infoKey, onInfoClick }: {
  icon?: React.ReactNode; label: string; value: string | null; loading?: boolean; className?: string;
  source?: string | null; desc?: string | null;
  infoKey?: ConditionInfoKey; onInfoClick?: (key: ConditionInfoKey) => void;
}) {
  const clickable = !!infoKey && !!onInfoClick;
  return (
    <div
      className={`${styles.conditionCard} ${loading ? styles.conditionCardLoading : ''} ${className ?? ''} ${clickable ? styles.conditionCardClickable : ''}`}
      onClick={clickable ? () => onInfoClick!(infoKey!) : undefined}
      role={clickable ? 'button' : undefined}
    >
      {icon && <span className={styles.conditionCardIcon}>{icon}</span>}
      <span className={styles.conditionCardLabel}>
        {label}
        {clickable && <span className={styles.conditionCardInfoBadge}>?</span>}
      </span>
      {loading
        ? <span className={styles.conditionCardSkeleton}>분석 중...</span>
        : <span className={styles.conditionCardValue}>{value ?? '—'}</span>}
      {!loading && desc && (
        <span className={styles.conditionCardDesc}>{desc}</span>
      )}
      {!loading && source && (
        <span className={styles.conditionCardSource}>{source}</span>
      )}
    </div>
  );
}

/* ─── 몇 물 카드 ─── */
function WaterNumberCard({ waterNumber, loading, source, onInfoClick }: {
  waterNumber: string | null; loading?: boolean; source?: string | null;
  onInfoClick?: (key: ConditionInfoKey) => void;
}) {
  const moonPhase = getWaterMoonPhase(waterNumber);
  return (
    <div
      className={`${styles.conditionCard} ${styles.waterNumberCard} ${loading ? styles.conditionCardLoading : ''} ${onInfoClick ? styles.conditionCardClickable : ''}`}
      onClick={onInfoClick ? () => onInfoClick('몇물') : undefined}
      role={onInfoClick ? 'button' : undefined}
    >
      <span className={styles.waterMoonIcon}><MoonPhaseIcon phase={moonPhase} size={24} /></span>
      {loading
        ? <span className={styles.conditionCardSkeleton}>분석 중...</span>
        : (
          <span className={styles.waterNumberValue}>
            {waterNumber ?? '—'}
            {onInfoClick && <span className={styles.conditionCardInfoBadge}>?</span>}
          </span>
        )}
      {!loading && source && (
        <span className={styles.conditionCardSource}>{source}</span>
      )}
    </div>
  );
}

/* ─── AI 분석 섹션 소제목 ─── */
function ReasonSection({ title, text }: { title: string; text: string }) {
  return (
    <div className={styles.reasonSection}>
      <span className={styles.reasonSectionTitle}>{title}</span>
      <p className={styles.reasonSectionText}>{text}</p>
    </div>
  );
}

/* ─── 조석 그래프 (코사인 보간 파형) ─── */
function TideChart({ events, series: _series, stationName, sunriseTime, sunsetTime, loading }: {
  events: TideEvent[] | null;
  series: TidePoint[] | null;
  stationName: string | null;
  sunriseTime: string | null;
  sunsetTime: string | null;
  loading?: boolean;
}) {
  const W = 600;
  const PAD = { top: 84, bottom: 72, left: 10, right: 10 };
  const CHART_H = 108;
  const TOTAL_H = PAD.top + CHART_H + PAD.bottom;
  const chartW = W - PAD.left - PAD.right;
  const bottomY = PAD.top + CHART_H;

  // 고정 레인 y 좌표 — 만조(상단), 간조(하단)
  const HI_TIME_Y = PAD.top - 44;
  const HI_TYPE_Y = PAD.top - 30;
  const HI_HT_Y   = PAD.top - 16;
  const LO_TIME_Y = bottomY + 18;
  const LO_TYPE_Y = bottomY + 32;
  const LO_HT_Y   = bottomY + 46;

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  if (loading) {
    return (
      <div className={styles.tideTimeline}>
        <div className={styles.tideTimelineHeader}>
          <span className={styles.tideTimelineTitle}>오늘의 조석</span>
        </div>
        <div className={styles.tideTimelineSkeleton} style={{ height: `${TOTAL_H}px` }} />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={styles.tideTimeline}>
        <div className={styles.tideTimelineHeader}>
          <span className={styles.tideTimelineTitle}>오늘의 조석</span>
          {stationName && <span className={styles.tideTimelineStation}>{stationName} 기준</span>}
        </div>
        <span className={styles.tideTimelineEmpty}>조석 데이터 없음</span>
      </div>
    );
  }

  // dayOffset 적용 → 오늘=0~1440, 내일=1440~2880 기준 분으로 변환 (null/undefined → 0)
  const sorted = [...events].sort((a, b) =>
    ((a.dayOffset ?? 0) * 1440 + timeToMin(a.time)) - ((b.dayOffset ?? 0) * 1440 + timeToMin(b.time))
  );
  const mins    = sorted.map(e => (e.dayOffset ?? 0) * 1440 + timeToMin(e.time));
  const heights = sorted.map(e => e.heightCm);

  // X축 범위: 오늘 00:00(0) ~ 내일 정오(2160) 또는 데이터 끝까지
  const RANGE_END = Math.max(2160, mins[mins.length - 1] + 120);

  const rawMin = Math.min(...heights);
  const rawMax = Math.max(...heights);
  const hRange = rawMax - rawMin || 100;
  const yMin = rawMin - hRange * 0.18;
  const yMax = rawMax + hRange * 0.12;

  const xOf = (m: number) => PAD.left + (m / RANGE_END) * chartW;
  const yOf = (h: number) => PAD.top + CHART_H - ((h - yMin) / (yMax - yMin)) * CHART_H;

  // 경계 가상 이벤트로 전체 범위 곡선 채우기
  const extMins = [...mins];
  const extH    = [...heights];
  if (sorted.length >= 2) {
    const dt0 = mins[1] - mins[0];
    if (mins[0] > 30) { extMins.unshift(Math.max(0, mins[0] - dt0)); extH.unshift(heights[1]); }
    const n = mins.length;
    const dtN = mins[n - 1] - mins[n - 2];
    if (mins[n - 1] < RANGE_END - 30) {
      extMins.push(Math.min(RANGE_END, mins[n - 1] + dtN));
      extH.push(heights[n - 2]);
    }
  }

  // 코사인 보간으로 360개 점 생성 (오늘 00:00 ~ 내일 정오)
  const STEPS = 360;
  const pts: string[] = [];
  for (let s = 0; s <= STEPS; s++) {
    const t = (s / STEPS) * RANGE_END;
    let h: number;
    if (t <= extMins[0]) {
      h = extH[0];
    } else if (t >= extMins[extMins.length - 1]) {
      h = extH[extMins.length - 1];
    } else {
      let i = 0;
      while (i < extMins.length - 1 && extMins[i + 1] <= t) i++;
      const ratio = (t - extMins[i]) / (extMins[i + 1] - extMins[i]);
      h = extH[i] + (extH[i + 1] - extH[i]) * (1 - Math.cos(ratio * Math.PI)) / 2;
    }
    pts.push(`${s === 0 ? 'M' : 'L'}${xOf(t).toFixed(1)},${yOf(h).toFixed(1)}`);
  }

  const linePath = pts.join(' ');
  const fillPath = `${linePath} L${xOf(RANGE_END).toFixed(1)},${bottomY} L${xOf(0).toFixed(1)},${bottomY} Z`;

  // 특정 시각의 코사인 보간 높이 반환
  const heightAt = (t: number): number => {
    if (extMins.length === 0 || t <= extMins[0]) return extH[0] ?? 0;
    if (t >= extMins[extMins.length - 1]) return extH[extMins.length - 1];
    let i = 0;
    while (i < extMins.length - 1 && extMins[i + 1] <= t) i++;
    const ratio = (t - extMins[i]) / (extMins[i + 1] - extMins[i]);
    return extH[i] + (extH[i + 1] - extH[i]) * (1 - Math.cos(ratio * Math.PI)) / 2;
  };

  const midnightX = xOf(1440);
  const nowX = xOf(nowMin);
  const nowPillW = 56;
  const nowPillCx = Math.min(W - nowPillW / 2 - 8, Math.max(nowPillW / 2 + 8, nowX));
  const nowTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className={styles.tideTimeline}>
      <div className={styles.tideTimelineHeader}>
        <span className={styles.tideTimelineTitle}>오늘의 조석</span>
        {stationName && <span className={styles.tideTimelineStation}>{stationName} 기준</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className={styles.tideChartSvg}>
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D4FBF" stopOpacity="0.32" />
            <stop offset="60%" stopColor="#1D4FBF" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#1D4FBF" stopOpacity="0.02" />
          </linearGradient>
          <clipPath id="tideClip">
            <rect x={PAD.left} y={PAD.top} width={chartW} height={CHART_H} />
          </clipPath>
        </defs>

        {/* 그라디언트 채우기 */}
        <path d={fillPath} fill="url(#tideGrad)" clipPath="url(#tideClip)" />
        {/* 코사인 파형 선 */}
        <path d={linePath} fill="none" stroke="#1D4FBF" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#tideClip)" />

        {/* 자정 경계선 + 내일 pill (지금 pill과 같은 상단 레인) */}
        {(() => {
          const label = `내일 ${now.getMonth() + 1}/${new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate()}`;
          const pillW = 52;
          const pillCx = Math.min(W - pillW / 2 - 8, Math.max(pillW / 2 + 8, midnightX));
          return (
            <>
              <line x1={midnightX} y1={20} x2={midnightX} y2={bottomY}
                stroke="rgba(16,24,40,0.22)" strokeWidth="1.5" strokeDasharray="4,4" />
              <rect x={pillCx - pillW / 2} y={1} width={pillW} height="18" rx="9"
                fill="#EAECF0" />
              <text x={pillCx} y={13} textAnchor="middle" fontSize="10"
                fill="#344054" fontWeight="700">{label}</text>
            </>
          );
        })()}

        {/* 현재 시각 — "지금 HH:MM" pill (SVG 상단 고정) + 세로 점선 */}
        <rect x={nowPillCx - nowPillW / 2} y={1} width={nowPillW} height="18" rx="9"
          fill="#1D4FBF" />
        <text x={nowPillCx} y={13} textAnchor="middle" fontSize="10" fill="#FFFFFF" fontWeight="900">
          {`지금 ${nowTimeStr}`}
        </text>
        <line x1={nowX} y1={20} x2={nowX} y2={bottomY}
          stroke="#1D4FBF" strokeWidth="2" strokeDasharray="5,3" />

        {/* 일출/일몰 — 아이콘 + 시간 텍스트 */}
        {[
          { time: sunriseTime, label: '일출' },
          { time: sunsetTime,  label: '일몰' },
        ].map(({ time, label }) => {
          if (!time) return null;
          const [hh, mm] = time.split(':').map(Number);
          const sunMin = hh * 60 + mm;
          if (sunMin >= RANGE_END) return null;
          const sx = xOf(sunMin);
          const sy = yOf(heightAt(sunMin)) - 14;
          return (
            <g key={label}>
              <text x={sx} y={sy} textAnchor="middle" fontSize="10"
                fill="#D97706" fontWeight="800">{label}</text>
              <text x={sx} y={sy + 12} textAnchor="middle" fontSize="9"
                fill="#98A2B3" fontWeight="600">{time}</text>
            </g>
          );
        })}

        {/* 만조/간조 — 핀은 파형 위 실제 위치, 레이블은 상단/하단 고정 레인 */}
        {sorted.map((e, i) => {
          const ex = xOf(mins[i]);
          const ey = yOf(e.heightCm);
          const isPast    = mins[i] < nowMin && (e.dayOffset ?? 0) === 0;
          const isHigh    = e.highTide;
          const dotColor  = isHigh ? '#1D4FBF' : '#98A2B3';
          const glowColor = isHigh ? '#1D4FBF' : '#98A2B3';
          const typeLabel = isHigh ? '만조' : '간조';
          return (
            <g key={i} opacity={isPast ? 0.7 : 1}>
              {isHigh ? (
                /* 만조 — 상단 고정 레인 */
                <>
                  {ey - 13 > HI_HT_Y + 5 && (
                    <line x1={ex} y1={HI_HT_Y + 4} x2={ex} y2={ey - 13}
                      stroke={dotColor} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.45" />
                  )}
                  <text x={ex} y={HI_TIME_Y} textAnchor="middle" fontSize="13" fill="#101828" fontWeight="900">{e.time}</text>
                  <text x={ex} y={HI_TYPE_Y} textAnchor="middle" fontSize="12" fill={dotColor} fontWeight="800">{typeLabel}</text>
                  <text x={ex} y={HI_HT_Y}   textAnchor="middle" fontSize="11" fill="#667085" fontWeight="700">{e.heightCm}cm</text>
                </>
              ) : (
                /* 간조 — 하단 고정 레인 */
                <>
                  {ey + 13 < bottomY - 5 && (
                    <line x1={ex} y1={ey + 13} x2={ex} y2={bottomY + 4}
                      stroke={dotColor} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.45" />
                  )}
                  <text x={ex} y={LO_TIME_Y} textAnchor="middle" fontSize="13" fill="#101828" fontWeight="900">{e.time}</text>
                  <text x={ex} y={LO_TYPE_Y} textAnchor="middle" fontSize="12" fill={dotColor} fontWeight="800">{typeLabel}</text>
                  <text x={ex} y={LO_HT_Y}   textAnchor="middle" fontSize="11" fill="#667085" fontWeight="700">{e.heightCm}cm</text>
                </>
              )}
              <circle cx={ex} cy={ey} r="13" fill={glowColor} opacity="0.18" />
              <circle cx={ex} cy={ey} r="9"  fill={dotColor} />
              <circle cx={ex} cy={ey} r="6"  fill={dotColor} stroke="#FFFFFF" strokeWidth="3" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── 이번 주 조황 카카오맵 모달 ─── */
function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 어종 배지 색. 목록에 없는 어종(직접 입력)이나 색을 안 정한 어종은 기본색으로 떨어진다.
 * 어종명은 서버가 내려주는 name 을 그대로 쓴다 — 표를 따로 둘 필요가 없다.
 */
const SPECIES_BADGE_COLORS: Record<string, string> = {
  SAMCHI:            '#F59E0B',
  BANGEO:            '#3B82F6',
  BUSSIRI:           '#8B5CF6',
  JATBANGEO:         '#6D28D9',
  MACKEREL:          '#10B981',
  TUNA:              '#EF4444',
  JEONGAENGI:        '#0EA5E9',
  FLOUNDER:          '#0D9488',
  ROCKFISH:          '#B45309',
  BLACK_SEA_BREAM:   '#475569',
  RED_SEA_BREAM:     '#DB2777',
  OPALEYE:           '#166534',
  STRIPED_BEAKFISH:  '#7C2D12',
  SEA_BASS:          '#1D4ED8',
  CUTTLEFISH:        '#9333EA',
  BIGFIN_REEF_SQUID: '#C026D3',
  WEBFOOT_OCTOPUS:   '#E11D48',
  HAIRTAIL:          '#64748B',
  MULLET:            '#0891B2',
  HALFBEAK:          '#0F766E',
  SANDFISH:          '#A16207',
  MAHI_MAHI:         '#CA8A04',
  GREENLING:         '#4D7C0F',
  CONGER_EEL:        '#78350F',
  GAJAMI:            '#57534E',
  LONGTAIL_OPALEYE:  '#15803D',
  MARBLED_ROCKFISH:  '#9A3412',
  PIKE_CONGER:       '#713F12',
  SURFPERCH:         '#BE185D',
  GIZZARD_SHAD:      '#0369A1',
  SAND_WHITING:      '#737373',
  FILEFISH:          '#6B21A8',
  GURNARD:           '#DC2626',
  FLATHEAD:          '#365314',
  GROUPER:           '#1E40AF',
  DAGEUMBARI:        '#831843',
  SWORDTIP_SQUID:    '#A21CAF',
  COMMON_OCTOPUS:    '#BE123C',
  BOLLAK:              '#B91C1C',
  YEOLGI:              '#EA580C',
  CROAKER:             '#CA8A04',
  RAY:                 '#525252',
  COD:                 '#1E3A8A',
  BLACKTHROAT_SEAPERCH:'#9F1239',
  RED_SPOTTED_GROUPER: '#C2410C',
  GIANT_SEABASS:       '#312E81',
  MONKFISH:            '#44403C',
  SHARK:               '#334155',
  COMMON_SQUID:        '#7E22CE',
  LONGARM_OCTOPUS:     '#A21CAF',
  WRASSE:              '#0D9488',
};

const DEFAULT_SPECIES_COLOR = '#0B3D91';

/** 서버가 내려주는 어종 목록({code, name})을 배지 HTML로 만든다. */
function buildSpeciesBadges(
  species: { code: string | null; name: string }[],
  fontSize: number,
  margin: string,
): string {
  return species.map((sp) => {
    const color = (sp.code && SPECIES_BADGE_COLORS[sp.code]) || DEFAULT_SPECIES_COLOR;
    return `<span style="display:inline-block;padding:${fontSize <= 10 ? '1px 6px' : '2px 8px'};border-radius:99px;font-size:${fontSize}px;font-weight:700;background:${color}20;color:${color};margin:${margin};">${escapeHtml(sp.name)}</span>`;
  }).join('');
}

function makeFishPin(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26S32 28 32 16C32 7.163 24.837 0 16 0z"
      fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="6.5" fill="white"/>
  </svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

function MigratoryMapModal({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [markerCount, setMarkerCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);
  const navigate = useNavigate();

  // iOS Safari 포함 배경 스크롤 완전 차단
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    (window as any).__openMigratoryPost = (postId: string) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      onClose();
      navigate('/catch-posts', { state: { openPostId: postId } });
    };
    return () => { delete (window as any).__openMigratoryPost; }; // eslint-disable-line @typescript-eslint/no-explicit-any
  }, [onClose, navigate]);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pointPageState = new Map<string, { page: number; totalPages: number; pointName: string | null; speciesBadges: string; iw: any }>();

    Promise.all([
      import('../api/catchPostApi'),
      loadKakaoSDK(appKey),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([catchPostApi]): any => {
      if (cancelled || !mapRef.current) return;
      return catchPostApi.getWeeklyCatchMarkers().catch(() => []).then((markers) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;

      // 게시글 목록 HTML 생성 (최초 로딩·화살표 페이지 이동 공통)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildPostListHtml = (posts: any[]) => posts.map((p: any) => {
        const pBadges = buildSpeciesBadges(p.species ?? [], 10, '0 2px 0 0');
        return `<div style="padding:6px 0;border-top:1px solid #F1F5F9;">
          <div style="margin-bottom:3px;">${pBadges}</div>
          <div onclick="window.__openMigratoryPost('${p.postId}')" style="font-size:12px;font-weight:600;color:#1E293B;cursor:pointer;text-decoration:underline;">${escapeHtml(p.title)}</div>
          <div style="font-size:11px;color:#94A3B8;">${escapeHtml(p.authorNickname)}</div>
        </div>`;
      }).join('');

      // 게시글 3개 초과 시 좌우 화살표 페이지네이션 — 터치하기 쉽도록 버튼을 크게, 흰색 칸 안쪽에 여백을 두고 배치
      const buildPaginationHtml = (pointId: string, page: number, totalPages: number) => {
        if (totalPages <= 1) return '';
        const btnStyle = (disabled: boolean) =>
          `border:1px solid #E2E8F0;background:#fff;border-radius:8px;cursor:pointer;font-size:20px;font-weight:800;` +
          `color:#0B3D91;width:34px;height:34px;line-height:1;display:flex;align-items:center;justify-content:center;` +
          `opacity:${disabled ? 0.3 : 1};`;
        return `<div style="display:flex;align-items:center;justify-content:center;gap:18px;margin-top:10px;padding-top:10px;border-top:1px solid #F1F5F9;">
          <button onclick="window.__migratoryMapPage('${pointId}', -1)" ${page === 0 ? 'disabled' : ''} style="${btnStyle(page === 0)}">‹</button>
          <span style="font-size:12px;font-weight:600;color:#64748B;">${page + 1} / ${totalPages}</span>
          <button onclick="window.__migratoryMapPage('${pointId}', 1)" ${page >= totalPages - 1 ? 'disabled' : ''} style="${btnStyle(page >= totalPages - 1)}">›</button>
        </div>`;
      };

      const buildInfoContent = (pointId: string, pointName: string | null, speciesBadges: string, postsHtml: string, paginationHtml: string) => `<div style="position:relative;padding:14px 16px;min-width:220px;max-width:280px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;line-height:1.5;">
        <button onclick="window.__closeMigratoryInfo('${pointId}')" style="position:absolute;top:8px;right:8px;width:28px;height:28px;border:none;background:#F1F5F9;border-radius:50%;font-size:16px;font-weight:700;color:#64748B;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
        ${pointName ? `<div style="font-size:13px;font-weight:700;color:#0B3D91;margin-bottom:6px;padding-right:26px;">${escapeHtml(pointName)}</div>` : ''}
        <div style="margin-bottom:6px;">${speciesBadges}</div>
        ${postsHtml}
        ${paginationHtml}
      </div>`;

      // 화살표 클릭 시 해당 포인트의 다음/이전 페이지 게시물을 불러와 InfoWindow 내용을 갱신
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__migratoryMapPage = (pointId: string, direction: number) => {
        const state = pointPageState.get(pointId);
        if (!state) return;
        const nextPage = state.page + direction;
        if (nextPage < 0 || nextPage >= state.totalPages) return;
        catchPostApi.getWeeklyCatchPostsByPoint(pointId, nextPage, 3).then((result) => {
          state.page = result.page;
          state.totalPages = result.totalPages;
          state.iw.setContent(buildInfoContent(
            pointId, state.pointName, state.speciesBadges,
            buildPostListHtml(result.content),
            buildPaginationHtml(pointId, state.page, state.totalPages),
          ));
        }).catch(() => { /* 페이지 이동 실패 시 기존 내용 유지 */ });
      };

      // 커스텀 닫기(✕) 버튼 클릭 시 InfoWindow 닫기 — Kakao 기본 닫기 아이콘이 너무 작아 직접 그려서 크게 표시
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__closeMigratoryInfo = (pointId: string) => {
        pointPageState.get(pointId)?.iw.close();
      };

      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 13,
        });
        setMapForControl(map);

        // 모달이 막 열리는 시점엔 컨테이너 레이아웃이 아직 확정되지 않아
        // 지도 타일이 실제 크기보다 작게 잡히는 문제가 있어 보정한다.
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const validMarkers = (markers as any[]).filter(m => m.latitude != null && m.longitude != null);
        setMarkerCount(validMarkers.length);

        if (validMarkers.length > 0) {
          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fishMarkers = validMarkers.map((m: any) => {
            const pos = new kakao.maps.LatLng(Number(m.latitude), Number(m.longitude));

            // 물고기 이모지 마커 (어종 색상 무관하게 통일)
            const marker = new kakao.maps.Marker({
              position: pos,
              image: new kakao.maps.MarkerImage(
                makeFishPin('#0B3D91'),
                new kakao.maps.Size(32, 42),
                { offset: new kakao.maps.Point(16, 42) },
              ),
            });

            // 어종 배지 — 서버가 3종까지만 담아 보내므로 잘린 만큼 "+N" 을 덧붙인다.
            const hidden = Math.max(0, (m.totalSpeciesCount ?? 0) - (m.species?.length ?? 0));
            const speciesBadges = buildSpeciesBadges(m.species ?? [], 11, '2px 2px 2px 0')
              + (hidden > 0
                ? `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:#F1F5F9;color:#64748B;margin:2px 2px 2px 0;">+${hidden}</span>`
                : '');

            const totalPages = Math.max(1, Math.ceil((m.totalPostCount ?? m.posts.length) / 3));
            const infoContent = buildInfoContent(
              m.migratoryPointId, m.pointName, speciesBadges,
              buildPostListHtml(m.posts),
              buildPaginationHtml(m.migratoryPointId, 0, totalPages),
            );

            // Kakao 기본 닫기 아이콘 대신 콘텐츠 안에 직접 그린 큰 ✕ 버튼을 사용
            const iw = new kakao.maps.InfoWindow({ content: infoContent, removable: false });
            pointPageState.set(m.migratoryPointId, {
              page: 0, totalPages, pointName: m.pointName, speciesBadges, iw,
            });
            kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker));
            return marker;
          });

          clusterer.addMarkers(fishMarkers);
        }

        setStatus('ready');
      });
      });
    }).catch((err: Error) => {
      if (!cancelled) { setErrorMsg(err.message); setStatus('error'); }
    });

    return () => {
      cancelled = true;
      delete (window as any).__migratoryMapPage; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        touchAction: 'none', overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 860, height: '80vh', maxHeight: 640,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          touchAction: 'auto', overscrollBehavior: 'contain',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
              이번 주 어종 현황 (지도)
            </span>
            {status === 'ready' && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                오늘 조황 {markerCount}건
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-border)',
            background: 'var(--color-bg)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)',
          }}>✕</button>
        </div>

        {/* 지도 영역 */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {status !== 'ready' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'var(--color-bg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, zIndex: 2,
            }}>
              {status === 'loading' ? (
                <>
                  <div style={{
                    width: 36, height: 36, border: '3px solid var(--color-border)',
                    borderTopColor: 'var(--color-primary)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>지도를 불러오는 중...</p>
                </>
              ) : (
                <p style={{ fontSize: 14, color: '#EF4444', margin: 0 }}>⚠️ {errorMsg}</p>
              )}
            </div>
          )}

          {status === 'ready' && markerCount === 0 && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.92)', padding: '10px 18px',
              borderRadius: 10, fontSize: 13, color: '#475569', zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
            }}>
              이번 주에 등록된 조황이 없습니다
            </div>
          )}

          <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'pan-x pan-y' }} />
          <MapTypeControl map={mapForControl} />
        </div>

        {/* 안내 문구 */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--color-border)',
          flexShrink: 0, background: 'var(--color-bg)',
        }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>핀을 클릭하면 어종과 조황을 확인할 수 있습니다</span>
        </div>
      </div>
    </div>
  );
}

/* ─── 모든 조황 포인트 지도 모달 ─── */
function AllMigratoryPointsMapModal({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const hasAppKey = !!(import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(hasAppKey ? 'loading' : 'error');
  const [errorMsg, setErrorMsg] = useState(hasAppKey ? '' : '.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
  const [pointCount, setPointCount] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);
  /** 영상 목록을 열 포인트 — 마커 말풍선의 "영상 보기"로 지정된다 */
  const [videoPoint, setVideoPoint] =
    useState<{ id: string; name: string; otherChannelCount: number } | null>(null);

  /* ── 유튜버(채널) 필터 ────────────────────────────────────────────────
   * 한 명만 고른다. 고르면 그 채널 영상이 붙은 포인트만 남고,
   * 핀을 눌렀을 때도 그 채널 영상만 보여준다.
   * 마커는 다시 만들지 않는다 — 처음 받아 둔 전체 마커에서 보일 것만 골라 넣는다.
   */
  const [channelPanelOpen, setChannelPanelOpen] = useState(false);
  const [channelList, setChannelList] = useState<MigratoryPointChannelList>({
    totalPointCount: 0, totalVideoCount: 0, channels: [],
  });
  const [channelStatus, setChannelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  /** null 이면 "전체 유튜버" */
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  /** 고른 채널의 포인트 ID 집합. null 이면 필터 없음 */
  const [channelPointIds, setChannelPointIds] = useState<Set<string> | null>(null);
  const [channelLoading, setChannelLoading] = useState(false);
  /**
   * 포인트별 {그 채널 편수, 전체 편수}.
   * 말풍선이 "영상 N" 과 "다른 채널 영상 M개"를 추가 요청 없이 그리는 근거다.
   */
  const channelCountsRef = useRef(new Map<string, { count: number; total: number }>());
  // 말풍선 HTML 은 지도 초기화 때 만든 클로저 안에서 그려진다. 최신 채널을 읽도록 ref 로 들고 다닌다.
  // 바로 아래 onlyWithVideosRef 와 달리 렌더 중이 아니라 effect 에서 채운다(렌더 중 ref 쓰기는
  // 동시성 렌더에서 어긋날 수 있다). 말풍선은 클릭 시점에 그려지므로 한 프레임 늦어도 문제없다.
  const selectedChannelRef = useRef<string | null>(selectedChannel);
  useEffect(() => { selectedChannelRef.current = selectedChannel; }, [selectedChannel]);

  /** 상단 가운데 필터 — false: 모든 포인트, true: 유튜브 영상이 등록된 포인트만 */
  const [onlyWithVideos, setOnlyWithVideos] = useState(false);
  const [videoPointCount, setVideoPointCount] = useState(0);
  // 마커 클릭 핸들러는 지도 초기화 때 한 번만 만들어져서 그 시점의 onlyWithVideos 를 붙들고 있다.
  // 필터를 바꿔도 최신 값을 읽도록 ref 로 따로 들고 다닌다.
  const onlyWithVideosRef = useRef(onlyWithVideos);
  onlyWithVideosRef.current = onlyWithVideos;
  /** 포인트별 설명 캐시 — 같은 핀을 다시 눌러도 재요청하지 않는다. 설명이 없으면 null 로 기억한다 */
  const descriptionCache = useRef(new Map<string, string | null>()).current;
  /** 지금 말풍선이 열려 있는 포인트 — 응답이 늦게 와도 엉뚱한 말풍선을 고치지 않게 한다 */
  const openedPointId = useRef<string | null>(null);
  /** 필터를 바꿀 때 열려 있던 말풍선을 닫는다 — 아래 effect 에서 호출 */
  const closeOpenedInfoRef = useRef<(() => void) | null>(null);
  // 필터를 바꿀 때 다시 요청하지 않고, 만들어 둔 마커를 클러스터러에 넣었다 뺐다 한다.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerVideoCounts = useRef(new Map<any, number>()).current;
  /** 마커 → 포인트 ID. 채널 필터로 보일 마커를 고를 때 쓴다(effect 안에서만 읽는다) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerPointIdsRef = useRef(new Map<any, string>());

  useEffect(() => {
    const clusterer = clustererRef.current;
    if (!clusterer) return;
    // 말풍선 내용이 필터에 따라 달라진다(영상 버튼). 열어 둔 채로 필터를 바꾸면
    // 화면과 필터가 어긋나므로 먼저 닫는다.
    closeOpenedInfoRef.current?.();
    let visible = onlyWithVideos
      ? allMarkersRef.current.filter((m) => (markerVideoCounts.get(m) ?? 0) > 0)
      : allMarkersRef.current;
    // 유튜버를 고르면 그 채널 포인트만 남긴다. 필터가 없으면 channelPointIds 는 null 이다.
    if (onlyWithVideos && channelPointIds) {
      visible = visible.filter((m) => channelPointIds.has(markerPointIdsRef.current.get(m) ?? ''));
    }
    clusterer.clear();
    clusterer.addMarkers(visible);
  }, [onlyWithVideos, status, markerVideoCounts, channelPointIds]);

  /* 유튜버 목록 — 모달을 열 때 한 번만 받는다(서버가 1시간 캐시한다) */
  useEffect(() => {
    let cancelled = false;
    setChannelStatus('loading');
    fetchMigratoryPointChannels()
      .then((list) => { if (!cancelled) { setChannelList(list); setChannelStatus('ready'); } })
      .catch(() => { if (!cancelled) setChannelStatus('error'); });
    return () => { cancelled = true; };
  }, []);

  /*
   * 고른 채널의 포인트 집합을 받아 온다.
   * 마커를 다시 만들지 않고 "보일 것"만 고르는 방식이라, 지도가 통째로 깜빡이지 않는다.
   */
  useEffect(() => {
    if (!selectedChannel) {
      channelCountsRef.current = new Map();
      setChannelPointIds(null);
      setChannelLoading(false);
      return;
    }
    let cancelled = false;
    setChannelLoading(true);
    fetchAllMigratoryFishPointMapMarkers(selectedChannel)
      .then((points) => {
        if (cancelled) return;
        const counts = new Map<string, { count: number; total: number }>();
        points.forEach((p) => {
          counts.set(p.id, {
            count: p.videoCount ?? 0,
            total: p.totalVideoCount ?? p.videoCount ?? 0,
          });
        });
        channelCountsRef.current = counts;
        setChannelPointIds(new Set(points.map((p) => p.id)));
      })
      // 실패하면 필터를 걸지 않는다 — 빈 지도를 보여 주는 것보다 전체를 보여 주는 편이 낫다.
      .catch(() => { if (!cancelled) { channelCountsRef.current = new Map(); setChannelPointIds(null); } })
      .finally(() => { if (!cancelled) setChannelLoading(false); });
    return () => { cancelled = true; };
  }, [selectedChannel]);

  /* "모든 포인트"로 돌아가면 유튜버 목록은 의미가 없다 — 패널만 닫고 선택은 남겨 둔다 */
  useEffect(() => {
    if (!onlyWithVideos) setChannelPanelOpen(false);
  }, [onlyWithVideos]);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) return;

    let cancelled = false;

    Promise.all([
      loadKakaoSDK(appKey),
      fetchAllMigratoryFishPointMapMarkers().catch(() => [] as MigratoryFishPointMapMarker[]),
    ]).then(([, points]) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;

      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 13,
        });
        setMapForControl(map);

        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        const validPoints = points.filter(p => p.latitude != null && p.longitude != null);
        setPointCount(validPoints.length);

        if (validPoints.length > 0) {
          const hoverInfoWindow = new kakao.maps.InfoWindow({ removable: false });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pinnedWindows = new Map<string, any>();

          // 커스텀 닫기(✕) 버튼 클릭 시 InfoWindow 닫기 — Kakao 기본 닫기 아이콘이 너무 작아 직접 그려서 크게 표시
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__closeAllPointsInfo = (pointId: string) => {
            pinnedWindows.get(pointId)?.close();
            if (openedPointId.current === pointId) openedPointId.current = null;
          };

          closeOpenedInfoRef.current = () => {
            const opened = openedPointId.current;
            if (!opened) return;
            pinnedWindows.get(opened)?.close();
            openedPointId.current = null;
          };

          // 말풍선 안의 "영상 보기" — InfoWindow 는 React 밖의 HTML 이라 전역 함수로 잇는다.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__openPointVideos = (
            pointId: string, pointName: string, otherChannelCount = 0
          ) => {
            pinnedWindows.get(pointId)?.close();
            openedPointId.current = null;
            setVideoPoint({ id: pointId, name: pointName, otherChannelCount });
          };

          const markers = validPoints.map((p) => {
            const position = new kakao.maps.LatLng(p.latitude, p.longitude);
            const marker = new kakao.maps.Marker({ position });
            // 필터 전환 때 클러스터러에 다시 넣을 대상을 고르려고 개수를 들고 다닌다.
            markerVideoCounts.set(marker, p.videoCount ?? 0);
            markerPointIdsRef.current.set(marker, p.id);

            // 포인트 이름만 표시 — 어종 정보는 노출하지 않음
            const nameContent = `<div style="padding:5px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">📍 ${escapeHtml(p.name)}</div>`;

            // 클릭 시 큰 ✕ 버튼으로 직접 닫기 전까지 고정되는 InfoWindow.
            //  · "모든 포인트"  → 이름 (+설명이 등록돼 있으면 설명)
            //  · "유튜버 포인트" → 이름 + 영상 목록 버튼
            // 영상 버튼을 유튜버 필터에서만 띄우는 이유: 모든 포인트를 보는 중에 영상이
            // 튀어나오면 사용자가 고른 것과 화면이 어긋난다. 영상은 그 필터를 고른 사람에게만 준다.
            const buildPinnedContent = (description: string | null) => {
              // 유튜버를 고른 상태면 편수도 그 채널 기준으로 센다.
              const channel = selectedChannelRef.current;
              const counted = channel ? channelCountsRef.current.get(p.id) : undefined;
              const videoCount = counted ? counted.count : (p.videoCount ?? 0);
              const otherCount = counted ? Math.max(0, counted.total - counted.count) : 0;
              const showVideos = onlyWithVideosRef.current && videoCount > 0;
              // 설명이 붙으면 한 줄로 못 담으므로 nowrap 을 풀고 폭을 제한한다.
              const wrap = description
                ? 'white-space:normal;max-width:260px;'
                : 'white-space:nowrap;';
              return `<div style="position:relative;padding:7px 34px 9px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;${wrap}">
              📍 ${escapeHtml(p.name)}
              <button onclick="window.__closeAllPointsInfo('${p.id}')" style="position:absolute;top:3px;right:3px;width:26px;height:26px;border:none;background:#F1F5F9;border-radius:50%;font-size:14px;font-weight:700;color:#64748B;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
              ${description
                ? `<div style="margin-top:6px;font-size:12.5px;font-weight:500;color:#475569;line-height:1.55;word-break:keep-all;overflow-wrap:anywhere;">${escapeHtml(description).replace(/\n/g, '<br/>')}</div>`
                : ''}
              ${showVideos
                ? `<button onclick="window.__openPointVideos('${p.id}', '${escapeHtml(p.name).replace(/'/g, '&#39;')}', ${otherCount})" style="display:block;margin-top:8px;width:100%;padding:6px 14px;background:#0B3D91;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">${channel ? `${escapeHtml(channel)} 영상 ${videoCount}` : `이 포인트가 나오는 영상 ${videoCount}`}</button>`
                : ''}
            </div>`;
            };
            const pinnedInfoWindow = new kakao.maps.InfoWindow({ content: buildPinnedContent(null), removable: false });
            pinnedWindows.set(p.id, pinnedInfoWindow);

            kakao.maps.event.addListener(marker, 'mouseover', () => {
              hoverInfoWindow.setContent(nameContent);
              hoverInfoWindow.open(map, marker);
            });
            kakao.maps.event.addListener(marker, 'mouseout', () => {
              hoverInfoWindow.close();
            });
            kakao.maps.event.addListener(marker, 'click', () => {
              hoverInfoWindow.close();
              const cached = descriptionCache.get(p.id);
              // 설명은 대부분 비어 있으므로 "불러오는 중"을 띄우지 않는다.
              // 이름을 먼저 보여주고, 설명이 실제로 있을 때만 뒤에서 덧붙인다.
              pinnedInfoWindow.setContent(buildPinnedContent(cached ?? null));
              pinnedInfoWindow.open(map, marker);
              openedPointId.current = p.id;
              if (cached !== undefined) return;

              fetchMigratoryFishPointDetail(p.id)
                .then((detail) => {
                  const description = detail.description?.trim() ? detail.description.trim() : null;
                  descriptionCache.set(p.id, description);
                  // 응답이 오는 사이 다른 핀을 눌렀거나 닫았으면 건드리지 않는다.
                  if (!description || openedPointId.current !== p.id) return;
                  pinnedInfoWindow.setContent(buildPinnedContent(description));
                })
                // 설명은 부가 정보다. 실패해도 이름만 그대로 두고 아무 말도 하지 않는다.
                .catch(() => { descriptionCache.set(p.id, null); });
            });

            return marker;
          });

          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            markers,
            gridSize: 60,
            averageCenter: true,
            minLevel: 5,
          });
          clustererRef.current = clusterer;
          allMarkersRef.current = markers;
          setVideoPointCount(validPoints.filter((p) => (p.videoCount ?? 0) > 0).length);
        }

        setStatus('ready');
      });
    }).catch((err: Error) => {
      if (!cancelled) { setErrorMsg(err.message); setStatus('error'); }
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        touchAction: 'none', overscrollBehavior: 'contain',
      }}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 860, height: '80vh', maxHeight: 640,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          touchAction: 'auto', overscrollBehavior: 'contain',
        }}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
              모든 낚시 포인트
            </span>
            {status === 'ready' && (
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                총 {pointCount}곳
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--color-border)',
            background: 'var(--color-bg)', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-text-muted)',
          }}>✕</button>
        </div>

        {/* 지도 영역 */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {status !== 'ready' && (
            <div style={{
              position: 'absolute', inset: 0, background: 'var(--color-bg)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 12, zIndex: 2,
            }}>
              {status === 'loading' ? (
                <>
                  <div style={{
                    width: 36, height: 36, border: '3px solid var(--color-border)',
                    borderTopColor: 'var(--color-primary)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <p style={{ fontSize: 14, color: 'var(--color-text-muted)', margin: 0 }}>지도를 불러오는 중...</p>
                </>
              ) : (
                <p style={{ fontSize: 14, color: '#EF4444', margin: 0 }}>⚠️ {errorMsg}</p>
              )}
            </div>
          )}

          {status === 'ready' && pointCount === 0 && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.92)', padding: '10px 18px',
              borderRadius: 10, fontSize: 13, color: '#475569', zIndex: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
            }}>
              등록된 낚시 포인트가 없습니다
            </div>
          )}

          {/* 포인트 필터 — 지도 맨 위 가운데 */}
          {status === 'ready' && pointCount > 0 && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              display: 'flex', gap: 4, padding: 4, zIndex: 3,
              background: '#fff', borderRadius: 999,
              border: '1px solid #BFD3EC', boxShadow: '0 4px 14px rgba(11,61,145,0.18)',
            }}>
              {[
                { label: '모든 포인트', value: false },
                { label: '유튜버 포인트', value: true },
              ].map((tab) => {
                const selected = onlyWithVideos === tab.value;
                return (
                  <button
                    key={String(tab.value)}
                    type="button"
                    onClick={() => setOnlyWithVideos(tab.value)}
                    style={{
                      padding: '7px 14px', border: 'none', borderRadius: 999,
                      background: selected ? '#0B3D91' : 'transparent',
                      color: selected ? '#fff' : '#64748B',
                      fontSize: 12.5, fontWeight: selected ? 700 : 600,
                      cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}

              {/*
                세 번째 칩 — 유튜버 선택. "유튜버 포인트"를 고른 상태에서만 쓸 수 있다.
                "모든 포인트"에서 눌리면 사용자가 고른 것과 화면이 어긋난다(영상 버튼을 감춘 이유와 같다).
              */}
              <button
                type="button"
                disabled={!onlyWithVideos}
                onClick={() => setChannelPanelOpen((v) => !v)}
                style={{
                  padding: '7px 12px', borderRadius: 999,
                  border: selectedChannel ? '1px solid #8FC0F2' : '1px solid transparent',
                  background: selectedChannel ? '#E8F2FE' : 'transparent',
                  color: !onlyWithVideos ? '#CBD5E1' : (selectedChannel ? '#0B5CB0' : '#64748B'),
                  fontSize: 12.5, fontWeight: selectedChannel ? 700 : 600,
                  cursor: onlyWithVideos ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                title={selectedChannel ?? '유튜버 선택'}
              >
                {selectedChannel ? `${selectedChannel} ✕` : '유튜버 선택 ▾'}
              </button>
            </div>
          )}

          {/* 유튜버 목록 — 지도 왼쪽에 겹쳐 뜬다 */}
          {status === 'ready' && onlyWithVideos && channelPanelOpen && (
            <ChannelFilterPanel
              channels={channelList.channels}
              status={channelStatus}
              selected={selectedChannel}
              // 곳 수는 지도가 실제로 들고 있는 값을, 편수는 서버 합계(감춘 채널 포함)를 쓴다.
              totalPointCount={videoPointCount}
              totalVideoCount={channelList.totalVideoCount}
              onSelect={(name) => { setSelectedChannel(name); setChannelPanelOpen(false); }}
              onClose={() => setChannelPanelOpen(false)}
            />
          )}

          {/* 고른 유튜버 안내 — 지금 왜 핀이 적은지 한 줄로 설명하고, 한 번에 해제한다 */}
          {status === 'ready' && onlyWithVideos && selectedChannel && !channelPanelOpen && (
            <div style={{
              position: 'absolute', top: 62, left: 12, right: 12, zIndex: 3,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              background: 'rgba(255,255,255,0.96)', border: '1px solid #CFE0F3',
              borderRadius: 11, padding: '8px 12px', boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12.5, fontWeight: 700, color: '#0B5CB0',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {selectedChannel}
                </div>
                <div style={{ fontSize: 11, color: '#5B6572', marginTop: 2 }}>
                  {channelLoading
                    ? '포인트를 고르는 중...'
                    /* 목록의 "N곳"이 아니라 지도가 실제로 받은 수를 쓴다 —
                       채널 목록은 1시간 캐시라 어긋날 수 있다. */
                    : `이 유튜버 영상이 있는 포인트 ${channelPointIds?.size ?? 0}곳`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                style={{
                  flexShrink: 0, border: 'none', background: 'transparent',
                  color: '#0B3D91', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
              >
                해제
              </button>
            </div>
          )}

          {/* 고른 유튜버의 포인트가 0곳 — 빈 지도만 보이면 고장으로 읽힌다 */}
          {status === 'ready' && onlyWithVideos && selectedChannel
            && !channelLoading && channelPointIds?.size === 0 && (
            <div style={{
              position: 'absolute', top: 116, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.94)', padding: '8px 16px', borderRadius: 10,
              fontSize: 12.5, color: '#475569', zIndex: 3, whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              이 유튜버의 포인트가 없습니다 ·{' '}
              <button
                type="button"
                onClick={() => setSelectedChannel(null)}
                style={{ border: 'none', background: 'transparent', color: '#0B3D91', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                전체 보기
              </button>
            </div>
          )}

          {/* 유튜버 포인트만 봤는데 하나도 없을 때 — 빈 지도만 보이면 고장으로 읽힌다 */}
          {status === 'ready' && onlyWithVideos && !selectedChannel && videoPointCount === 0 && (
            <div style={{
              position: 'absolute', top: 62, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.94)', padding: '8px 16px', borderRadius: 10,
              fontSize: 12.5, color: '#475569', zIndex: 3, whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}>
              영상이 등록된 포인트가 아직 없습니다
            </div>
          )}

          <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'pan-x pan-y' }} />
          <MapTypeControl map={mapForControl} />
        </div>

        {/* 안내 문구 */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--color-border)',
          flexShrink: 0, background: 'var(--color-bg)',
        }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>
            {!onlyWithVideos
              ? '📍 핀을 클릭하면 포인트 이름과 설명을 확인할 수 있습니다 · 지도를 축소하면 숫자로 묶여 표시됩니다'
              : selectedChannel
                ? `📍 핀을 클릭하면 ${selectedChannel} 영상만 보여줍니다 · 다른 채널 영상은 목록 안에서 펼칠 수 있습니다`
                : '📍 핀을 클릭하면 그 포인트가 나오는 영상을 확인할 수 있습니다 · 지도를 축소하면 숫자로 묶여 표시됩니다'}
          </span>
        </div>
      </div>

      {videoPoint && (
        <PointVideoListModal
          pointId={videoPoint.id}
          pointName={videoPoint.name}
          channelName={selectedChannel}
          otherChannelCount={videoPoint.otherChannelCount}
          onClose={() => setVideoPoint(null)}
        />
      )}
    </div>
  );
}
