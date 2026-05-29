import { useState, useEffect, useRef } from 'react';
import Header from '../components/common/Header';
import LoginModal from '../components/common/LoginModal';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import {
  fetchProvinces, fetchFishingPointsByProvince, analyzeFishingPoint,
  type ProvinceItem, type FishingPointMapMarker, type FishingAnalysisResult, type SpeciesAnalysis,
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

  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    if (!selectedPointId) { setAnalysisResult(null); return; }
    // 비로그인 상태면 로그인 모달 띄우고 분석 중단
    if (!isLoggedIn) {
      setLoginOpen(true);
      setSelectedPointId('');
      return;
    }
    // 포인트 바뀌면 즉시 이전 데이터 지우고 로딩 상태로
    setAnalysisResult(null);
    setIsAnalyzing(true);
    setAnalysisError('');
    setExpandedSpecies(null);
    analyzeFishingPoint(selectedPointId)
      .then(setAnalysisResult)
      .catch((err) => setAnalysisError(err?.response?.data?.message ?? '분석 중 오류가 발생했습니다.'))
      .finally(() => setIsAnalyzing(false));
  }, [selectedPointId, isLoggedIn]);

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 기준`;

  const fishCards: FishData[] = analysisResult?.results
    ? buildFishCards(analysisResult.results)
    : FISH_LIST.map((f) => ({ ...f, probability: null }));

  const hasPrecip = analysisResult?.precipitationType && analysisResult.precipitationType !== '없음';

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
              <ConditionCard icon="🌡" label="수온" loading={isAnalyzing}
                value={analysisResult?.waterTemp != null ? `${analysisResult.waterTemp}℃` : null} />
              <ConditionCard icon="🌊" label="파고" loading={isAnalyzing}
                value={analysisResult?.waveHeight != null ? `${analysisResult.waveHeight}m` : null} />
              <ConditionCard icon="💨" label="풍속" loading={isAnalyzing}
                value={analysisResult?.windSpeed != null ? `${analysisResult.windSpeed}m/s` : null} />
              <WindDirectionCard direction={analysisResult?.windDirection ?? null} loading={isAnalyzing} />
              <ConditionCard icon="🔄" label="물때" loading={isAnalyzing}
                value={analysisResult?.tideDescription ?? null} />
              {/* 하늘상태 */}
              <ConditionCard
                icon={analysisResult?.sky ? (SKY_ICON[analysisResult.sky] ?? '🌤') : '🌤'}
                label="하늘"
                loading={isAnalyzing}
                value={analysisResult?.sky ?? null}
              />
              {/* 강수 — 없음이면 숨김, 있으면 표시 */}
              {(isAnalyzing || hasPrecip) && (
                <ConditionCard
                  icon={analysisResult?.precipitationType ? (PTY_ICON[analysisResult.precipitationType] ?? '🌧') : '🌧'}
                  label="강수"
                  loading={isAnalyzing}
                  value={hasPrecip
                    ? `${analysisResult!.precipitationType}${analysisResult!.precipitationAmount != null ? ` ${analysisResult!.precipitationAmount}mm` : ''}`
                    : null}
                  className={styles.conditionCardFull}
                />
              )}
            </div>

            {/* 낙뢰 경고 */}
            {analysisResult?.hasLightning && (
              <div className={styles.lightningBanner}>
                ⚡ 낙뢰 감지 — 즉시 안전한 곳으로 대피하세요
              </div>
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
            {(isAnalyzing || analysisResult) ? (
              <div className={styles.currentPointChip}>
                {analysisResult?.pointName ?? (isAnalyzing ? '분석 중...' : '')}
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
        {analysisResult?.outingStatus !== 'SAFE' && analysisResult?.outingWarning && (
          <div className={`${styles.outingBanner} ${analysisResult.outingStatus === 'IMPOSSIBLE' ? styles.outingImpossible : styles.outingCaution}`}>
            <span className={styles.outingIcon}>{analysisResult.outingStatus === 'IMPOSSIBLE' ? '⛔' : '⚠️'}</span>
            <span>{analysisResult.outingWarning}</span>
          </div>
        )}

        {/* ─── 어종별 조황 기대도 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>어종별 조황 기대도</h2>
              <div className={styles.sectionSubWrap}>
                {analysisResult && (
                  <span className={styles.sectionPointName}>{analysisResult.pointName}</span>
                )}
                <span className={styles.sectionSub}>{timeStr}</span>
              </div>
            </div>

            {analysisError && <div className={styles.errorBanner}>⚠️ {analysisError}</div>}

            {!selectedPointId && !isAnalyzing && (
              <div className={styles.hintBox}>
                위에서 시/도와 낚시 포인트를 선택하면 AI 조황 분석이 시작됩니다.
              </div>
            )}

            {analysisResult?.outingStatus === 'IMPOSSIBLE' ? (
              <div className={styles.impossibleBox}>
                <span className={styles.impossibleIcon}>⛔</span>
                <p className={styles.impossibleTitle}>출조 불가 조건</p>
                <p className={styles.impossibleDesc}>현재 기상 조건이 위험 수준입니다. 어종 점수 분석이 제공되지 않습니다.</p>
              </div>
            ) : (
              <>
                {isAnalyzing ? (
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
                {isAnalyzing && (
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
function ConditionCard({ icon, label, value, loading, className }: {
  icon: string; label: string; value: string | null; loading?: boolean; className?: string;
}) {
  return (
    <div className={`${styles.conditionCard} ${loading ? styles.conditionCardLoading : ''} ${className ?? ''}`}>
      <span className={styles.conditionCardIcon}>{icon}</span>
      <span className={styles.conditionCardLabel}>{label}</span>
      {loading
        ? <span className={styles.conditionCardSkeleton}>분석 중...</span>
        : <span className={styles.conditionCardValue}>{value ?? '—'}</span>}
    </div>
  );
}

/* ─── 풍향 나침반 카드 ─── */
function WindDirectionCard({ direction, loading }: { direction: string | null; loading?: boolean }) {
  const deg = direction ? (DIRECTION_DEG[direction] ?? 0) : 0;

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
