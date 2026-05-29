import { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import {
  fetchProvinces, fetchFishingPointsByProvince, analyzeFishingPoint,
  type ProvinceItem, type FishingPointMapMarker, type FishingAnalysisResult, type SpeciesAnalysis,
} from '../api/fishingPointApi';
import styles from './HomePage.module.css';

const FISH_META: Record<string, Pick<FishData, 'id' | 'colorFrom' | 'colorTo'>> = {
  '광어':   { id: 'flatfish',   colorFrom: '#0077B6', colorTo: '#0096C7' },
  '감성돔': { id: 'blackporgy', colorFrom: '#5A189A', colorTo: '#7B2FBE' },
  '우럭':   { id: 'rockfish',   colorFrom: '#005F73', colorTo: '#0A9396' },
  '농어':   { id: 'seabass',    colorFrom: '#AE2012', colorTo: '#CA6702' },
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

  useEffect(() => {
    fetchProvinces()
      .then(setProvinces)
      .catch(() => setProvincesError('시/도 목록을 불러오지 못했습니다. 네트워크 또는 서버 상태를 확인해주세요.'));
  }, []);

  // 지도 팝업에서 핀 클릭 시 포인트 ID 수신
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'fishing-point-selected' && event.data.pointId) {
        setSelectedPointId(event.data.pointId as string);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (!selectedProvince) { setFishingPoints([]); setSelectedPointId(''); return; }
    setPointsLoading(true);
    fetchFishingPointsByProvince(selectedProvince)
      .then((pts) => {
        setFishingPoints(pts);
        setSelectedPointId(pts[0]?.id ?? '');
      })
      .catch(() => { setFishingPoints([]); setSelectedPointId(''); })
      .finally(() => setPointsLoading(false));
  }, [selectedProvince]);

  useEffect(() => {
    if (!selectedPointId) { setAnalysisResult(null); return; }
    setIsAnalyzing(true);
    setAnalysisError('');
    setExpandedSpecies(null);
    analyzeFishingPoint(selectedPointId)
      .then(setAnalysisResult)
      .catch((err) => setAnalysisError(err?.response?.data?.message ?? '분석 중 오류가 발생했습니다.'))
      .finally(() => setIsAnalyzing(false));
  }, [selectedPointId]);

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 기준`;

  const fishCards: FishData[] = analysisResult?.results
    ? buildFishCards(analysisResult.results)
    : FISH_LIST.map((f) => ({ ...f, probability: null }));

  const conditions = {
    waterTemp: analysisResult?.waterTemp ?? null,
    waveHeight: analysisResult?.waveHeight ?? null,
    windSpeed: analysisResult?.windSpeed ?? null,
    tideDescription: analysisResult?.tideDescription ?? null,
  };

  return (
    <div className={styles.page}>
      <Header />

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

            {/* 수온 / 파고 / 풍속 / 물때 카드 */}
            <div className={styles.conditionCards}>
              <ConditionCard
                icon="🌡"
                label="수온"
                value={conditions.waterTemp != null ? `${conditions.waterTemp}℃` : '—'}
                loading={isAnalyzing}
              />
              <ConditionCard
                icon="🌊"
                label="파고"
                value={conditions.waveHeight != null ? `${conditions.waveHeight}m` : '—'}
                loading={isAnalyzing}
              />
              <ConditionCard
                icon="💨"
                label="풍속"
                value={conditions.windSpeed != null ? `${conditions.windSpeed}m/s` : '—'}
                loading={isAnalyzing}
              />
              <ConditionCard
                icon="🔄"
                label="물때"
                value={conditions.tideDescription ?? '—'}
                loading={isAnalyzing}
              />
            </div>

            {/* 시/포인트 선택 */}
            {provincesError && (
              <div className={styles.errorBanner}>⚠️ {provincesError}</div>
            )}
            <div className={styles.locationBar}>
              <span className={styles.locationIcon}>📍</span>
              <select
                className={styles.locationSelect}
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
              >
                <option value="">{provincesError ? '서버 연결 실패' : '시/도 선택'}</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.code}>{p.displayName}</option>
                ))}
              </select>
              <select
                className={styles.locationSelect}
                value={selectedPointId}
                onChange={(e) => setSelectedPointId(e.target.value)}
                disabled={fishingPoints.length === 0 || pointsLoading}
              >
                <option value="">
                  {pointsLoading ? '불러오는 중...' : fishingPoints.length === 0 ? '포인트 없음' : '포인트 선택'}
                </option>
                {fishingPoints.map((fp) => (
                  <option key={fp.id} value={fp.id}>{fp.name}</option>
                ))}
              </select>
              <button
                className={styles.mapBtn}
                onClick={() => window.open('/map', 'kakaomap', 'width=900,height=680,resizable=yes')}
              >
                지도 보기
              </button>
            </div>
          </div>

          <div className={styles.waveWrap}>
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={styles.wave}>
              <path
                d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z"
                fill="#EFF6FF"
              />
            </svg>
          </div>
        </section>

        {/* ─── 출조 경고 배너 ─── */}
        {analysisResult?.outingStatus !== 'SAFE' && analysisResult?.outingWarning && (
          <div className={`${styles.outingBanner} ${analysisResult.outingStatus === 'IMPOSSIBLE' ? styles.outingImpossible : styles.outingCaution}`}>
            <span className={styles.outingIcon}>
              {analysisResult.outingStatus === 'IMPOSSIBLE' ? '⛔' : '⚠️'}
            </span>
            <span>{analysisResult.outingWarning}</span>
          </div>
        )}

        {/* ─── 어종별 조황 확률 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>어종별 조황 기대도</h2>
              <span className={styles.sectionSub}>
                {analysisResult ? `${analysisResult.pointName} · ${timeStr}` : timeStr}
              </span>
            </div>

            {/* 분석 에러 */}
            {analysisError && (
              <div className={styles.errorBanner}>⚠️ {analysisError}</div>
            )}

            {/* 포인트 미선택 안내 */}
            {!selectedPointId && !isAnalyzing && (
              <div className={styles.hintBox}>
                위에서 시/도와 낚시 포인트를 선택하면 AI 조황 분석이 시작됩니다.
              </div>
            )}

            {/* IMPOSSIBLE 상태 — 점수 없음 */}
            {analysisResult?.outingStatus === 'IMPOSSIBLE' ? (
              <div className={styles.impossibleBox}>
                <span className={styles.impossibleIcon}>⛔</span>
                <p className={styles.impossibleTitle}>출조 불가 조건</p>
                <p className={styles.impossibleDesc}>
                  현재 기상 조건이 위험 수준입니다. 어종 점수 분석이 제공되지 않습니다.
                </p>
              </div>
            ) : (
              <>
                <div className={styles.fishGrid}>
                  {fishCards.map((fish) => (
                    <FishProbabilityCard
                      key={fish.id}
                      fish={fish}
                      onClick={
                        analysisResult?.results
                          ? () => setExpandedSpecies(expandedSpecies === fish.name ? null : fish.name)
                          : undefined
                      }
                    />
                  ))}
                </div>

                {/* 분석 중 표시 */}
                {isAnalyzing && (
                  <div className={styles.analyzingBanner}>
                    <div className={styles.analyzingSpinner} />
                    AI가 조황을 분석하고 있습니다...
                  </div>
                )}

                {/* 포인트 선택 전 안내 배너 */}
                {!selectedPointId && !isAnalyzing && !analysisResult && (
                  <div className={styles.noticeBanner}>
                    <span>포인트를 선택하면 실시간 데이터 기반으로 분석됩니다.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {/* ─── AI 분석 이유 ─── */}
        {analysisResult?.results && analysisResult.results.length > 0 && (
          <section className={`${styles.section} ${styles.sectionAlt}`}>
            <div className={styles.sectionInner}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>AI 분석 이유</h2>
                <span className={styles.sectionSub}>어종별 조황 근거</span>
              </div>

              <div className={styles.reasonGrid}>
                {analysisResult.results.map((r) => (
                  <div
                    key={r.species}
                    className={`${styles.reasonCard} ${expandedSpecies === r.species ? styles.reasonCardActive : ''}`}
                    style={{
                      borderLeftColor: FISH_META[r.species]?.colorFrom ?? '#334155',
                    }}
                    onClick={() => setExpandedSpecies(expandedSpecies === r.species ? null : r.species)}
                  >
                    <div className={styles.reasonHeader}>
                      <span
                        className={styles.reasonSpecies}
                        style={{ color: FISH_META[r.species]?.colorFrom ?? '#334155' }}
                      >
                        {r.species}
                      </span>
                      <span className={styles.reasonScore}>{r.score}점</span>
                      <span className={styles.reasonToggle}>{expandedSpecies === r.species ? '▲' : '▼'}</span>
                    </div>
                    {expandedSpecies === r.species && (
                      <p className={styles.reasonText}>{r.reason}</p>
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
                물고기를 잡으셨나요? 첫 조황 게시물을 올려주세요!
                <br />
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
          <a
            href="https://data.kma.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.footerAttribLink}
          >
            data.kma.go.kr
          </a>
          &nbsp;· 공공누리 제1유형
        </div>
      </footer>
    </div>
  );
}

function ConditionCard({
  icon, label, value, loading,
}: {
  icon: string; label: string; value: string; loading?: boolean;
}) {
  return (
    <div className={`${styles.conditionCard} ${loading ? styles.conditionCardLoading : ''}`}>
      <span className={styles.conditionCardIcon}>{icon}</span>
      <span className={styles.conditionCardLabel}>{label}</span>
      <span className={styles.conditionCardValue}>{value}</span>
    </div>
  );
}
