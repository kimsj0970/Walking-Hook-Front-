/**
 * 「어종별 조황 기대도」 패널 — **앱과 같은 디자인**.
 *
 * 앱은 `lib/features/home/probability_card.dart` + `home_page.dart` 의
 * `_buildSpeciesPanel/_buildSpeciesBody` 가 같은 화면을 그린다.
 * 배치·색 규칙은 `speciesRanking.ts` 한 곳에만 있고, 여기서는 그리기만 한다.
 *
 * 예전 웹 카드(그라디언트 헤더 + 링 + 신호등 배지)를 대신한다. 왜 바꿨는지는
 * 프로젝트 문서 `어종카드-재설계-구현내역-2026-08-30.md` 에 남아 있다:
 * 색이 어종 이름을 말하지 좋고 나쁨을 말하지 않았고, 넷을 비교하려면 눈을
 * 네 번 옮겨야 했으며, 낮은 값에서 링이 고장난 것처럼 보였다.
 */
import { type ReactElement } from 'react';
import type { SpeciesAnalysis } from '../../api/fishingPointApi';
import { FlatfishSVG, BlackPorgySVG, RockfishSVG, SeabassSVG } from './FishImages';
import {
  buildRanking, probabilityColor, probabilityLabel, probabilityPillInk, probabilitySoftBg,
  type HomeSpeciesMeta, type RankedSpecies,
} from './speciesRanking';
import styles from './SpeciesPanel.module.css';

const ART: Record<HomeSpeciesMeta['art'], (p: { className?: string }) => ReactElement> = {
  flatfish: FlatfishSVG,
  blackporgy: BlackPorgySVG,
  rockfish: RockfishSVG,
  seabass: SeabassSVG,
};

/** 파스텔 원 + 어종 일러스트. */
function Artwork({ meta, size }: { meta: HomeSpeciesMeta; size: number }) {
  const Art = ART[meta.art];
  return (
    <div className={styles.orb} style={{ width: size, height: size, background: meta.orbColor }}>
      <Art className={styles.orbArt} />
    </div>
  );
}

/** 어종 이름표. 레퍼런스의 색 알약. */
function NamePill({ meta, fontSize = 12 }: { meta: HomeSpeciesMeta; fontSize?: number }) {
  return (
    <span className={styles.namePill}
      style={{ background: meta.pillColor, fontSize, padding: `3px ${fontSize * 0.95}px` }}>
      {meta.name}
    </span>
  );
}

/** 점수. 등급에 따라 색이 진해진다. */
function Score({ score, fontSize }: { score: number; fontSize: number }) {
  const color = probabilityColor(score);
  return (
    <span className={styles.score}
      style={{ fontSize, color, letterSpacing: -fontSize * 0.05 }}>
      {score}<span className={styles.pct}>%</span>
    </span>
  );
}

/** 등급 알약. 색만으로 등급을 전하지 않기 위해 **항상 글자와 함께**. */
function GradePill({ score, fontSize = 11 }: { score: number; fontSize?: number }) {
  return (
    <span className={styles.gradePill}
      style={{
        background: probabilitySoftBg(score),
        color: probabilityPillInk(score),
        fontSize, padding: `3px ${fontSize}px`,
      }}>
      {probabilityLabel(score)}
    </span>
  );
}

/**
 * "분석 보기" 어포던스.
 *
 * 네 어종 **모두**에게 같은 모양으로 붙인다. 크기만 다르고 생김새가 같아야
 * "각각 눌러 볼 수 있다" 가 설명 없이 읽힌다.
 */
function AnalysisChip({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span className={`${styles.chip} ${small ? styles.chipSmall : ''}`}>
      {label}<span className={styles.chipCaret}>›</span>
    </span>
  );
}

/** 그 어종만 결과가 없을 때. 카드를 지우지 않고 자리를 지킨다. */
function PendingMark({ fontSize }: { fontSize: number }) {
  return (
    <span className={styles.pending}>
      <span className={styles.pendingDash} style={{ fontSize }}>—</span>
      <span className={styles.pendingText}>분석 대기</span>
    </span>
  );
}

/** 1위가 뚜렷할 때의 큰 카드. 점수 + 등급 + AI 설명 두 줄 미리보기. */
function HeroCard({ item, headline, onPick }: {
  item: RankedSpecies; headline: string; onPick: (name: string) => void;
}) {
  const a = item.analysis!;
  // 미리보기 문장. 요약이 있으면 요약, 없으면 현재 상황 설명. **서버는 손대지 않는다.**
  const preview = (a.summary?.trim() || a.conditionReason?.trim() || '');
  return (
    <button type="button" className={styles.hero} onClick={() => onPick(item.meta.name)}>
      <span className={styles.heroTop}>
        <Artwork meta={item.meta} size={98} />
        <span className={styles.heroRight}>
          <span className={styles.headline}>{headline}</span>
          <NamePill meta={item.meta} />
          <span className={styles.scoreRow}>
            <Score score={item.score} fontSize={34} />
            <GradePill score={item.score} />
          </span>
        </span>
      </span>
      {preview && <span className={styles.preview}>{preview}</span>}
      <AnalysisChip label={`${item.meta.name} 분석 보기`} />
    </button>
  );
}

/** 히어로 아래 작게 놓이는 나머지 어종. */
function MiniCard({ item, onPick }: { item: RankedSpecies; onPick: (name: string) => void }) {
  return (
    <button type="button" className={styles.mini} disabled={item.pending}
      onClick={() => onPick(item.meta.name)}>
      <Artwork meta={item.meta} size={54} />
      <NamePill meta={item.meta} fontSize={10} />
      {item.pending ? <PendingMark fontSize={16} /> : (
        <>
          <Score score={item.score} fontSize={16} />
          <span className={styles.miniGrade} style={{ color: probabilityPillInk(item.score) }}>
            {probabilityLabel(item.score)}
          </span>
          <AnalysisChip label="분석" small />
        </>
      )}
    </button>
  );
}

/**
 * 1위를 세울 수 없을 때(동점·근소차)의 균등 칸.
 * 처음 확정한 레퍼런스가 2×2 배치라, 이 폴백이 낯설지 않고 의도된 화면으로 보인다.
 */
function QuadCard({ item, badge, onPick }: {
  item: RankedSpecies; badge: string | null; onPick: (name: string) => void;
}) {
  return (
    <button type="button" className={styles.quad} disabled={item.pending}
      onClick={() => onPick(item.meta.name)}>
      {badge && <span className={styles.quadBadge}>{badge}</span>}
      <Artwork meta={item.meta} size={62} />
      <NamePill meta={item.meta} fontSize={10.5} />
      {item.pending ? <PendingMark fontSize={19} /> : (
        <>
          <Score score={item.score} fontSize={19} />
          <span className={styles.miniGrade} style={{ color: probabilityPillInk(item.score) }}>
            {probabilityLabel(item.score)}
          </span>
          <AnalysisChip label="분석" small />
        </>
      )}
    </button>
  );
}

/**
 * 분석 결과가 오기 전. 회색 스켈레톤은 "값이 없음"과 구분이 안 돼서,
 * 원과 막대의 자리만 잡아 두고 크기가 바뀌지 않게 한다.
 */
function LoadingPanel() {
  return (
    <div className={styles.loading}>
      <div className={styles.loadingTop}>
        <div className={styles.loadingOrb}><span className={styles.spinner} /></div>
        <div className={styles.loadingRight}>
          <span className={styles.bar} style={{ width: 96, height: 11 }} />
          <span className={styles.bar} style={{ width: 58, height: 20 }} />
          <span className={styles.bar} style={{ width: 120, height: 28 }} />
        </div>
      </div>
      <span className={styles.bar} style={{ width: '100%', height: 11 }} />
      <span className={styles.bar} style={{ width: 210, height: 11 }} />
    </div>
  );
}

export default function SpeciesPanel({ results, loading, onPick }: {
  results: SpeciesAnalysis[] | null;
  loading: boolean;
  onPick: (species: string) => void;
}) {
  // 정렬·동점 판정은 여기서 **한 번만** 한다. 카드마다 계산하면 4번 돈다.
  const ranking = buildRanking(results);

  let body: ReactElement;
  if (loading) {
    body = <LoadingPanel />;
  } else if (ranking.isEmpty) {
    body = <p className={styles.waiting}>분석 결과를 기다리는 중입니다.</p>;
  } else if (ranking.hero) {
    // 1위가 뚜렷하면 히어로 + 나머지 3.
    // 갈림길은 speciesRanking 의 TIE_THRESHOLD(5%p) 한 줄뿐이다.
    body = (
      <>
        <HeroCard item={ranking.hero} headline={ranking.headline} onPick={onPick} />
        {ranking.rest.length > 0 && (
          <>
            <div className={styles.divider} />
            <div className={styles.minis}>
              {ranking.rest.map((e) => (
                <MiniCard key={e.meta.name} item={e} onPick={onPick} />
              ))}
            </div>
          </>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className={styles.headlineCenter}>{ranking.headline}</p>
        <div className={styles.quads}>
          {ranking.ranked.map((e) => (
            <QuadCard key={e.meta.name} item={e}
              badge={ranking.leaderNames.has(e.meta.name) ? ranking.leaderBadge : null}
              onPick={onPick} />
          ))}
        </div>
      </>
    );
  }

  return <div className={styles.panel}>{body}</div>;
}
