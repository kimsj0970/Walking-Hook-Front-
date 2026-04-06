import { useState } from 'react';
import Header from '../components/common/Header';
import FishProbabilityCard, { FISH_LIST, type FishData } from '../components/fish/FishProbabilityCard';
import styles from './HomePage.module.css';

// 현재 날씨 정보 (추후 API 연동)
const DUMMY_CONDITIONS = {
  location: '태안 학암포',
  waterTemp: null as number | null,
  windSpeed: null as number | null,
  tideStatus: null as string | null,
  updatedAt: null as string | null,
};

export default function HomePage() {
  // 추후 API 연동 시 상태로 관리
  const [fishList] = useState<FishData[]>(FISH_LIST);
  const [conditions] = useState(DUMMY_CONDITIONS);

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
              수온·조류·기압·풍속·물때를 분석해
              <br />
              Walking 낚시 시 어종별 조황 확률을 실시간으로 알려드립니다.
            </p>

            {/* 현재 조건 요약 */}
            <div className={styles.conditionRow}>
              <ConditionChip icon="📍" label={conditions.location} />
              <ConditionChip
                icon="🌡️"
                label={conditions.waterTemp != null ? `수온 ${conditions.waterTemp}℃` : '수온 수집 중'}
                loading={conditions.waterTemp == null}
              />
              <ConditionChip
                icon="💨"
                label={conditions.windSpeed != null ? `풍속 ${conditions.windSpeed}m/s` : '풍속 수집 중'}
                loading={conditions.windSpeed == null}
              />
              <ConditionChip
                icon="🌊"
                label={conditions.tideStatus ?? '물때 수집 중'}
                loading={conditions.tideStatus == null}
              />
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
                  onClick={() => {/* 추후 상세 페이지 연결 */}}
                />
              ))}
            </div>

            {/* 데이터 준비 중 안내 */}
            <div className={styles.noticeBanner}>
              <span className={styles.noticeIcon}>🔧</span>
              <span>
                현재 해양·기상 API 연동 준비 중입니다.
                곧 실시간 데이터가 제공됩니다.
              </span>
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

            {/* 빈 상태 */}
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎣</div>
              <p className={styles.emptyTitle}>아직 게시물이 없습니다</p>
              <p className={styles.emptyDesc}>
                물고기를 잡으셨나요? 첫 조황 게시물을 올려주세요!
                <br />
                여러분의 데이터가 조황 확률에 반영됩니다.
              </p>
              <button className={styles.emptyBtn}>
                게시물 작성하기
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 푸터 */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerLogo}>🎣 Walking Hook</span>
          <span className={styles.footerCopy}>실시간 조황 예측 서비스</span>
        </div>
      </footer>
    </div>
  );
}

function ConditionChip({ icon, label, loading }: { icon: string; label: string; loading?: boolean }) {
  return (
    <div className={`${styles.chip} ${loading ? styles.chipLoading : ''}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
