import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import {
  fetchProvinces, fetchFishingPointsByProvince, fetchConditions, analyzeFishingPoint,
  type ProvinceItem, type FishingPointMapMarker,
  type FishingConditionsResult, type FishingAnalysisResult,
  type SpeciesAnalysis, type TideEvent, type TidePoint, TIDE_FLOW_LABELS,
} from '../api/fishingPointApi';
import { useAuth } from '../context/AuthContext';
import { NoticeBoard } from './CommunityPage';
import LoginModal from '../components/common/LoginModal';
import { getMigratoryPostsPage, type MigratoryPostListItem } from '../api/migratoryPostApi';
import { getFishingPostsPage, type FishingPostListItem } from '../api/fishingPostApi';
import { fetchAllMigratoryFishPointMapMarkers, type MigratoryFishPointMapMarker } from '../api/migratoryFishPointApi';
import { fetchFishingZones, type FishingZone } from '../api/fishingZoneApi';
import styles from './HomePage.module.css';

const FISH_META: Record<string, Pick<FishData, 'id' | 'colorFrom' | 'colorTo'>> = {
  '광어':   { id: 'flatfish',   colorFrom: '#0077B6', colorTo: '#0096C7' },
  '감성돔': { id: 'blackporgy', colorFrom: '#5A189A', colorTo: '#7B2FBE' },
  '우럭':   { id: 'rockfish',   colorFrom: '#005F73', colorTo: '#0A9396' },
  '농어':   { id: 'seabass',    colorFrom: '#AE2012', colorTo: '#CA6702' },
};


const SKY_ICON: Record<string, string> = {
  '맑음': '☀️', '구름많음': '⛅', '흐림': '☁️',
};

const PTY_ICON: Record<string, string> = {
  '비': '🌧', '소나기': '🌦', '비·눈': '🌨', '눈': '❄️',
};

function getWaterMoonIcon(waterNumber: string | null | undefined): string {
  if (!waterNumber) return '🌙';
  if (waterNumber === '조금') return '🌑';
  if (waterNumber.includes('사리')) return '🌕';
  const match = waterNumber.match(/^(\d+)물/);
  if (!match) return '';
  const n = parseInt(match[1]);
  if (n <= 2) return '🌒';
  if (n <= 4) return '🌓';
  if (n <= 6) return '🌔';
  return '🌕';
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
type InfoRow = { label: string; desc: string; highlight?: boolean };
type ConditionInfoKey = '파고' | '풍속' | '물때' | '조류' | '몇물' | '수온';

const CONDITION_INFO: Record<ConditionInfoKey, { title: string; subtitle: string; rows: InfoRow[] }> = {
  파고: {
    title: '🌊 파고 (파도 높이)',
    subtitle: '파도가 높을수록 물이 탁해져 물고기 경계심이 낮아지지만, 너무 높으면 채비 컨트롤이 어렵고 위험해요.',
    rows: [
      { label: '0 ~ 0.3m', desc: '잔잔함 · 물이 맑아 물고기 경계심이 높아져요. 광어·우럭 루어엔 불리하지 않지만 감성돔은 입질 적어요' },
      { label: '0.3 ~ 0.5m', desc: '약한 파도 · 밑밥·루어 운용 안정적, 광어 등 저부 어종 활동 편함' },
      { label: '0.5 ~ 0.7m', desc: '적당한 파도 · 채비 흐름이 생겨 루어 액션이 자연스러워요' },
      { label: '0.7 ~ 1.5m', desc: '보통 파도 · 감성돔·농어 포말·탁도 활용 최고 활성', highlight: true },
      { label: '1.5 ~ 2.0m', desc: '강한 파도 · 농어 계속 활발하지만 채비 컨트롤 난이도 증가' },
      { label: '2.0 ~ 2.5m', desc: '거친 파도 · 갯바위 낚시 위험 구간, 방파제 낚시 주의' },
      { label: '2.5m 이상', desc: '위험 파도 · 갯바위·방파제 출조 자제 권장 ⚠️' },
    ],
  },
  풍속: {
    title: '💨 풍속 (바람 세기)',
    subtitle: '바람이 약할수록 캐스팅이 쉽고, 강해질수록 루어 비행 거리와 방향 컨트롤이 어려워져요.',
    rows: [
      { label: '0 ~ 1.5 m/s (실바람)', desc: '캐스팅 완벽 · 단 물이 잔잔해 물고기 경계심이 높아질 수 있어요' },
      { label: '1.5 ~ 3.3 m/s (산들바람)', desc: '낚시 최적 조건 · 적당한 탁도와 쉬운 캐스팅', highlight: true },
      { label: '3.3 ~ 5.4 m/s (건들바람)', desc: '루어 컨트롤에 신경 써야 해요 · 채비 흐름이 빨라져요' },
      { label: '5.4 ~ 7.9 m/s (흔들바람)', desc: '캐스팅 거리 감소, 캐스팅 손실 위험 · 원투 낚시 어려워요' },
      { label: '7.9 ~ 10.7 m/s (된바람)', desc: '안전에 주의하세요 ⚠️ · 갯바위·방파제 위험 구간' },
      { label: '10.7 ~ 13.8 m/s (센바람)', desc: '출조 자제 권장 ⚠️ · 캐스팅 거의 불가 수준' },
      { label: '13.8 m/s 이상 (강풍)', desc: '출조 금지 수준 ⛔ · 생명 안전 위협' },
    ],
  },
  물때: {
    title: '🔄 물때 (조석 세기)',
    subtitle: '한 달 동안 조류의 세기가 변하는 주기예요. 음력 15일(보름)·30일(그믐) 전후 사리, 음력 8일·23일 전후 조금이에요.',
    rows: [
      { label: '대조기', desc: '조류가 가장 강한 기간 · 농어·감성돔·돌돔 등 포식성 어종 활성 최고', highlight: true },
      { label: '중조기', desc: '중간 세기 조류 · 대부분의 어종에 무난한 조건, 조류 예민 어종도 어느 정도 반응' },
      { label: '소조기', desc: '조류가 가장 약한 기간 · 조류 의존 어종(농어·감성돔) 입질 감소. 광어·우럭은 비교적 무관' },
    ],
  },
  조류: {
    title: '🌊 조류 흐름 (들물·날물)',
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
    title: '🌕 몇 물 (음력 물때)',
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
    title: '🌡 수온 (물 온도)',
    subtitle: '각 어종마다 선호하는 수온 범위가 달라요. 수온이 적정 범위를 벗어나면 활성이 떨어지고 입질이 줄어들어요.',
    rows: [
      { label: '5℃ 이하', desc: '극저수온 · 거의 모든 어종 활성 최저, 깊은 곳으로 이동해 연안 낚시 매우 어려움' },
      { label: '5 ~ 10℃', desc: '저수온 · 대부분 어종 활성 감소. 감성돔은 한겨울 패턴으로 깊은 곳 공략 필요' },
      { label: '10 ~ 15℃', desc: '봄 초반·초겨울 · 감성돔·우럭 서서히 회복 시작, 광어는 연안 진출 중' },
      { label: '15 ~ 20℃', desc: '봄~초여름 · 감성돔·우럭·광어 최적 활성 시작', highlight: true },
      { label: '20 ~ 26℃', desc: '수온 상승기로 어종별 선호 수심 편차가 커짐', highlight: true },
      { label: '26 ~ 28℃', desc: '고수온 초입 · 농어는 여전히 활발, 감성돔은 심층 이동 시작' },
      { label: '28℃ 이상', desc: '고수온 · 감성돔 연안 활성 대폭 저하, 일부 어종 심층 이동. 야간 농어 여전히 활발' },
    ],
  },
};

function buildFishCards(results: SpeciesAnalysis[]): FishData[] {
  return results.map((r) => ({
    id: FISH_META[r.species]?.id ?? r.species,
    name: r.species,
    probability: r.score,
    trend: null,
    colorFrom: FISH_META[r.species]?.colorFrom ?? '#334155',
    colorTo:   FISH_META[r.species]?.colorTo   ?? '#64748B',
  }));
}

export default function HomePage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loginToast, setLoginToast] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [provinces, setProvinces] = useState<ProvinceItem[]>([]);
  const [fishingPoints, setFishingPoints] = useState<FishingPointMapMarker[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedPointId, setSelectedPointId] = useState('');

  const [provincesError, setProvincesError] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);

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

  // 회유성 지도 모달
  const [migratoryMapOpen, setMigratoryMapOpen] = useState(false);
  const [allPointsMapOpen, setAllPointsMapOpen] = useState(false);
  const [migratoryPostsPreview, setMigratoryPostsPreview] = useState<MigratoryPostListItem[]>([]);
  const [fishingPostsPreview, setFishingPostsPreview] = useState<FishingPostListItem[]>([]);

  // 지도에서 포인트 선택 시 드롭다운 동기화용 refs
  const pendingPointIdRef = useRef<string | null>(null);
  const provincesRef = useRef<ProvinceItem[]>([]);
  provincesRef.current = provinces;

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvincesError('시/도 목록을 불러오지 못했습니다.'));
  }, []);

  useEffect(() => {
    getMigratoryPostsPage(0, 5).then(r => setMigratoryPostsPreview(r.content)).catch(() => {});
    getFishingPostsPage(0, 5).then(r => setFishingPostsPreview(r.content)).catch(() => {});
  }, []);

  // 지도 팝업 → 메인 페이지 포인트 수신 + 드롭다운 동기화
  useEffect(() => {
    const handler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'fishing-point-selected' && event.data.pointId) {
        const targetId = event.data.pointId as string;
        setSelectedPointId(targetId); // 즉시 분석 시작
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 시/도 드롭다운 동기화: 모든 시도를 병렬 검색
        const currentProvinces = provincesRef.current;
        if (currentProvinces.length === 0) return;
        const results = await Promise.allSettled(
          currentProvinces.map(async (prov) => {
            const pts = await fetchFishingPointsByProvince(prov.code);
            return pts.some((p) => p.id === targetId) ? { provCode: prov.code } : null;
          })
        );
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value) {
            pendingPointIdRef.current = targetId;
            setSelectedProvince(r.value.provCode);
            return;
          }
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedProvince) { setFishingPoints([]); setSelectedPointId(''); return; }
    setPointsLoading(true);
    fetchFishingPointsByProvince(selectedProvince)
      .then((pts) => {
        setFishingPoints(pts);
        // 지도에서 선택한 포인트가 있으면 그것을 유지, 아니면 첫 번째 선택
        const pending = pendingPointIdRef.current;
        if (pending && pts.some((p) => p.id === pending)) {
          setSelectedPointId(pending);
          pendingPointIdRef.current = null;
        } else {
          setSelectedPointId(pts[0]?.id ?? '');
        }
      })
      .catch(() => { setFishingPoints([]); setSelectedPointId(''); })
      .finally(() => setPointsLoading(false));
  }, [selectedProvince]);

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

  const fishCards: FishData[] = analysisResult?.results
    ? buildFishCards(analysisResult.results)
    : FISH_LIST.map((f) => ({ ...f, probability: null }));

  const hasPrecip = conditionsResult?.precipitationType && conditionsResult.precipitationType !== '없음';

  return (
    <div className={styles.page}>
      <Header />
      {loginToast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: '#0B3D91', color: '#fff', borderRadius: 12,
          padding: '14px 28px', fontSize: 15, fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)', zIndex: 300,
          whiteSpace: 'nowrap',
        }}>
          🔒 로그인 후 이용 가능한 서비스입니다
        </div>
      )}

      <main className={styles.main}>
        {/* ─── Hero ─── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              실시간 조황 분석
            </div>

            <h1 className={styles.heroTitle}>
              낚시 포인트
              <br />
              <span className={styles.heroAccent}>AI 조황 분석</span> 서비스
            </h1>
            <p className={styles.heroDesc}>
              낚시 포인트 별 환경을 실시간으로 분석하여<br />
              정보 제공 및 조황 기대도를 AI가 분석합니다.
            </p>

            {/* 포인트 선택 */}
            {provincesError && <div className={styles.errorBanner}>⚠️ {provincesError}</div>}
            <div className={styles.locationBar}>
              <span className={styles.locationIcon}>📍</span>
              <select className={styles.locationSelect} value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}>
                <option value="">{provincesError ? '서버 연결 실패' : '시/도 선택'}</option>
                {provinces.map((p) => <option key={p.code} value={p.code}>{p.displayName}</option>)}
              </select>
              <select className={styles.locationSelect} value={selectedPointId}
                onChange={(e) => setSelectedPointId(e.target.value)}
                disabled={fishingPoints.length === 0 || pointsLoading}>
                <option value="">
                  {pointsLoading ? '불러오는 중...' : fishingPoints.length === 0 ? '포인트 없음' : '포인트 선택'}
                </option>
                {fishingPoints.map((fp) => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
              </select>
              <button className={styles.mapBtn}
                onClick={() => {
                  if (!isLoggedIn) {
                    setLoginToast(true);
                    setTimeout(() => setLoginToast(false), 2000);
                    setLoginModalOpen(true);
                    return;
                  }
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
                시/도와 낚시 포인트를 선택하거나, 지도에서 핀을 클릭하세요.
              </p>
            )}

            <div className={styles.heroDivider} />

            {/* 조건 카드 그리드 */}
            <div className={styles.conditionCards}>
              <ConditionCard icon="🌡" label="수온" loading={isConditionsLoading}
                value={conditionsResult?.waterTemp != null ? `${conditionsResult.waterTemp}℃` : null}
                source={conditionsResult?.waterTempSourceLabel}
                infoKey="수온" onInfoClick={handleInfoClick} />
              <ConditionCard icon="🌊" label="파고" loading={isConditionsLoading}
                value={conditionsResult?.waveHeight != null ? `${conditionsResult.waveHeight}m` : null}
                source={conditionsResult?.waveHeightSourceLabel}
                infoKey="파고" onInfoClick={handleInfoClick} />
              <ConditionCard icon="💨" label="풍속" loading={isConditionsLoading}
                value={conditionsResult?.windSpeed != null ? `${conditionsResult.windSpeed}m/s` : null}
                desc={getWindDesc(conditionsResult?.windSpeed)}
                source={conditionsResult?.windSourceLabel}
                infoKey="풍속" onInfoClick={handleInfoClick} />
              {/* <WindDirectionCard direction={conditionsResult?.windDirection ?? null} loading={isConditionsLoading}
                source={conditionsResult?.windDirectionSourceLabel} /> */}
              <ConditionCard icon="🔄" label="물때" loading={isConditionsLoading}
                value={conditionsResult?.tideDescription ?? null}
                source={conditionsResult?.tideSourceLabel}
                infoKey="물때" onInfoClick={handleInfoClick} />
              <ConditionCard icon="🌊" label="조류" loading={isConditionsLoading}
                value={conditionsResult?.tideFlowPhase
                  ? TIDE_FLOW_LABELS[conditionsResult.tideFlowPhase]
                  : null}
                source={conditionsResult?.tideSourceLabel}
                infoKey="조류" onInfoClick={handleInfoClick} />
              <ConditionCard
                icon={conditionsResult?.sky ? (SKY_ICON[conditionsResult.sky] ?? '🌤') : '🌤'}
                label="하늘"
                loading={isConditionsLoading}
                value={conditionsResult?.sky ?? null}
                source={conditionsResult?.skySourceLabel}
              />
              <ConditionCard icon="🌡" label="기온" loading={isConditionsLoading}
                value={conditionsResult?.temperature != null ? `${conditionsResult.temperature}℃` : null}
                source={conditionsResult?.temperatureSourceLabel} />
              <WaterNumberCard
                waterNumber={conditionsResult?.waterNumber ?? null}
                loading={isConditionsLoading}
                source={conditionsResult?.tideSourceLabel}
                onInfoClick={handleInfoClick}
              />
              <ConditionCard
                icon={hasPrecip && conditionsResult?.precipitationType ? (PTY_ICON[conditionsResult.precipitationType] ?? '🌧') : '🌂'}
                label="강수확률·강수량"
                loading={isConditionsLoading}
                value={conditionsResult == null ? null : (() => {
                  const prob = `${conditionsResult.precipitationProbability ?? 0}%`;
                  const amt = hasPrecip
                    ? `${conditionsResult.precipitationType} ${conditionsResult.precipitationAmount != null ? `${conditionsResult.precipitationAmount}mm` : '0mm'}`
                    : `${conditionsResult.precipitationAmount ?? 0}mm`;
                  return `${prob} · ${amt}`;
                })()}
                source={conditionsResult?.precipitationSourceLabel}
              />
            </div>

            {/* 실시간 회유성 정보(지도) 카드 + 모든 낚시 포인트 보기 */}
            <div className={styles.migratoryRow}>
              <button
                className={styles.migratoryCard}
                onClick={() => {
                  if (!isLoggedIn) {
                    setLoginToast(true);
                    setTimeout(() => setLoginToast(false), 2000);
                    setLoginModalOpen(true);
                    return;
                  }
                  setMigratoryMapOpen(true);
                }}
              >
                <span className={styles.migratoryCardShimmer} />
                <span className={styles.migratoryCardFish}>🐟</span>
                <div className={styles.migratoryCardBody}>
                  <div className={styles.migratoryCardTop}>
                    <span className={styles.migratoryCardLive}>● LIVE</span>
                    <span className={styles.migratoryCardTitle}>실시간 회유성 정보</span>
                  </div>
                  <p className={styles.migratoryCardDesc}>
                    {now.getMonth() + 1}월 {now.getDate()}일 회유성 포인트
                  </p>
                </div>
                <span className={styles.migratoryCardCta}>보기 →</span>
              </button>

              <button
                className={styles.allPointsCard}
                onClick={() => {
                  if (!isLoggedIn) {
                    setLoginToast(true);
                    setTimeout(() => setLoginToast(false), 2000);
                    setLoginModalOpen(true);
                    return;
                  }
                  setAllPointsMapOpen(true);
                }}
              >
                <span className={styles.allPointsCardIcon}>🗺️</span>
                <div className={styles.allPointsCardBody}>
                  <span className={styles.allPointsCardTitle}>모든 어종 포인트</span>
                  <p className={styles.allPointsCardDesc}>
                    낚시 포인트 & 낚시 금지 포인트
                  </p>
                </div>
                <span className={styles.allPointsCardCta}>보기 →</span>
              </button>
            </div>

            {/* 낙뢰 경고 */}
            {conditionsResult?.hasLightning && (
              <div className={styles.lightningBanner}>
                ⚡ 낙뢰 감지 — 즉시 안전한 곳으로 대피하세요
              </div>
            )}

            {/* 일출/일몰 */}
            {(isConditionsLoading || conditionsResult) && (
              <div className={styles.sunRow}>
                <div className={styles.sunItem}>
                  <span className={styles.sunIcon}>🌅</span>
                  <span className={styles.sunLabel}>일출</span>
                  {isConditionsLoading
                    ? <span className={styles.sunSkeleton} />
                    : <span className={styles.sunTime}>{conditionsResult?.sunriseTime ?? '—'}</span>}
                </div>
                <div className={styles.sunDivider} />
                <div className={styles.sunItem}>
                  <span className={styles.sunIcon}>🌇</span>
                  <span className={styles.sunLabel}>일몰</span>
                  {isConditionsLoading
                    ? <span className={styles.sunSkeleton} />
                    : <span className={styles.sunTime}>{conditionsResult?.sunsetTime ?? '—'}</span>}
                </div>
              </div>
            )}

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

          </div>

          <div className={styles.waveWrap}>
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={styles.wave}>
              <path d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z" fill="#EFF6FF" />
            </svg>
          </div>
        </section>

        {/* ─── 출조 경고 배너 ─── */}
        {conditionsResult?.outingStatus !== 'SAFE' && conditionsResult?.outingWarning && (
          <div className={`${styles.outingBanner} ${conditionsResult.outingStatus === 'IMPOSSIBLE' ? styles.outingImpossible : styles.outingCaution}`}>
            <span className={styles.outingIcon}>{conditionsResult.outingStatus === 'IMPOSSIBLE' ? '⛔' : '⚠️'}</span>
            <span>{conditionsResult.outingWarning}</span>
          </div>
        )}

        {/* ─── 어종별 조황 기대도 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>어종별 조황 기대도</h2>
              <div className={styles.sectionSubWrap}>
                {conditionsResult && (
                  <span className={styles.sectionPointName}>{conditionsResult.pointName}</span>
                )}
                <span className={styles.sectionSub}>{timeStr}</span>
              </div>
            </div>

            {analysisError && <div className={styles.errorBanner}>⚠️ {analysisError}</div>}

            {!selectedPointId && !isAnalysisLoading && (
              <div className={styles.hintBox}>
                위에서 시/도와 낚시 포인트를 선택하면 AI 조황 분석이 시작됩니다.
              </div>
            )}

            {conditionsResult?.outingStatus === 'IMPOSSIBLE' ? (
              <div className={styles.impossibleBox}>
                <span className={styles.impossibleIcon}>⛔</span>
                <p className={styles.impossibleTitle}>출조 불가 조건</p>
                <p className={styles.impossibleDesc}>현재 기상 조건이 위험 수준입니다. 어종 점수 분석이 제공되지 않습니다.</p>
              </div>
            ) : (
              <>
                {isAnalysisLoading ? (
                  /* 스켈레톤 로딩 */
                  <div className={styles.fishGrid}>
                    {[1,2,3,4].map((i) => <div key={i} className={styles.fishSkeleton} />)}
                  </div>
                ) : (
                  <div className={styles.fishGrid}>
                    {fishCards.map((fish) => (
                      <FishProbabilityCard key={fish.id} fish={fish}
                        onClick={analysisResult?.results
                          ? () => {
                              const next = expandedSpecies === fish.name ? null : fish.name;
                              setExpandedSpecies(next);
                              if (next) {
                                setTimeout(() => {
                                  document.getElementById(`reason-${next}`)
                                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }, 50);
                              }
                            }
                          : undefined} />
                    ))}
                  </div>
                )}
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

        {/* ─── AI 상세 분석 ─── */}
        {analysisResult?.results && analysisResult.results.length > 0 && (
          <section className={`${styles.section} ${styles.sectionAlt}`}>
            <div className={styles.sectionInner}>
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
                          <ReasonSection title="📊 현재 상황" text={r.conditionReason} />
                        )}
                        {r.pointReason && (
                          <ReasonSection title="📍 포인트 적합성" text={r.pointReason} />
                        )}
                        {r.strategy && (
                          <ReasonSection title="🎯 공략 방향" text={r.strategy} />
                        )}
                        {r.tackle && (
                          <>
                            <ReasonSection title="🎣 채비 운용" text={r.tackle} />
                            <div className={styles.tackleShopLink}>
                              <span className={styles.tackleShopLabel}>샌드웍스 링크입니다</span>
                              <a
                                href="https://smartstore.naver.com/daehat?NaPm=ct%3D1jqba9282%7Cci%3Dshopn%7Ctr%3Dmktlnk%7Chk%3D84a6d35bbdeda97b7ef76055cc79a65840af3e29%7Ctrx%3Dundefined"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.tackleShopBtn}
                                onClick={(e) => e.stopPropagation()}
                              >
                                🛒 샌드웍스로 바로가기
                              </a>
                            </div>
                          </>
                        )}
                        {r.caution && (
                          <ReasonSection title="⚠️ 주의사항" text={r.caution} />
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

        {/* ─── 회유성 조황 게시판 미리보기 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2
                className={styles.sectionTitle}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/migratory-posts')}
                title="전체 회유성 조황 게시판 보기"
              >
                🐟 회유성 조황 게시판
                <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>›</span>
              </h2>
              {isLoggedIn && (
                <button
                  onClick={() => navigate('/migratory-posts')}
                  style={{
                    padding: '7px 16px', background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  글쓰기
                </button>
              )}
            </div>
            {migratoryPostsPreview.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontSize: 14 }}>
                아직 등록된 게시글이 없습니다.
              </p>
            ) : (
              <div className={styles.previewList}>
                {migratoryPostsPreview.map(item => (
                  <div
                    key={item.id}
                    className={styles.previewCard}
                    onClick={() => navigate('/migratory-posts', { state: { openPostId: item.id } })}
                  >
                    <div className={styles.previewMain}>
                      <div className={styles.previewCardTop}>
                        <span className={styles.previewSpeciesBadge}>
                          {item.speciesDisplayNames?.join('·') ?? ''}
                        </span>
                        <span className={styles.previewTitle}>{item.title}</span>
                      </div>
                      <div className={styles.previewCardBottom}>
                        {item.pointName
                          ? <span className={styles.previewPointBadge}>📍 {item.pointName}</span>
                          : <span />}
                        <span className={styles.previewAuthor}>{item.authorNickname}</span>
                        {item.photoUrls?.length > 0 && <span className={styles.previewMetaIcon}>📷</span>}
                        {(item.commentCount ?? 0) > 0 && <span className={styles.previewMetaIcon}>💬 {item.commentCount}</span>}
                      </div>
                    </div>
                    <div className={styles.previewDates}>
                      <span className={styles.previewDate}>작성일 {formatDateTime(item.createdAt)}</span>
                      <span className={styles.previewWriteDate}>잡은 날짜 {item.caughtAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => navigate('/migratory-posts')}
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

        {/* ─── 조황 게시판 미리보기 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2
                className={styles.sectionTitle}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => navigate('/fishing-posts')}
                title="전체 조황 게시판 보기"
              >
                🐟 조황 게시판
                <span style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>›</span>
              </h2>
              {isLoggedIn && (
                <button
                  onClick={() => navigate('/fishing-posts')}
                  style={{
                    padding: '7px 16px', background: 'var(--color-primary)', color: '#fff',
                    border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  글쓰기
                </button>
              )}
            </div>
            {fishingPostsPreview.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontSize: 14 }}>
                아직 등록된 게시글이 없습니다.
              </p>
            ) : (
              <div className={styles.previewList}>
                {fishingPostsPreview.map(item => (
                  <div
                    key={item.id}
                    className={styles.previewCard}
                    onClick={() => navigate('/fishing-posts', { state: { openPostId: item.id } })}
                  >
                    <div className={styles.previewMain}>
                      <div className={styles.previewCardTop}>
                        <span className={styles.previewTitle}>{item.title}</span>
                      </div>
                      <div className={styles.previewCardBottom}>
                        {item.pointName
                          ? <span className={styles.previewPointBadge}>📍 {item.pointName}</span>
                          : <span className={styles.previewNoPointBadge}>포인트 미지정</span>}
                        <span className={styles.previewAuthor}>{item.authorNickname}</span>
                        {item.photoUrls?.length > 0 && <span className={styles.previewMetaIcon}>📷</span>}
                        {(item.commentCount ?? 0) > 0 && <span className={styles.previewMetaIcon}>💬 {item.commentCount}</span>}
                      </div>
                    </div>
                    <div className={styles.previewDates}>
                      <span className={styles.previewDate}>작성일 {formatDateTime(item.createdAt)}</span>
                      {item.caughtAt && <span className={styles.previewWriteDate}>잡은 날짜 {item.caughtAt}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={() => navigate('/fishing-posts')}
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
          <div className={styles.sectionInner}>
            <NoticeBoard isAdmin={isAdmin} navigateOnClick />
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>🎣 Walking Hook</span>
          <span className={styles.footerCopy}>실시간 조황 예측 서비스</span>
        </div>
      </footer>

      <ConditionInfoSheet infoKey={activeInfoKey} onClose={handleInfoClose} />
      <LoginModal open={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      {migratoryMapOpen && <MigratoryMapModal onClose={() => setMigratoryMapOpen(false)} />}
      {allPointsMapOpen && <AllMigratoryPointsMapModal onClose={() => setAllPointsMapOpen(false)} />}
    </div>
  );
}

/* ─── 조건 설명 바텀시트 ─── */
function ConditionInfoSheet({ infoKey, onClose }: {
  infoKey: ConditionInfoKey | null;
  onClose: () => void;
}) {
  const info = infoKey ? CONDITION_INFO[infoKey] : null;

  useEffect(() => {
    if (!infoKey) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [infoKey, onClose]);

  if (!info) return null;

  return (
    <div className={styles.infoOverlay} onClick={onClose}>
      <div className={styles.infoSheet} onClick={e => e.stopPropagation()}>
        <div className={styles.infoSheetHandle} />
        <h3 className={styles.infoSheetTitle}>{info.title}</h3>
        <p className={styles.infoSheetSubtitle}>{info.subtitle}</p>
        <div className={styles.infoRowList}>
          {info.rows.map((row) => (
            <div key={row.label} className={`${styles.infoRow} ${row.highlight ? styles.infoRowHighlight : ''}`}>
              <span className={styles.infoRowLabel}>{row.label}</span>
              <span className={styles.infoRowDesc}>{row.desc}</span>
            </div>
          ))}
        </div>
        <button className={styles.infoSheetClose} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

/* ─── 조건 카드 ─── */
function ConditionCard({ icon, label, value, loading, className, source, desc, infoKey, onInfoClick }: {
  icon?: string; label: string; value: string | null; loading?: boolean; className?: string;
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
  const moon = getWaterMoonIcon(waterNumber);
  return (
    <div
      className={`${styles.conditionCard} ${styles.waterNumberCard} ${loading ? styles.conditionCardLoading : ''} ${onInfoClick ? styles.conditionCardClickable : ''}`}
      onClick={onInfoClick ? () => onInfoClick('몇물') : undefined}
      role={onInfoClick ? 'button' : undefined}
    >
      <span className={styles.waterMoonEmoji}>{moon}</span>
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
          <span className={styles.tideTimelineTitle}>🌊 오늘의 조석</span>
        </div>
        <div className={styles.tideTimelineSkeleton} style={{ height: `${TOTAL_H}px` }} />
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className={styles.tideTimeline}>
        <div className={styles.tideTimelineHeader}>
          <span className={styles.tideTimelineTitle}>🌊 오늘의 조석</span>
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
        <span className={styles.tideTimelineTitle}>🌊 오늘의 조석</span>
        {stationName && <span className={styles.tideTimelineStation}>{stationName} 기준</span>}
      </div>
      <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className={styles.tideChartSvg}>
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#0EA5E9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.04" />
          </linearGradient>
          <clipPath id="tideClip">
            <rect x={PAD.left} y={PAD.top} width={chartW} height={CHART_H} />
          </clipPath>
        </defs>

        {/* 그라디언트 채우기 */}
        <path d={fillPath} fill="url(#tideGrad)" clipPath="url(#tideClip)" />
        {/* 코사인 파형 선 */}
        <path d={linePath} fill="none" stroke="#38BDF8" strokeWidth="3" strokeLinejoin="round" clipPath="url(#tideClip)" />

        {/* 자정 경계선 + 내일 pill (지금 pill과 같은 상단 레인) */}
        {(() => {
          const label = `내일 ${now.getMonth() + 1}/${new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate()}`;
          const pillW = 52;
          const pillCx = Math.min(W - pillW / 2 - 8, Math.max(pillW / 2 + 8, midnightX));
          return (
            <>
              <line x1={midnightX} y1={20} x2={midnightX} y2={bottomY}
                stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="4,4" />
              <rect x={pillCx - pillW / 2} y={1} width={pillW} height="18" rx="9"
                fill="rgba(255,255,255,0.18)" />
              <text x={pillCx} y={13} textAnchor="middle" fontSize="10"
                fill="rgba(255,255,255,0.9)" fontWeight="700">{label}</text>
            </>
          );
        })()}

        {/* 현재 시각 — "지금 HH:MM" pill (SVG 상단 고정) + 세로 점선 */}
        <rect x={nowPillCx - nowPillW / 2} y={1} width={nowPillW} height="18" rx="9"
          fill="#FDE047" opacity="0.95" />
        <text x={nowPillCx} y={13} textAnchor="middle" fontSize="10" fill="#1E3A5F" fontWeight="900">
          {`지금 ${nowTimeStr}`}
        </text>
        <line x1={nowX} y1={20} x2={nowX} y2={bottomY}
          stroke="#FDE047" strokeWidth="2.5" strokeDasharray="5,3" />

        {/* 일출/일몰 — 아이콘 + 시간 텍스트 */}
        {[
          { time: sunriseTime, icon: '🌅' },
          { time: sunsetTime,  icon: '🌇' },
        ].map(({ time, icon }) => {
          if (!time) return null;
          const [hh, mm] = time.split(':').map(Number);
          const sunMin = hh * 60 + mm;
          if (sunMin >= RANGE_END) return null;
          const sx = xOf(sunMin);
          const sy = yOf(heightAt(sunMin)) - 14;
          return (
            <g key={icon}>
              <text x={sx} y={sy} textAnchor="middle" fontSize="14">{icon}</text>
              <text x={sx} y={sy + 13} textAnchor="middle" fontSize="9"
                fill="rgba(255,255,255,0.7)" fontWeight="500">{time}</text>
            </g>
          );
        })}

        {/* 만조/간조 — 핀은 파형 위 실제 위치, 레이블은 상단/하단 고정 레인 */}
        {sorted.map((e, i) => {
          const ex = xOf(mins[i]);
          const ey = yOf(e.heightCm);
          const isPast    = mins[i] < nowMin && (e.dayOffset ?? 0) === 0;
          const isHigh    = e.highTide;
          const dotColor  = isHigh ? '#4ADE80' : '#F87171';
          const glowColor = isHigh ? '#16A34A' : '#DC2626';
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
                  <text x={ex} y={HI_TIME_Y} textAnchor="middle" fontSize="13" fill="white"    fontWeight="900">{e.time}</text>
                  <text x={ex} y={HI_TYPE_Y} textAnchor="middle" fontSize="12" fill={dotColor} fontWeight="800">{typeLabel}</text>
                  <text x={ex} y={HI_HT_Y}   textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.9)" fontWeight="700">{e.heightCm}cm</text>
                </>
              ) : (
                /* 간조 — 하단 고정 레인 */
                <>
                  {ey + 13 < bottomY - 5 && (
                    <line x1={ex} y1={ey + 13} x2={ex} y2={bottomY + 4}
                      stroke={dotColor} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.45" />
                  )}
                  <text x={ex} y={LO_TIME_Y} textAnchor="middle" fontSize="13" fill="white"    fontWeight="900">{e.time}</text>
                  <text x={ex} y={LO_TYPE_Y} textAnchor="middle" fontSize="12" fill={dotColor} fontWeight="800">{typeLabel}</text>
                  <text x={ex} y={LO_HT_Y}   textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.9)" fontWeight="700">{e.heightCm}cm</text>
                </>
              )}
              <circle cx={ex} cy={ey} r="13" fill={glowColor} opacity="0.5" />
              <circle cx={ex} cy={ey} r="9"  fill={dotColor} />
              <circle cx={ex} cy={ey} r="6"  fill={dotColor} stroke="white" strokeWidth="3" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── 실시간 회유성 정보 카카오맵 모달 ─── */
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

const MIGRATORY_SPECIES_COLORS: Record<string, string> = {
  SAMCHI:     '#F59E0B',
  BANGEO:     '#3B82F6',
  BUSSIRI:    '#8B5CF6',
  JATBANGEO:  '#6D28D9',
  MACKEREL:   '#10B981',
  TUNA:       '#EF4444',
  JEONGAENGI: '#0EA5E9',
};

const MIGRATORY_SPECIES_KO: Record<string, string> = {
  SAMCHI:'삼치', BANGEO:'방어', BUSSIRI:'부시리', JATBANGEO:'잿방어', MACKEREL:'고등어', TUNA:'참치', JEONGAENGI:'전갱이',
};

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
      navigate('/migratory-posts', { state: { openPostId: postId } });
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
      import('../api/migratoryPostApi'),
      import('../api/fishingZoneApi'),
      loadKakaoSDK(appKey),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ]).then(([migratoryPostApi, fishingZoneApi]): any => {
      if (cancelled || !mapRef.current) return;
      return Promise.all([
        migratoryPostApi.getTodayMigratoryMarkers().catch(() => []),
        fishingZoneApi.fetchFishingZones().catch(() => []),
      ]).then(([markers, fishingZones]) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;

      // 게시글 목록 HTML 생성 (최초 로딩·화살표 페이지 이동 공통)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buildPostListHtml = (posts: any[]) => posts.map((p: any) => {
        const pBadges = (p.species as string[]).map((s: string) => {
          const color = MIGRATORY_SPECIES_COLORS[s] ?? '#0B3D91';
          const label = MIGRATORY_SPECIES_KO[s] ?? s;
          return `<span style="display:inline-block;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:700;background:${color}20;color:${color};margin-right:2px;">${escapeHtml(label)}</span>`;
        }).join('');
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
        ${pointName ? `<div style="font-size:13px;font-weight:700;color:#0B3D91;margin-bottom:6px;padding-right:26px;">📍 ${escapeHtml(pointName)}</div>` : ''}
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
        migratoryPostApi.getTodayMigratoryPostsByPoint(pointId, nextPage, 3).then((result) => {
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
          level: 12,
        });

        // 모달이 막 열리는 시점엔 컨테이너 레이아웃이 아직 확정되지 않아
        // 지도 타일이 실제 크기보다 작게 잡히는 문제가 있어 보정한다.
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        // ── 낚시 금지·제한구역 폴리곤 ──────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fishingZones as any[]).forEach((zone: any) => {
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
              content: `<div style="padding:12px 14px;width:220px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;word-break:keep-all;overflow-wrap:break-word;white-space:normal;">
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

            // 어종 뱃지 목록
            const speciesBadges = (m.species as string[]).map((s: string) => {
              const color = MIGRATORY_SPECIES_COLORS[s] ?? '#0B3D91';
              const label = MIGRATORY_SPECIES_KO[s] ?? s;
              return `<span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;background:${color}20;color:${color};margin:2px 2px 2px 0;">${escapeHtml(label)}</span>`;
            }).join('');

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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 860, height: '80vh', maxHeight: 640,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          touchAction: 'auto', overscrollBehavior: 'contain',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
              🐟 실시간 회유성 정보(지도)
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
              오늘 등록된 회유성 조황이 없습니다
            </div>
          )}

          <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'pan-x pan-y' }} />
        </div>

        {/* 안내 문구 */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--color-border)',
          flexShrink: 0, background: 'var(--color-bg)',
        }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>📍 핀을 클릭하면 어종과 조황을 확인할 수 있습니다</span>
        </div>
      </div>
    </div>
  );
}

/* ─── 모든 낚시(회유성 어종) 포인트 지도 모달 ─── */
function AllMigratoryPointsMapModal({ onClose }: { onClose: () => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const hasAppKey = !!(import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined);
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(hasAppKey ? 'loading' : 'error');
  const [errorMsg, setErrorMsg] = useState(hasAppKey ? '' : '.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
  const [pointCount, setPointCount] = useState(0);

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
      fetchFishingZones().catch(() => [] as FishingZone[]),
    ]).then(([, points, zones]) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;

      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 12,
        });

        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        // 낚시 금지·제한구역 폴리곤
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
            const zoneInfoWindow = new kakao.maps.InfoWindow({
              content: `<div style="padding:12px 14px;width:220px;box-sizing:border-box;font-family:'Pretendard','Noto Sans KR',sans-serif;word-break:keep-all;overflow-wrap:break-word;white-space:normal;">
                <strong style="font-size:14px;color:${color};display:block;">${escapeHtml(zone.name)}</strong>
                <div style="font-size:11px;color:#94A3B8;margin:3px 0 6px;">${zone.zoneType === 'PROHIBITED' ? '🔴 낚시금지구역' : '🟠 낚시제한구역'}</div>
                ${zone.description ? `<p style="font-size:12px;color:#334155;margin:0;line-height:1.5;">${escapeHtml(zone.description)}</p>` : ''}
              </div>`,
              removable: true,
            });
            kakao.maps.event.addListener(poly, 'click', (e: { latLng: unknown }) => {
              zoneInfoWindow.setPosition(e.latLng);
              zoneInfoWindow.open(map);
            });
          } catch {
            // GeoJSON 파싱 실패 시 무시
          }
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
          };

          const markers = validPoints.map((p) => {
            const position = new kakao.maps.LatLng(p.latitude, p.longitude);
            const marker = new kakao.maps.Marker({ position });

            // 포인트 이름만 표시 — 회유성 어종 정보는 노출하지 않음
            const nameContent = `<div style="padding:5px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">📍 ${escapeHtml(p.name)}</div>`;

            // 클릭 시 큰 ✕ 버튼으로 직접 닫기 전까지 이름이 고정되는 InfoWindow
            const pinnedContent = `<div style="position:relative;padding:7px 34px 7px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">
              📍 ${escapeHtml(p.name)}
              <button onclick="window.__closeAllPointsInfo('${p.id}')" style="position:absolute;top:3px;right:3px;width:26px;height:26px;border:none;background:#F1F5F9;border-radius:50%;font-size:14px;font-weight:700;color:#64748B;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>`;
            const pinnedInfoWindow = new kakao.maps.InfoWindow({ content: pinnedContent, removable: false });
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
              pinnedInfoWindow.open(map, marker);
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
          width: '100%', maxWidth: 860, height: '80vh', maxHeight: 640,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          touchAction: 'auto', overscrollBehavior: 'contain',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--color-border)', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
              🗺️ 모든 낚시 포인트
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

          <div ref={mapRef} style={{ width: '100%', height: '100%', touchAction: 'pan-x pan-y' }} />
        </div>

        {/* 안내 문구 */}
        <div style={{
          padding: '8px 16px', borderTop: '1px solid var(--color-border)',
          flexShrink: 0, background: 'var(--color-bg)',
        }}>
          <span style={{ fontSize: 12, color: '#64748B' }}>📍 핀을 클릭하면 포인트 이름을 확인할 수 있습니다 · 지도를 축소하면 숫자로 묶여 표시됩니다</span>
        </div>
      </div>
    </div>
  );
}
