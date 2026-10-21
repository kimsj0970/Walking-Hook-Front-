import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import TackleThumb from '../components/tackle/TackleThumb';
import { youtubeThumbnail, youtubeWatchUrl } from '../lib/youtube';
import { useAdContent } from '../components/common/AdContent';
import { usePageMeta } from '../lib/usePageMeta';
import {
  fetchTackleProducts, seaLabel, SPEC_LABELS, SPEC_ORDER, TIER_LABELS,
  type SpecKey, type TackleProduct, type Tier,
} from '../api/tackleApi';
import styles from './TacklePage.module.css';

/**
 * "루어 채비" — 처음 한 벌을 고르는 기준. (2026-10-21 화면 개편)
 *
 * 기획 화면안(Artifact "루어 채비 제휴 링크 화면 기획")대로 다시 짰다. 앱 tackle_page.dart 와 같은 구성이다.
 * 위에서 **해역 · 가격대**를 고르면 관리자에서 그 조건으로 등록한 제품만 항목별 카드로 보인다.
 * **코드에 박아 둔 규격 값·설명은 없다**(10/21 승호님 지시) — 등록된 게 없으면 "아직 등록된 채비가 없어요" 한 줄만 뜬다.
 * 예전의 항목별 그림·"합사만 쓰지 않는 이유"는 빼고, 전체 흐름은 "한눈에 보는 채비" 그림 한 장이 맡는다.
 * 매듭은 영상 카드로 남긴다.
 *
 * 해역은 `서해 · 남해` / `동해` 두 칸 — 남해는 서해와 같은 값으로 묶는다(10/21 결정).
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

type SeaKey = 'WEST' | 'EAST';

const SEA_STORAGE_KEY = 'tackle.sea';

function readSea(): SeaKey {
  try {
    const v = localStorage.getItem(SEA_STORAGE_KEY);
    if (v === 'WEST' || v === 'EAST') return v;
  } catch { /* 사생활 보호 모드 등 */ }
  return 'WEST';
}

export default function TacklePage() {
  useAdContent(true);
  usePageMeta('루어 채비', '방파제·갯바위 루어 채비 — 로드와 릴, 원줄과 쇼크리더, 매듭까지 해역별로 정리했습니다.');

  const [products, setProducts] = useState<TackleProduct[]>([]);
  const [sea, setSea] = useState<SeaKey>(() => readSea());
  const [tier, setTier] = useState<Tier>(() => readTier());

  // 'loading' → 'ok' | 'error'. 실패를 "등록된 채비가 없어요"로 뭉개면 원인을 못 찾는다(10/21).
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    fetchTackleProducts()
      .then((list) => { if (alive) { setProducts(list); setStatus('ok'); } })
      .catch((e) => {
        console.warn('[Tackle] 제품 조회 실패', e);
        if (alive) setStatus('error');
      });
    return () => { alive = false; };
    // 마운트 때 한 번만 부른다. 재시도 버튼을 두지 않는 이유는 아래 error 분기 주석 참고.
  }, []);

  // 관리자에서 활성으로 등록한 건 방식과 상관없이 보인다. 해역은 고른 해역 + 공통(null).
  // 서해 칸은 남해 전용(SOUTH) 제품도 받는다. null·누락(undefined) 모두 공통으로 본다.
  const seaMatch = (p: TackleProduct, s: SeaKey) =>
    p.sea == null || (s === 'WEST' ? (p.sea === 'WEST' || p.sea === 'SOUTH') : p.sea === s);
  const visible = useMemo(
    () => products.filter((p) => p.tier === tier && seaMatch(p, sea)),
    [products, sea, tier],
  );
  const byKey = (key: SpecKey) => visible.filter((p) => p.specKey === key);

  const pickSea = (v: SeaKey) => {
    setSea(v);
    try { localStorage.setItem(SEA_STORAGE_KEY, v); } catch { /* 저장 못 해도 동작 */ }
  };
  const pickTier = (t: Tier) => {
    setTier(t);
    try { localStorage.setItem(TIER_STORAGE_KEY, t); } catch { /* 저장 못 해도 동작 */ }
  };

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>루어 채비</h1>
          <p className={styles.desc}>방파제 · 갯바위 루어 기준입니다. 해역과 가격대를 고르면 그 조건에 맞는 채비를 보여 드립니다.</p>
        </section>

        <div className={styles.selector}>
          <div className={styles.selGroup}>
            <span className={styles.selTitle}>어디서 낚시하세요?</span>
            <div className={styles.pills} role="group" aria-label="해역 선택">
              <button type="button" aria-pressed={sea === 'WEST'} className={sea === 'WEST' ? styles.pillOn : styles.pillOff} onClick={() => pickSea('WEST')}>서해 · 남해</button>
              <button type="button" aria-pressed={sea === 'EAST'} className={sea === 'EAST' ? styles.pillOn : styles.pillOff} onClick={() => pickSea('EAST')}>동해</button>
            </div>
          </div>
          <div className={styles.selGroup}>
            <span className={styles.selTitle}>어느 가격대로 보시겠어요?</span>
            <div className={styles.pills} role="group" aria-label="가격대 선택">
              {TIERS.map((t) => (
                <button key={t} type="button" aria-pressed={tier === t} className={tier === t ? styles.pillOn : styles.pillOff} onClick={() => pickTier(t)}>
                  {TIER_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {status === 'loading' ? (
          <p className={styles.empty}>불러오는 중…</p>
        ) : status === 'error' ? (
          /* 재시도 버튼을 두지 않는다 — 실패가 401(공개 설정이 아직 운영에 안 올라간
             상태)이면 같은 요청을 몇 번 보내도 결과가 같아서, 누를수록 고장 난 것처럼
             보인다. 라우트를 다시 열면 컴포넌트가 마운트되며 자동으로 다시 부른다. */
          <div className={styles.empty}>
            <p>채비 목록을 불러오지 못했어요.<br />잠시 후 다시 들어와 주세요.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.empty}>
            <p>{products.length === 0 ? '아직 등록된 채비가 없어요.' : `${sea === 'WEST' ? '서해 · 남해' : '동해'} · ${TIER_LABELS[tier]}에는 아직 등록된 채비가 없어요.`}</p>
          </div>
        ) : (
          <>
            <RigOverview />

            {/* 관리자에서 등록한 제품이 있는 항목만 카드를 그린다. 번호는 그림 번호와 같다. */}
            {SPEC_ORDER.filter((k) => byKey(k).length > 0).map((k) => (
              <section key={k} id={`tackle-${k}`} className={styles.spec}>
                <div className={styles.specHead}>
                  <span className={styles.specLabel}>
                    <span className={styles.specNo}>{SPEC_ORDER.indexOf(k) + 1}</span>
                    {SPEC_LABELS[k]}
                  </span>
                </div>
                <ProductList items={byKey(k)} />
              </section>
            ))}

            <section className={styles.spec}>
              <div className={styles.specHead}>
                <span className={styles.specLabel}>매듭</span>
                <strong className={styles.specValue}>FG 노트</strong>
              </div>
              <p className={styles.specWhy}>{KNOT_WHY}</p>
              <KnotVideo />
            </section>

            <p className={styles.basis}>2026년 기준</p>
            <p className={styles.disclosure}>
              이 화면에는 쿠팡 파트너스 링크가 포함되어 있으며, 구매 시 일정액의 수수료를 받습니다.
            </p>
          </>
        )}
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

const TIERS: Tier[] = ['ENTRY', 'MID', 'HIGH'];
const TIER_STORAGE_KEY = 'tackle.tier';

function readTier(): Tier {
  try {
    const v = localStorage.getItem(TIER_STORAGE_KEY);
    if (v === 'ENTRY' || v === 'MID' || v === 'HIGH') return v;
  } catch { /* 사생활 보호 모드 등 */ }
  return 'ENTRY';
}

/** 그림 위 번호 위치(%). 그림 `public/tackle/rig_full.png`(1640×680) 기준. 앱 tackle_page.dart 와 같은 값 */
const RIG_MARKS: { no: number; key: SpecKey; left: number; top: number }[] = [
  { no: 1, key: 'ROD', left: 62, top: 1 },
  { no: 2, key: 'REEL', left: 33, top: 26 },
  { no: 3, key: 'LINE', left: 90, top: 38 },
  { no: 4, key: 'LEADER', left: 50, top: 52 },
  { no: 5, key: 'SWIVEL', left: 38, top: 57 },
  { no: 6, key: 'LURE', left: 18, top: 53 },
];

/**
 * "한눈에 보는 채비" — 초릿대 끝에서 루어까지 어떤 순서로 이어지는지.
 * 그림에 글자를 넣지 않고 번호만 코드로 얹는다. 번호를 누르면 그 항목으로 내려간다.
 * 도래·루어는 규격 카드가 없어 제품이 있을 때만 이동할 곳이 생긴다.
 */
function RigOverview() {
  const go = (key: SpecKey) => {
    document.getElementById(`tackle-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <section className={styles.rig}>
      <h2 className={styles.rigTitle}>한눈에 보는 채비</h2>
      <p className={styles.rigSub}>초릿대 끝에서 루어까지 이렇게 이어집니다</p>
      <div className={styles.rigArt}>
        <img
          src="/tackle/rig_full.png"
          alt="로드에 릴을 달고, 원줄이 가이드를 지나 초릿대 끝에서 매듭으로 쇼크리더와 이어지고, 도래와 스냅을 거쳐 루어까지 연결된 채비 전체 그림"
        />
        {RIG_MARKS.map((m) => (
          <span key={m.no} className={styles.rigMark} style={{ left: `${m.left}%`, top: `${m.top}%` }} aria-hidden>
            {m.no}
          </span>
        ))}
      </div>
      <div className={styles.rigChips}>
        {RIG_MARKS.map((m) => (
          <button key={m.no} type="button" className={styles.rigChip} onClick={() => go(m.key)}>
            {m.no} {SPEC_LABELS[m.key]}
          </button>
        ))}
      </div>
    </section>
  );
}

/** 항목 아래 제품 목록. 가격 오름차순(서버 정렬). 목록에서는 쿠팡으로 바로 나가지 않고 상세로 간다. */
function ProductList({ items }: { items: TackleProduct[] }) {
  if (items.length === 0) return null;
  return (
    <div className={styles.products}>
      {items.map((p) => (
        <Link key={p.id} to={`/tackle/products/${p.id}`} className={styles.product}>
          <TackleThumb src={p.imageUrl} size={72} alt={p.name} />
          <span className={styles.productBody}>
            <span className={styles.productTags}>
              <span className={styles.tagTier}>{TIER_LABELS[p.tier]}</span>
              <span className={styles.tagSea}>{seaLabel(p.sea)}</span>
              <span className={styles.price}>{p.priceBand}</span>
            </span>
            <span className={styles.productName}>{p.name}</span>
            {p.summary && <span className={styles.productSummary}>{p.summary}</span>}
          </span>
          <span className={styles.more}>상세보기</span>
        </Link>
      ))}
    </div>
  );
}
