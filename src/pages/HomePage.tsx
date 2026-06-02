import { useState, useEffect, useRef } from 'react';
import Header from '../components/common/Header';
import LoginModal from '../components/common/LoginModal';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import {
  fetchProvinces, fetchFishingPointsByProvince, fetchConditions, analyzeFishingPoint,
  type ProvinceItem, type FishingPointMapMarker,
  type FishingConditionsResult, type FishingAnalysisResult,
  type SpeciesAnalysis, type TideEvent, type TidePoint, TIDE_FLOW_LABELS,
} from '../api/fishingPointApi';
import { useAuth } from '../context/AuthContext';
import styles from './HomePage.module.css';

const FISH_META: Record<string, Pick<FishData, 'id' | 'colorFrom' | 'colorTo'>> = {
  '광어':   { id: 'flatfish',   colorFrom: '#0077B6', colorTo: '#0096C7' },
  '감성돔': { id: 'blackporgy', colorFrom: '#5A189A', colorTo: '#7B2FBE' },
  '우럭':   { id: 'rockfish',   colorFrom: '#005F73', colorTo: '#0A9396' },
  '농어':   { id: 'seabass',    colorFrom: '#AE2012', colorTo: '#CA6702' },
};

const DIRECTION_DEG: Record<string, number> = {
  '북': 0, '북동': 45, '동': 90, '남동': 135,
  '남': 180, '남서': 225, '서': 270, '북서': 315,
};

const SKY_ICON: Record<string, string> = {
  '맑음': '☀️', '구름많음': '⛅', '흐림': '☁️',
};

const PTY_ICON: Record<string, string> = {
  '비': '🌧', '소나기': '🌦', '비·눈': '🌨', '눈': '❄️',
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
  const { isLoggedIn } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

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
  const [analysisError, setAnalysisError] = useState('');

  const [expandedSpecies, setExpandedSpecies] = useState<string | null>(null);

  // 지도에서 포인트 선택 시 드롭다운 동기화용 refs
  const pendingPointIdRef = useRef<string | null>(null);
  const provincesRef = useRef<ProvinceItem[]>([]);
  provincesRef.current = provinces;

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvincesError('시/도 목록을 불러오지 못했습니다.'));
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
      setLoginOpen(true);
      setSelectedPointId('');
      return;
    }

    setConditionsResult(null);
    setAnalysisResult(null);
    setIsConditionsLoading(true);
    setIsAnalysisLoading(false);
    setAnalysisError('');
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
        setAnalysisResult(analysis);
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
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />

      <main className={styles.main}>
        {/* ─── Hero ─── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBadge}>
              <span className={styles.heroBadgeDot} />
              실시간 조황 분석
            </div>
            <h1 className={styles.heroTitle}>
              오늘 낚시,
              <br />
              <span className={styles.heroAccent}>어떤 어종</span>이 잡힐까요?
            </h1>
            <p className={styles.heroDesc}>
              최적의 낚시 환경을 분석하여 정보를 제공합니다.
              <br />
              포인트를 선택하면 AI가 실시간으로 조황을 분석합니다.
            </p>

            {/* 조건 카드 그리드 */}
            <div className={styles.conditionCards}>
              <ConditionCard icon="🌡" label="수온" loading={isConditionsLoading}
                value={conditionsResult?.waterTemp != null ? `${conditionsResult.waterTemp}℃` : null}
                source={conditionsResult?.marineSourceLabel} />
              <ConditionCard icon="🌊" label="파고" loading={isConditionsLoading}
                value={conditionsResult?.waveHeight != null ? `${conditionsResult.waveHeight}m` : null}
                source={conditionsResult?.marineSourceLabel} />
              <ConditionCard icon="💨" label="풍속" loading={isConditionsLoading}
                value={conditionsResult?.windSpeed != null ? `${conditionsResult.windSpeed}m/s` : null}
                source={conditionsResult?.windSourceLabel} />
              <WindDirectionCard direction={conditionsResult?.windDirection ?? null} loading={isConditionsLoading}
                source={conditionsResult?.windSourceLabel} />
              <ConditionCard icon="🔄" label="물때" loading={isConditionsLoading}
                value={conditionsResult?.tideDescription ?? null}
                source={conditionsResult?.tideSourceLabel} />
              <ConditionCard icon="🌊" label="조류" loading={isConditionsLoading}
                value={conditionsResult?.tideFlowPhase
                  ? TIDE_FLOW_LABELS[conditionsResult.tideFlowPhase]
                  : null}
                source={conditionsResult?.tideSourceLabel} />
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
              <ConditionCard
                icon={hasPrecip && conditionsResult?.precipitationType ? (PTY_ICON[conditionsResult.precipitationType] ?? '🌧') : '🌧'}
                label="강수"
                loading={isConditionsLoading}
                value={
                  conditionsResult == null ? null
                  : hasPrecip
                    ? `${conditionsResult.precipitationType}${conditionsResult.precipitationAmount != null ? ` ${conditionsResult.precipitationAmount}mm` : ''}`
                    : `${conditionsResult.precipitationAmount ?? 0}mm`
                }
                source={conditionsResult?.precipitationSourceLabel}
              />
            </div>

            {/* 낙뢰 경고 */}
            {conditionsResult?.hasLightning && (
              <div className={styles.lightningBanner}>
                ⚡ 낙뢰 감지 — 즉시 안전한 곳으로 대피하세요
              </div>
            )}

            {/* 조석 그래프 — 조건 로딩 중이거나 결과 있으면 표시 */}
            {(isConditionsLoading || conditionsResult) && (
              <TideChart
                events={conditionsResult?.tideEvents ?? null}
                series={conditionsResult?.tideSeries ?? null}
                stationName={conditionsResult?.tideStationName ?? null}
                loading={isConditionsLoading}
              />
            )}

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
                onClick={() => window.open('/map', 'kakaomap', 'width=900,height=680,resizable=yes')}>
                지도 보기
              </button>
            </div>

            {/* 현재 선택된 포인트 표시 / 미선택 안내 */}
            {(isAnalyzing || conditionsResult) ? (
              <div className={styles.currentPointChip}>
                {conditionsResult?.pointName ?? (isAnalyzing ? '분석 중...' : '')}
              </div>
            ) : (
              <p className={styles.selectPrompt}>
                시/도와 낚시 포인트를 선택하거나, 지도에서 핀을 클릭하세요.
              </p>
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
                          ? () => setExpandedSpecies(expandedSpecies === fish.name ? null : fish.name)
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
                          <ReasonSection title="📊 조황 이유" text={r.conditionReason} />
                        )}
                        {r.pointReason && (
                          <ReasonSection title="📍 포인트 적합성" text={r.pointReason} />
                        )}
                        {r.strategy && (
                          <ReasonSection title="🎯 공략 방향" text={r.strategy} />
                        )}
                        {r.tackle && (
                          <ReasonSection title="🎣 채비 운용" text={r.tackle} />
                        )}
                        {r.caution && (
                          <ReasonSection title="⚠️ 주의사항" text={r.caution} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ─── 커뮤니티 게시판 ─── */}
        <section className={`${styles.section} ${analysisResult?.results ? '' : styles.sectionAlt}`}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>커뮤니티 조황 게시판</h2>
              <span className={styles.sectionSub}>낚시 조황을 공유해보세요</span>
            </div>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎣</div>
              <p className={styles.emptyTitle}>아직 게시물이 없습니다</p>
              <p className={styles.emptyDesc}>
                물고기를 잡으셨나요? 첫 조황 게시물을 올려주세요!<br />
                여러분의 데이터가 조황 확률에 반영됩니다.
              </p>
              <button className={styles.emptyBtn}>게시물 작성하기</button>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>🎣 Walking Hook</span>
          <span className={styles.footerCopy}>실시간 조황 예측 서비스</span>
        </div>
        <div className={styles.footerAttrib}>
          기상 데이터 출처: 기상청 기상자료개방포털&nbsp;
          <a href="https://data.kma.go.kr" target="_blank" rel="noopener noreferrer" className={styles.footerAttribLink}>
            data.kma.go.kr
          </a>
          &nbsp;· 공공누리 제1유형
        </div>
      </footer>
    </div>
  );
}

/* ─── 조건 카드 ─── */
function ConditionCard({ icon, label, value, loading, className, source }: {
  icon: string; label: string; value: string | null; loading?: boolean; className?: string; source?: string | null;
}) {
  return (
    <div className={`${styles.conditionCard} ${loading ? styles.conditionCardLoading : ''} ${className ?? ''}`}>
      <span className={styles.conditionCardIcon}>{icon}</span>
      <span className={styles.conditionCardLabel}>{label}</span>
      {loading
        ? <span className={styles.conditionCardSkeleton}>분석 중...</span>
        : <span className={styles.conditionCardValue}>{value ?? '—'}</span>}
      {!loading && source && (
        <span className={styles.conditionCardSource}>{source}</span>
      )}
    </div>
  );
}

/* ─── 풍향 나침반 카드 ─── */
function WindDirectionCard({ direction, loading, source }: { direction: string | null; loading?: boolean; source?: string | null }) {
  // "동→서" 형식에서 도착 방향(→ 뒤)으로 나침반 회전
  const toPart = direction?.includes('→') ? direction.split('→')[1] : direction;
  const deg = toPart ? (DIRECTION_DEG[toPart] ?? 0) : 0;

  return (
    <div className={`${styles.conditionCard} ${loading ? styles.conditionCardLoading : ''}`}>
      <div className={styles.compass}>
        {/* 나침반 원 */}
        <div className={styles.compassRing}>
          <span className={styles.compassN}>N</span>
          <span className={styles.compassS}>S</span>
          <span className={styles.compassW}>W</span>
          <span className={styles.compassE}>E</span>
          {/* 풍향 화살표 — 바람이 오는 방향을 가리킴 */}
          <svg
            className={styles.compassArrow}
            style={{ transform: `translate(-50%, -50%) rotate(${deg}deg)` }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M12 3 L16 14 L12 11 L8 14 Z" fill="#00D9FF" />
            <path d="M12 21 L8 10 L12 13 L16 10 Z" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>
      </div>
      <span className={styles.conditionCardLabel}>풍향</span>
      {loading
        ? <span className={styles.conditionCardSkeleton}>분석 중...</span>
        : <span className={styles.conditionCardValue}>{direction ?? '—'}</span>}
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
function TideChart({ events, series: _series, stationName, loading }: {
  events: TideEvent[] | null;
  series: TidePoint[] | null;
  stationName: string | null;
  loading?: boolean;
}) {
  const W = 600;
  const PAD = { top: 34, bottom: 52, left: 10, right: 10 };
  const CHART_H = 88;
  const TOTAL_H = PAD.top + CHART_H + PAD.bottom;
  const chartW = W - PAD.left - PAD.right;
  const bottomY = PAD.top + CHART_H;

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

  // 자정 경계선 위치
  const midnightX = xOf(1440);
  const nowX = xOf(nowMin);

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

        {/* 자정 경계선 */}
        <line x1={midnightX} y1={PAD.top} x2={midnightX} y2={bottomY}
          stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeDasharray="4,4" />
        <text x={midnightX + 5} y={PAD.top + 13} textAnchor="start"
          fontSize="11" fill="rgba(255,255,255,0.75)" fontWeight="600">
          {`내일 ${now.getMonth() + 1}/${new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getDate()}`}
        </text>

        {/* 현재 시각 — 배경 pill + 텍스트 */}
        <rect x={nowX - 18} y={PAD.top - 29} width="36" height="16"
          rx="8" fill="#FDE047" opacity="0.95" />
        <text x={nowX} y={PAD.top - 17} textAnchor="middle" fontSize="11" fill="#1E3A5F" fontWeight="900">지금</text>
        <text x={nowX} y={PAD.top - 3} textAnchor="middle" fontSize="11" fill="#FDE047" fontWeight="700">
          {`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`}
        </text>
        <line x1={nowX} y1={PAD.top} x2={nowX} y2={bottomY} stroke="#FDE047" strokeWidth="2.5" strokeDasharray="5,3" />

        {/* 만조/간조 마커 */}
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
              <line x1={ex} y1={ey + 8} x2={ex} y2={bottomY + 2}
                stroke={dotColor} strokeWidth="2" strokeDasharray="4,3" />
              <circle cx={ex} cy={ey} r="13" fill={glowColor} opacity="0.5" />
              <circle cx={ex} cy={ey} r="9"  fill={dotColor} />
              <circle cx={ex} cy={ey} r="6"  fill={dotColor} stroke="white" strokeWidth="3" />
              <text x={ex} y={bottomY + 17} textAnchor="middle" fontSize="14"   fill="white"    fontWeight="900">{e.time}</text>
              <text x={ex} y={bottomY + 32} textAnchor="middle" fontSize="12.5" fill={dotColor} fontWeight="800">{typeLabel}</text>
              <text x={ex} y={bottomY + 46} textAnchor="middle" fontSize="11.5" fill="rgba(255,255,255,0.95)" fontWeight="700">{e.heightCm}cm</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
