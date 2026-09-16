import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import { ChevronRightIcon } from '../components/common/Icons';
import { ABOUT_ITEMS, type AboutItem } from '../data/about';
import styles from './AboutListPage.module.css';

/**
 * 서비스 소개 목록. 로그인 없이 열린다.
 *
 * 낚시 가이드 목록과 같은 형태 — 썸네일 카드를 누르면 상세로 들어간다.
 * 정적 데이터만 쓰므로 API 실패로 빈 화면이 되는 일이 없다.
 */
export default function AboutListPage() {
  const navigate = useNavigate();

  /** slug 가 있으면 상세로, 없으면 그 기능으로 바로 보낸다. */
  const open = (item: AboutItem) => {
    navigate(item.slug ? `/about/${item.slug}` : (item.href ?? '/'));
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>서비스 소개</h1>
          <p className={styles.desc}>
            영상 속 그 자리가 어디인지, 지금 나가도 되는 날인지,
            <br />
            잡은 고기를 가져가도 되는지 — 워킹훅이 대신 찾아 둔 것들입니다.
          </p>
        </section>

        <section className={styles.grid}>
          {ABOUT_ITEMS.map((item) => (
            <button
              key={item.slug ?? item.href}
              className={styles.card}
              onClick={() => open(item)}
            >
              <span className={styles.thumbWrap}>
                <img
                  className={styles.thumb}
                  src={`/images/about/${item.thumb}.webp`}
                  alt=""
                  loading="lazy"
                />
              </span>

              <span className={styles.body}>
                <span className={styles.badges}>
                  <span className={styles.category}>{item.category}</span>
                  {item.only && <span className={styles.only}>여기에만 있습니다</span>}
                </span>
                <span className={styles.cardTitle}>{item.title}</span>
                <span className={styles.summary}>{item.summary}</span>
              </span>

              <span className={styles.chevron} aria-hidden="true">
                <ChevronRightIcon size={18} />
              </span>
            </button>
          ))}
        </section>

        <p className={styles.foot}>
          화면은 실제 서비스 화면이며, 기능이 바뀌면 이 문서도 함께 고칩니다.
        </p>
      </main>
    </div>
  );
}
