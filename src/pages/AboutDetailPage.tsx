import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { ABOUT_ITEMS, findAboutItem, type AboutShot } from '../data/about';
import styles from './AboutDetailPage.module.css';

/**
 * 본문 안의 `**강조**` 만 굵게 그린다.
 * 마크다운 라이브러리를 들이기엔 과하고, 원문에 HTML을 섞기는 싫어서
 * 이 표기 하나만 처리한다. 홀수 개로 열려 있으면 그냥 글자로 남는다.
 */
function RichText({ text }: { text: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className={styles.strong}>{part}</strong> : part,
      )}
    </>
  );
}

/** 화면 캡처 한 장. 진입 버튼처럼 작은 그림은 폭을 줄여 놓는다. */
function Shot({ shot }: { shot: AboutShot }) {
  return (
    <figure className={`${styles.shot} ${shot.small ? styles.shotSmall : ''}`}>
      <img src={`/images/about/${shot.image}.webp`} alt={shot.caption ?? ''} loading="lazy" />
      {shot.caption && <figcaption className={styles.shotCaption}>{shot.caption}</figcaption>}
    </figure>
  );
}

/**
 * 서비스 소개 상세. 로그인 없이 열린다.
 * 정적 데이터만 읽으므로 화면이 비는 경우가 없다.
 */
export default function AboutDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const item = slug ? findAboutItem(slug) : undefined;

  // 목록에서 들어오면 스크롤이 남아 본문 중간부터 보인다.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!item) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <p className={styles.notFound}>존재하지 않는 소개 항목입니다.</p>
          <button className={styles.backBtn} onClick={() => navigate('/about')}>
            서비스 소개로
          </button>
        </main>
      </div>
    );
  }

  const others = ABOUT_ITEMS.filter((i) => i.slug && i.slug !== item.slug);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <nav className={styles.breadcrumb}>
          <button onClick={() => navigate('/about')}>서비스 소개</button>
          <span className={styles.crumbDivider}>›</span>
          <span className={styles.crumbCurrent}>{item.category}</span>
        </nav>

        <article className={styles.article}>
          <header className={styles.articleHead}>
            {item.only && <span className={styles.only}>여기에만 있습니다</span>}
            <h1 className={styles.title}>{item.title}</h1>
            {item.lead && (
              <p className={styles.lead}>
                <RichText text={item.lead} />
              </p>
            )}
          </header>

          {item.hero && <Shot shot={item.hero} />}

          {item.sections?.map((s, i) => (
            <section key={i} className={styles.section}>
              <h2 className={styles.heading}>{s.heading}</h2>

              {s.paragraphs?.map((p, j) => (
                <p key={j} className={styles.para}>
                  <RichText text={p} />
                </p>
              ))}

              {s.steps && (
                <ol className={styles.steps}>
                  {s.steps.map((step, k) => (
                    <li key={k}>
                      <RichText text={step} />
                    </li>
                  ))}
                </ol>
              )}

              {s.shots?.map((shot) => (
                <Shot key={shot.image} shot={shot} />
              ))}

              {s.callout && (
                <div className={styles.callout}>
                  <RichText text={s.callout} />
                </div>
              )}
            </section>
          ))}

          {item.action && (
            <button
              className={styles.action}
              onClick={() => navigate(item.action!.href)}
            >
              {item.action.label}
            </button>
          )}
        </article>

        <section className={styles.more}>
          <h2 className={styles.moreTitle}>다른 기능</h2>
          <div className={styles.moreGrid}>
            {others.map((o) => (
              <button
                key={o.slug}
                className={styles.moreCard}
                onClick={() => navigate(`/about/${o.slug}`)}
              >
                <img
                  className={styles.moreThumb}
                  src={`/images/about/${o.thumb}.webp`}
                  alt=""
                  loading="lazy"
                />
                <span className={styles.moreCardTitle}>{o.title}</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
