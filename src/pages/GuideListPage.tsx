import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { GUIDES } from '../data/guides';
import styles from './GuideListPage.module.css';

/**
 * 공개 가이드 목록. 로그인 없이 열린다.
 * 정적 데이터만 쓰므로 API 실패로 빈 화면이 되는 경우가 없다 —
 * 검색엔진·광고 심사가 보는 화면이라 이 점이 중요하다.
 */
export default function GuideListPage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>낚시 가이드</h1>
          <p className={styles.desc}>
            물때와 기상을 읽는 법, 그리고 안전하게 돌아오는 법.
            <br />
            바다에 나가기 전에 알아두면 좋은 것들을 정리했습니다.
          </p>
        </section>

        <section className={styles.grid}>
          {GUIDES.map((g) => (
            <button
              key={g.slug}
              className={styles.card}
              onClick={() => navigate(`/guide/${g.slug}`)}
            >
              <span className={styles.cardIcon}>{g.icon}</span>
              <div className={styles.cardBody}>
                <span className={styles.cardCategory}>{g.category}</span>
                <h2 className={styles.cardTitle}>{g.title}</h2>
                <p className={styles.cardSummary}>{g.summary}</p>
                <span className={styles.cardMeta}>
                  약 {g.readMinutes}분 · {g.updatedAt} 기준
                </span>
              </div>
            </button>
          ))}
        </section>
      </main>

    </div>
  );
}
