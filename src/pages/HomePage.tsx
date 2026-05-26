import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/common/Header';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import { fetchCities, fetchHarborsByCity, type Harbor } from '../api/harborsApi';
import styles from './HomePage.module.css';

const DUMMY_CONDITIONS = {
  waterTemp: null as number | null,
  windSpeed: null as number | null,
  tideStatus: null as string | null,
};

export default function HomePage() {
  const [searchParams] = useSearchParams();

  const [fishList] = useState<FishData[]>(FISH_LIST);
  const [conditions] = useState(DUMMY_CONDITIONS);

  const [cities, setCities] = useState<string[]>([]);
  const [harbors, setHarbors] = useState<Harbor[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedPortId, setSelectedPortId] = useState<string>('');

  // 지도에서 돌아왔을 때 선택 복원
  useEffect(() => {
    const city = searchParams.get('city') ?? '';
    const portId = searchParams.get('portId') ?? '';
    if (city) setSelectedCity(city);
    if (portId) setSelectedPortId(portId);
  }, [searchParams]);

  // 시 목록 로드
  useEffect(() => {
    fetchCities().then(setCities).catch(() => {});
  }, []);

  // 시 변경 시 항 목록 로드
  useEffect(() => {
    if (!selectedCity) { setHarbors([]); setSelectedPortId(''); return; }
    fetchHarborsByCity(selectedCity)
      .then((list) => {
        setHarbors(list);
        // 지도에서 복원된 portId가 없으면 첫 항 자동 선택
        setSelectedPortId((prev) => prev || (list[0]?.id ?? ''));
      })
      .catch(() => {});
  }, [selectedCity]);

  const now = new Date();
  const timeStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}시 기준`;

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
              원하는 어종을 클릭하여 자세한 정보를 확인해보세요.
            </p>

            {/* 수온 / 풍속 / 물때 카드 */}
            <div className={styles.conditionCards}>
              <ConditionCard
                icon="🌡"
                label="수온"
                value={conditions.waterTemp != null ? `${conditions.waterTemp}℃` : '수집 중...'}
                loading={conditions.waterTemp == null}
              />
              <ConditionCard
                icon="💨"
                label="풍속"
                value={conditions.windSpeed != null ? `${conditions.windSpeed}m/s` : '수집 중...'}
                loading={conditions.windSpeed == null}
              />
              <ConditionCard
                icon="🌊"
                label="물때"
                value={conditions.tideStatus ?? '수집 중...'}
                loading={conditions.tideStatus == null}
              />
            </div>

            {/* 시/항 선택 + 지도 버튼 */}
            <div className={styles.locationBar}>
              <span className={styles.locationIcon}>📍</span>
              <select
                className={styles.locationSelect}
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">시 선택</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className={styles.locationSelect}
                value={selectedPortId}
                onChange={(e) => setSelectedPortId(e.target.value)}
                disabled={harbors.length === 0}
              >
                <option value="">항 선택</option>
                {harbors.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <button
                className={styles.mapBtn}
                onClick={() => window.open('/map', 'kakaomap', 'width=900,height=680,resizable=yes')}
              >
                지도로 보기
              </button>
            </div>
          </div>

          {/* 물결 SVG */}
          <div className={styles.waveWrap}>
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className={styles.wave}>
              <path
                d="M0,40 C180,80 360,0 540,40 C720,80 900,0 1080,40 C1260,80 1440,20 1440,40 L1440,80 L0,80 Z"
                fill="#EFF6FF"
              />
            </svg>
          </div>
        </section>

        {/* ─── 어종별 확률 ─── */}
        <section className={styles.section}>
          <div className={styles.sectionInner}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>어종별 조황 확률</h2>
              <span className={styles.sectionSub}>{timeStr}</span>
            </div>

            <div className={styles.fishGrid}>
              {fishList.map((fish) => (
                <FishProbabilityCard
                  key={fish.id}
                  fish={fish}
                  onClick={() => {}}
                />
              ))}
            </div>

            <div className={styles.noticeBanner}>
              <span className={styles.noticeIcon}>🔧</span>
              <span>현재 해양·기상 API 연동 준비 중입니다. 곧 실시간 데이터가 제공됩니다.</span>
            </div>
          </div>
        </section>

        {/* ─── 커뮤니티 게시판 ─── */}
        <section className={`${styles.section} ${styles.sectionAlt}`}>
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
