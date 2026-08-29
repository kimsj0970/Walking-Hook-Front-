import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import AdSlot from '../components/common/AdSlot';
import { findGuide, GUIDES, type GuideVideo } from '../data/guides';
import { formatVideoTime, youtubeThumbnail, youtubeWatchUrl } from '../lib/youtube';
import styles from './GuideDetailPage.module.css';

/**
 * 가이드 본문. 로그인 없이 열린다.
 *
 * 광고를 여기 붙이는 이유: 본문이 실제로 있는 화면이기 때문이다.
 * 데이터가 비어 있을 수 있는 화면(지도·로딩)에는 광고를 두지 않는다.
 */
/**
 * 참고 영상 한 칸.
 *
 * 임베드로 재생하지 않고 유튜브로 내보낸다. 썸네일도 유튜브 주소를 가리킬 뿐
 * 우리 서버에 복제하지 않는다 — 포인트 영상 목록과 같은 방침이다.
 */
function GuideVideoCard({ video }: { video: GuideVideo }) {
  const thumb = youtubeThumbnail(video.url);
  const href = youtubeWatchUrl(video.url, video.startSeconds);

  return (
    <a className={styles.video} href={href} target="_blank" rel="noopener noreferrer">
      {thumb ? (
        <span className={styles.videoThumb}>
          <img src={thumb} alt="" loading="lazy" />
          <span className={styles.videoPlay} aria-hidden="true" />
          {video.startSeconds != null && video.startSeconds > 0 && (
            <span className={styles.videoBadge}>{formatVideoTime(video.startSeconds)} 부터</span>
          )}
        </span>
      ) : (
        <span className={styles.videoNoThumb}>▶</span>
      )}
      <span className={styles.videoBody}>
        <span className={styles.videoTitle}>{video.title}</span>
        {video.channelName && <span className={styles.videoChannel}>{video.channelName}</span>}
        {video.note && <span className={styles.videoNote}>{video.note}</span>}
        <span className={styles.videoLink}>유튜브에서 보기 ↗</span>
      </span>
    </a>
  );
}

export default function GuideDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const guide = findGuide(slug);

  // 목록에서 들어오면 스크롤이 남아 있어 본문 중간부터 보인다.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!guide) {
    return (
      <div className={styles.page}>
        <Header />
        <main className={styles.main}>
          <p className={styles.notFound}>존재하지 않는 가이드입니다.</p>
          <button className={styles.backBtn} onClick={() => navigate('/guide')}>
            가이드 목록으로
          </button>
        </main>
      </div>
    );
  }

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <nav className={styles.breadcrumb}>
          <button onClick={() => navigate('/guide')}>낚시 가이드</button>
          <span className={styles.crumbDivider}>›</span>
          <span className={styles.crumbCurrent}>{guide.category}</span>
        </nav>

        <article className={styles.article}>
          <header className={styles.articleHead}>
            <h1 className={styles.title}>{guide.title}</h1>
            <p className={styles.summary}>{guide.summary}</p>
            <div className={styles.meta}>
              <span>약 {guide.readMinutes}분</span>
              <span className={styles.metaDot}>·</span>
              <span>{guide.updatedAt} 기준</span>
            </div>
          </header>

          {guide.sections.map((s, i) => (
            <section key={i} className={styles.section}>
              <h2 className={styles.heading}>{s.heading}</h2>

              {s.paragraphs?.map((p, j) => (
                <p key={j} className={styles.para}>
                  {p}
                </p>
              ))}

              {s.table && (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {s.table.head.map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {s.list && (
                <ul className={styles.list}>
                  {s.list.map((item, k) => (
                    <li key={k}>{item}</li>
                  ))}
                </ul>
              )}

              {s.callout && <div className={styles.callout}>{s.callout}</div>}

              {s.videos && (
                <div className={styles.videos}>
                  {s.videos.map((v) => (
                    <GuideVideoCard key={v.url} video={v} />
                  ))}
                  <p className={styles.videoDisclaimer}>
                    각 영상은 해당 채널의 콘텐츠이며, 워킹훅과 제휴 관계가 없습니다.
                    노출을 원하지 않는 채널은 문의하기로 알려주시면 바로 내리겠습니다.
                  </p>
                </div>
              )}
            </section>
          ))}

          <footer className={styles.sources}>
            <span className={styles.sourcesLabel}>참고</span>
            <ul>
              {guide.sources.map((src) => (
                <li key={src.url}>
                  <a href={src.url} target="_blank" rel="noopener noreferrer">
                    {src.label}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        </article>

        {/* 본문이 끝난 자리. 콘텐츠가 있는 화면이라 광고를 둔다. */}
        <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_GUIDE as string | undefined} />

        <section className={styles.more}>
          <h2 className={styles.moreTitle}>다른 가이드</h2>
          <div className={styles.moreGrid}>
            {others.map((g) => (
              <button
                key={g.slug}
                className={styles.moreCard}
                onClick={() => navigate(`/guide/${g.slug}`)}
              >
                <span className={styles.moreIcon}>{g.icon}</span>
                <span className={styles.moreCardTitle}>{g.title}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}
