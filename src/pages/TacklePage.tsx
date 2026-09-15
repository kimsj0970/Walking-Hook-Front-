import Header from '../components/common/Header';
import { youtubeThumbnail, youtubeWatchUrl } from '../lib/youtube';
import styles from './TacklePage.module.css';

/**
 * "루어 채비" — 처음 한 벌을 고르는 기준.
 *
 * 앱 `features/tackle/tackle_page.dart` 와 같은 값·같은 그림을 쓴다.
 *
 * 대상은 방파제·갯바위에서 걸어 들어가는 낚시다. 선상 채비는 무게가 10~50배
 * 달라 한 화면에 섞으면 둘 중 하나는 반드시 틀린 값이 되므로 넣지 않는다.
 * 루어 무게도, 노리는 어종 목록도 일부러 넣지 않았다 — 물때·수심·바람·계절에
 * 따라 달라져 숫자나 목록을 박아 두면 그대로 틀린 안내가 된다.
 *
 * ## 서해/동해 토글을 없앤 이유
 *
 * 예전에는 해역 토글로 화면을 통째로 갈아 끼웠다. 그런데 **그림은 하나뿐이라**
 * 동해를 골라도 로드 그림에는 `862 → 8'6" = 2.59 m · 2피스` 가 박혀 있었다.
 * 그림이 특정 모델을 말하는 순간 다른 해역에서는 반드시 틀린 안내가 된다.
 *
 * 그래서 **그림은 해역을 말하지 않는다.** 로드 그림은 표기 읽는 법과 길이 비교만,
 * 릴 그림은 부위 이름과 번호별 크기 차이만 말한다. 해역별 숫자는 글로 옮겨
 * 항목마다 서해·동해를 나란히 보여 준다. 덤으로 왜 다른지가 같이 읽히고,
 * 사용자가 "지금 어느 쪽을 보고 있는지" 를 신경 쓸 필요도 없어졌다.
 *
 * 그림은 `public/tackle/*.svg` 다(합사만 `line.png` — 실제 로프 그림이라 벡터로는
 * 못 그린다). 앱은 같은 그림을 PNG 로 쓴다(flutter_svg 는
 * 글자 렌더링이 보장되지 않아서). 폭 360 기준으로 그려 라벨이 그대로 읽힌다.
 * 매듭만 그림이 없다 — 손 순서가 전부라 정지 그림으로는 따라 하지 못한다.
 */

/** 매듭 영상 — 프로젝트에 이미 등록된 것과 같은 영상. 썸네일은 복제하지 않는다. */
const KNOT_VIDEO = {
  url: 'https://www.youtube.com/watch?v=AxmW_9H6D_E',
  start: 333,
  at: '5:33',
  title: '쇼크리더 매듭법 - fg노트 (shock leader - fg knot ) 가장 쉬운 방법',
  channel: '박선비TV',
};

const KNOT_WHY =
  '원줄과 쇼크리더를 연결하는 매듭법은 여러 가지가 있으며, FG 노트를 추천합니다. '
  + '묶기 전에 물이나 침으로 적시고(마찰열이 강도를 떨어뜨립니다), '
  + '5~10초에 걸쳐 천천히 조인 뒤 여분은 2~3mm 남깁니다.';

interface Reason {
  head: string;
  detail: string;
}

interface Spec {
  label: string;
  /** 서해 값. `east` 와 같으면 둘 다 비우고 `both` 를 쓴다. */
  west?: string;
  east?: string;
  /** 해역이 갈리지 않는 항목(매듭). */
  both?: string;
  why: string;
  brandNote?: string;
  /** 항목 그림 (`public/tackle/*.svg`) */
  art?: string;
  /** 쇼크리더에만 붙는 "합사(PE)만 쓰지 않는 이유" */
  reasons?: Reason[];
  /** 매듭만 그림 대신 영상 카드 */
  video?: boolean;
}

const LEADER_REASONS: Reason[] = [
  { head: '쓸림에 약하다', detail: '섬유 다발이라 한 가닥만 끊겨도 강도가 급락합니다. 테트라·갯바위·자갈 전부 위협입니다.' },
  { head: '늘어나지 않는다', detail: '캐스팅 순간의 충격, 고기가 갑자기 튈 때의 하중을 흡수하지 못합니다.' },
  { head: '이빨에 잘린다', detail: '삼치·갈치는 PE를 그대로 잘라 냅니다.' },
];

const SEAS: { key: 'west' | 'east'; name: string; text: string }[] = [
  { key: 'west', name: '서해', text: '조류가 셉니다. 물때에 따라 채비를 조절하게 됩니다.' },
  { key: 'east', name: '동해', text: '조류가 약한 대신 비거리가 중요합니다. 물색이 맑아 먼 곳을 노리게 됩니다.' },
];

const ROWS: Spec[] = [
  {
    label: '로드',
    west: '862ML',
    east: '902ML 이상',
    art: '/tackle/rod.svg',
    why: '8\'6" · 2피스 · 미디엄라이트. 방파제에서 다루기 편하고 갯바위에서도 부담 없는 길이입니다. '
      + '동해는 비거리가 필요해 더 길게 쓰며, 1002 넘는 길이도 씁니다.',
  },
  {
    label: '릴',
    west: '3000번',
    east: '5000번',
    art: '/tackle/reel.svg',
    why: '3000번은 우럭·광어 등 방파제 루어 전반에, '
      + '5000번은 삼치·부시리 등 대형 회유성 어종을 제압하는 데 많이 씁니다. '
      + '시마노 C3000HG · C5000XG 기준.',
    brandNote: '(다이와는 LT3000-CXH · LT5000D-CXH)',
  },
  {
    label: '원줄 (PE)',
    west: '1.0호',
    east: '1.0–1.2호',
    // 합사만 PNG 다. 실제 로프 그림이라 벡터로는 못 그린다.
    art: '/tackle/line.png',
    why: '가늘수록 멀리 날아가지만 터짐에 약합니다.',
  },
  {
    label: '쇼크리더',
    west: '카본 3–5호',
    east: '카본 4–6호',
    art: '/tackle/leader.svg',
    why: '자갈·돌 등에 쓸림을 버티기 위해 씁니다. 굵을수록 단단하지만 바람 저항을 더 타서 비거리가 줄어듭니다.',
    reasons: LEADER_REASONS,
  },
  { label: '매듭', both: 'FG 노트', video: true, why: KNOT_WHY },
];

export default function TacklePage() {
  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>루어 채비</h1>
          <p className={styles.desc}>
            정답은 없습니다. 처음 한 벌을 고르는 기준으로 쓰세요.
          </p>
        </section>

        <p className={styles.scope}>방파제 · 갯바위에서 걸어 들어가는 낚시 기준</p>

        {/* 해역 성격은 여기서 한 번만 말한다. 아래 항목들은 숫자만 나란히 놓는다. */}
        <div className={styles.seas}>
          {SEAS.map((s) => (
            <div key={s.key} className={styles.sea}>
              <span className={`${styles.seaName} ${styles[s.key]}`}>{s.name}</span>
              <p className={styles.seaText}>{s.text}</p>
            </div>
          ))}
        </div>

        {ROWS.map((r) => (
          <section key={r.label} className={styles.spec}>
            <span className={styles.specLabel}>{r.label}</span>

            {r.both ? (
              <p className={styles.oneValue}>
                {r.both}
                <span className={styles.oneNote}>— 서해 · 동해 같습니다</span>
              </p>
            ) : (
              <div className={styles.vals}>
                {SEAS.map((s) => (
                  <div key={s.key} className={styles.val}>
                    <span className={`${styles.valSea} ${styles[s.key]}`}>{s.name}</span>
                    <strong className={styles.valNum}>{r[s.key]}</strong>
                  </div>
                ))}
              </div>
            )}

            {r.art && (
              <img className={styles.art} src={r.art} alt={`${r.label} 그림`} />
            )}
            {r.video && <KnotVideo />}

            <p className={styles.specWhy}>{r.why}</p>
            {r.brandNote && <p className={styles.specBrand}>{r.brandNote}</p>}

            {r.reasons && (
              <div className={styles.reasons}>
                <h3 className={styles.reasonsTitle}>합사(PE)만 쓰지 않는 이유</h3>
                <ol className={styles.reasonList}>
                  {r.reasons.map((x, i) => (
                    <li key={x.head} className={styles.reason}>
                      <span className={styles.reasonNo}>{i + 1}</span>
                      <span>
                        <b>{x.head}</b>
                        <em>{x.detail}</em>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>
        ))}

        <p className={styles.footer}>
          루어 무게와 노리는 어종은 물때·수심·바람·계절에 따라 달라져 넣지 않았습니다.
          <br />
          로드·릴 표기는 시마노를 기준으로 하고, 다이와가 다르면 괄호로 병기했습니다.
        </p>
      </main>
    </div>
  );
}

/**
 * 매듭 영상 카드. 손이 움직이는 순서가 전부라 그림으로는 따라 하지 못한다.
 * 썸네일은 서버에 복제하지 않고 유튜브 주소를 가리키기만 하며, 눌리면 유튜브로 나간다.
 */
function KnotVideo() {
  const thumb = youtubeThumbnail(KNOT_VIDEO.url);
  const href = youtubeWatchUrl(KNOT_VIDEO.url, KNOT_VIDEO.start);

  return (
    <a className={styles.video} href={href} target="_blank" rel="noopener noreferrer">
      <span className={styles.thumb}>
        {thumb && <img src={thumb} alt="" loading="lazy" />}
        <span className={styles.play} aria-hidden />
        <span className={styles.at}>{KNOT_VIDEO.at} 부터</span>
      </span>
      <span className={styles.videoTitle}>{KNOT_VIDEO.title}</span>
      <span className={styles.videoCh}>{KNOT_VIDEO.channel} · 유튜브에서 열림</span>
    </a>
  );
}
