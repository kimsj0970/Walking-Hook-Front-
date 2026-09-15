/**
 * 어종 카드의 배치·색을 정하는 규칙 — **순수 함수**라 화면 없이 테스트할 수 있다.
 *
 * 앱(`lib/features/home/species_ranking.dart`)과 **같은 규칙**을 쓴다.
 * 한쪽만 고치면 같은 점수에서 앱과 웹이 다른 화면을 그리게 되므로,
 * 규칙을 바꿀 때는 반드시 두 파일을 함께 고칠 것.
 */
import type { SpeciesAnalysis } from '../../api/fishingPointApi';

export interface HomeSpeciesMeta {
  name: string;
  /** 예전 카드의 헤더 그라디언트 색. 지금은 "AI 분석 이유" 카드의 좌측 띠에만 쓴다. */
  colorFrom: string;
  /** 일러스트가 앉는 파스텔 원의 배경색. */
  orbColor: string;
  /** 이름표 알약의 배경색. 흰 글씨가 올라가므로 충분히 진해야 한다. */
  pillColor: string;
  /** FishImages 의 키. */
  art: 'flatfish' | 'blackporgy' | 'rockfish' | 'seabass';
}

/**
 * 홈에 고정으로 나오는 4종. 회유성 목록이 아니다.
 *
 * 어종 구분은 **파스텔 원 배경과 이름표 알약**이 맡는다. 일러스트는 실제 어종 색
 * (갈색·은회색)이라 넷을 색으로 가르지 못하고, 점수 숫자는 등급색을 쓰기 때문이다.
 */
export const HOME_SPECIES: HomeSpeciesMeta[] = [
  { name: '광어',   colorFrom: '#0077B6', orbColor: '#EFE4D4', pillColor: '#7A5C3E', art: 'flatfish' },
  { name: '감성돔', colorFrom: '#5A189A', orbColor: '#E7DEF0', pillColor: '#6B4A8A', art: 'blackporgy' },
  { name: '우럭',   colorFrom: '#005F73', orbColor: '#DDE3EE', pillColor: '#24365C', art: 'rockfish' },
  { name: '농어',   colorFrom: '#AE2012', orbColor: '#E4E8D6', pillColor: '#5A6B34', art: 'seabass' },
];

/**
 * 1위를 단정하기 위해 필요한 최소 점수 차(%p).
 *
 * 동점(0%p)만 막으면 27 대 26 이 그대로 통과한다. AI 추정치에서 1~4점 차는
 * 우연이라, 그걸로 1위를 세우는 것은 동점을 1위로 세우는 것과 다르지 않다.
 * **앱의 kTieThreshold 와 같은 값이어야 한다.**
 */
export const TIE_THRESHOLD = 5;

/** '낮음' 등급의 상한. probabilityLabel 과 같은 경계. */
const LOW_CEIL = 25;

export interface RankedSpecies {
  meta: HomeSpeciesMeta;
  /** 아직 결과가 없으면 null. **목록에서 빼지 않는다** — 한 마리가 소리 없이
   *  사라지는 것보다 '분석 대기' 로 자리를 지키는 편이 낫다. */
  analysis: SpeciesAnalysis | null;
  /** 정렬용 점수. 대기 중인 어종은 -1 이라 항상 맨 뒤로 간다. */
  score: number;
  pending: boolean;
}

export interface SpeciesRanking {
  /** 점수 내림차순으로 정렬된 **네 종 전부**. */
  ranked: RankedSpecies[];
  /** 1위를 크게 세워도 되는가. false 면 2×2 균등 배치. */
  hasClearLeader: boolean;
  /** 히어로로 세울 어종. hasClearLeader 가 false 면 null. */
  hero: RankedSpecies | null;
  /** 히어로 아래 작게 놓일 나머지. */
  rest: RankedSpecies[];
  /** 1위와 TIE_THRESHOLD 이내인 어종 이름들. */
  leaderNames: Set<string>;
  /** 히어로(또는 균등 배치) 위에 붙는 한 줄. */
  headline: string;
  /** 균등 배치일 때 선두들에 붙는 배지. null 이면 배지 없음. */
  leaderBadge: string | null;
  isEmpty: boolean;
}

/** 분석 결과에서 배치를 계산한다. */
export function buildRanking(results: SpeciesAnalysis[] | null): SpeciesRanking {
  const byName = new Map<string, SpeciesAnalysis>();
  for (const r of results ?? []) byName.set(r.species, r);

  const list: RankedSpecies[] = HOME_SPECIES.map((meta) => {
    const analysis = byName.get(meta.name) ?? null;
    return { meta, analysis, score: analysis?.score ?? -1, pending: analysis === null };
  });

  const empty: SpeciesRanking = {
    ranked: [], hasClearLeader: false, hero: null, rest: [],
    leaderNames: new Set(), headline: '', leaderBadge: null, isEmpty: true,
  };
  if (list.every((e) => e.pending)) return empty;

  // 점수 내림차순. **동점이면 HOME_SPECIES 안의 원래 순서를 유지한다.**
  //
  // 이게 규칙 중 가장 중요하다. 동점일 때 순서가 새로고침마다 뒤바뀌면 사용자는
  // 값이 바뀐 줄 알고 앱을 못 믿게 된다. 결과는 언제나 같아야 한다.
  const index = new Map(HOME_SPECIES.map((m, i) => [m.name, i]));
  list.sort((x, y) => {
    const byScore = y.score - x.score;
    if (byScore !== 0) return byScore;
    return (index.get(x.meta.name) ?? 0) - (index.get(y.meta.name) ?? 0);
  });

  // 1·2위 비교는 **점수가 있는 어종끼리만** 한다. 대기 중인 어종(-1)이 2위 자리에
  // 앉으면 gap 이 터무니없이 커져 히어로가 잘못 세워진다.
  const scored = list.filter((e) => !e.pending);
  const top = scored[0].score;
  const gap = scored.length < 2 ? 100 : top - scored[1].score;
  const hasClearLeader = gap >= TIE_THRESHOLD;

  const leaders = scored.filter((e) => top - e.score < TIE_THRESHOLD);
  const allTied = leaders.every((e) => e.score === top);
  const allLow = top < LOW_CEIL;

  let headline: string;
  if (hasClearLeader) headline = '오늘 가장 기대되는 어종';
  else if (allLow) headline = '오늘은 어느 어종도 기대가 낮습니다';
  else {
    const names = leaders.map((e) => e.meta.name).join(' · ');
    headline = `오늘은 ${names}${iGa(leaders[leaders.length - 1].meta.name)} 비슷합니다`;
  }

  return {
    ranked: list,
    hasClearLeader,
    hero: hasClearLeader ? list[0] : null,
    rest: hasClearLeader ? list.slice(1) : [],
    leaderNames: new Set(leaders.map((e) => e.meta.name)),
    headline,
    // 값이 전부 낮으면 붙이지 않는다 — **8%짜리에 '1위' 표시는 조롱처럼 읽힌다.**
    leaderBadge: hasClearLeader || allLow ? null : allTied ? '공동 1위' : '비슷',
    isEmpty: false,
  };
}

// ─── 등급 색 ──────────────────────────────────────────────────────────────
//
// 신호등(초록/파랑/노랑/빨강)을 버리고 **값이 오를수록 진해지는 한 계열**로 간다.
// 크림 패널 위에서 '보통'의 노랑이 황토색으로 탁하게 보였고, '낮음'의 빨강은
// 조황이 낮은 것을 '위험'처럼 경고해 과했다.
//
// ⚠️ 낮음 단계를 채도 없는 회색으로 두면 크림 배경을 따라가 **카키·황토로 보인다.**
// 반드시 파란 쪽 회색(#94A3B8)을 쓸 것.

export function probabilityColor(score: number): string {
  if (score >= 75) return '#0B3D91';
  if (score >= 50) return '#14539B';
  if (score >= 25) return '#2F6DA8';
  return '#94A3B8';
}

/** 등급 알약의 배경. 본색을 아주 옅게 깐 것. */
export function probabilitySoftBg(score: number): string {
  return score >= 25 ? '#E4EEFA' : '#EBEFF4';
}

/** 등급 알약의 글자색. 알약 배경 위에서 4.5:1 을 넘도록 본색보다 한 단계 진하게. */
export function probabilityPillInk(score: number): string {
  if (score >= 75) return '#0B3D91';
  if (score >= 50) return '#14539B';
  if (score >= 25) return '#2C6197';
  return '#5F7288';
}

/** 색만으로 등급을 전하지 않기 위해 **항상 글자와 함께** 쓴다. */
export function probabilityLabel(score: number): string {
  if (score >= 75) return '매우 좋음';
  if (score >= 50) return '좋음';
  if (score >= 25) return '보통';
  return '낮음';
}

/**
 * 앞 단어의 받침에 따라 '이/가' 를 고른다.
 *
 * 어종 이름은 받침이 있는 것("우럭", "감성돔")과 없는 것("농어", "광어")이 섞여 있어
 * 조사를 하나로 고정하면 "광어이 비슷합니다" 같은 문장이 나간다.
 * 한글 음절은 (코드 - 0xAC00) % 28 === 0 이면 받침이 없다.
 */
function iGa(word: string): string {
  if (!word) return '가';
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return '가';
  return (code - 0xac00) % 28 === 0 ? '가' : '이';
}
