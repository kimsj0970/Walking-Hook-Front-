/**
 * 어종별 금지체장·금어기 규제 데이터.
 *
 * 대상은 **워킹(방파제·갯바위) 낚시인**이다. 별표에 붙은 업종별 예외
 * (근해채낚기·정치망·연안·구획어업 등)는 어업 업종에만 해당하므로 전부 제외했고,
 * 낚시인이 적용받는 **기본(가장 엄격한) 기준**만 담았다.
 *
 * 근거
 *  - 수산자원관리법 시행령 별표 1(금어기) · 별표 2(금지체장·체중), 시행 2026.7.1
 *  - 해양수산부 「시·도 별도 지정 고시 금어기 현황」(2026.1.1 기준)
 *  - 해양수산부고시 제2024-40호(고등어 포획금지기간)
 *  - 제재: 낚시 관리 및 육성법 제5조·제7조제3호 → 과태료 80만원
 *
 * 앱 `lib/core/data/fish_regulation.dart` 와 **같은 값을 유지해야 한다.**
 * 한쪽만 고치면 같은 어종을 앱과 웹이 다르게 안내하게 된다.
 */

import { FISH_SPECIES_LABELS, type FishSpecies } from '../api/fishSpecies';

/** 체장을 어디서부터 어디까지 재는가. */
export type LengthBasis = 'TOTAL' | 'ANAL' | 'DISC' | 'MANTLE';

export const LENGTH_BASIS_LABELS: Record<LengthBasis, string> = {
  TOTAL: '전장',
  ANAL:  '항문장',
  DISC:  '체반폭',
  MANTLE: '외투장',
};

export const LENGTH_BASIS_HINTS: Record<LengthBasis, string> = {
  TOTAL: '주둥이 끝부터 꼬리지느러미 끝까지',
  ANAL:  '주둥이 끝부터 항문까지',
  DISC:  '몸통 원반의 폭',
  MANTLE: '몸통(외투막)의 길이',
};

/** 금어기 한 구간. 한 어종이 지역별로 여러 구간을 가질 수 있다. */
export interface ClosedSeason {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** 없으면 전국. 값이 있으면 그 시·도에만 적용된다. */
  region?: string;
  /** 시·도 별도 고시가 없는 지역에 적용되는 시행령 기본값인지. */
  isDefault?: boolean;
  /** 이 구간에서 제외되는 지역 (전어의 강원특별자치도·경상북도). */
  excludedRegions?: string[];
  /** 행정구역이 아닌 해역 조건 (갈치의 북위 33도 이북). */
  areaNote?: string;
  noticeNo?: string;
  note?: string;
}

export interface FishRegulation {
  /**
   * 이 규제가 걸리는 어종. 조황·확률 화면과 이어 붙이는 열쇠다.
   *
   * **한 어종에 규제 항목이 둘일 수 있다.** 문어가 그렇다 — 법은 참문어와 대문어를
   * 다른 종으로 보고 규정을 따로 두는데, `FishSpecies` 는 DB 에 문자열로 저장되는
   * 값이라 함부로 쪼갤 수 없다. 그래서 **화면에서만** 두 항목으로 나누고,
   * 둘 다 `COMMON_OCTOPUS` 를 가리키게 두었다.
   */
  species: FishSpecies;
  /** 경로에 쓰는 식별자. 없으면 `species` 값을 그대로 쓴다. */
  id?: string;
  /** 화면에 띄울 이름. 없으면 `FISH_SPECIES_LABELS[species]` 를 쓴다. */
  name?: string;
  /** 금지체장(cm). 없으면 크기 규제 없음. */
  minLengthCm?: number;
  lengthBasis?: LengthBasis;
  /** 금지체중(g). 없으면 중량 규제 없음. */
  minWeightG?: number;
  closedSeasons?: ClosedSeason[];
  /** 화면에 그대로 보여줄 보충 설명. */
  note?: string;
  /** 붉게 강조할 주의 문구. 닮은 종과 헷갈려 위법이 되는 경우에만 쓴다. */
  caution?: string;
}

/** 규제 데이터의 기준일. 화면에 반드시 함께 표시한다. */
export const FISH_REGULATION_EFFECTIVE_DATE = '2026.07.01';

/** 위반 시 낚시인에게 부과되는 과태료. */
export const FISH_REGULATION_PENALTY_KRW = 800_000;

/** 목록 화면 하단에 고정으로 붙이는 고지. */
export const FISH_REGULATION_DISCLAIMER =
  '참고용입니다. 최종 기준은 수산자원관리법 시행령과 관할 시·도 고시입니다.';

/** 시·도 고시가 있는 어종에서 사용자가 고를 수 있는 지역. */
export const FISH_REGULATION_REGIONS = [
  '인천광역시', '경기도', '충청남도', '전북특별자치도', '전남광주통합특별시',
  '경상남도', '부산광역시', '울산광역시', '경상북도', '강원특별자치도', '제주특별자치도',
] as const;

/** 어종별 규제. 여기 없는 어종은 규제가 없다. */
export const FISH_REGULATIONS: FishRegulation[] = [
  // ─── 두족류 ────────────────────────────────────────────────
  {
    species: 'WEBFOOT_OCTOPUS',
    closedSeasons: [{ startMonth: 5, startDay: 11, endMonth: 8, endDay: 31 }],
  },
  {
    species: 'COMMON_OCTOPUS',
    name: '참문어 (돌문어)',
    closedSeasons: [
      { startMonth: 5, startDay: 16, endMonth: 6, endDay: 30, isDefault: true,
        note: '시·도 별도 고시가 없는 지역' },
      { startMonth: 5, startDay: 24, endMonth: 7, endDay: 8, region: '경상남도',
        noticeNo: '경상남도 고시 제2021-220호' },
      { startMonth: 5, startDay: 24, endMonth: 7, endDay: 8, region: '전남광주통합특별시',
        noticeNo: '전라남도 고시 제2021-228호', note: '2026.7.1 전남광주통합특별시가 승계' },
      { startMonth: 8, startDay: 1, endMonth: 9, endDay: 15, region: '제주특별자치도',
        noticeNo: '제주특별자치도 고시 제2021-97호' },
    ],
    note: '크기 규제가 없습니다. 금어기만 보면 됩니다. '
        + '시·도지사가 5.1~9.15 사이에서 46일 이상을 따로 정할 수 있어 지역마다 다릅니다. '
        + '인터넷에 도는 "참문어 300g"은 2020년 입법예고 때 나왔다가 금어기로 대체돼 폐기된 안입니다.',
    caution: '동해에서 잡은 문어는 대문어일 수 있습니다. 대문어는 600g 이하를 놓아 주어야 합니다.',
  },
  {
    // 법은 참문어와 다른 종으로 본다(시행령 별표 2 제4호가목).
    // FishSpecies 에는 값이 없어 화면에서만 별도 항목으로 나눈다.
    id: 'GIANT_PACIFIC_OCTOPUS',
    species: 'COMMON_OCTOPUS',
    name: '대문어 (피문어)',
    minWeightG: 600,
    note: '금어기는 없고 크기만 봅니다. 300g(2010) → 400g → 600g(2021.1.1~)으로 올라왔습니다. '
        + '주로 동해에서 잡히며 수십 kg까지 자랍니다.',
    caution: '참문어와 헷갈리면 위법이 됩니다. '
        + '참문어는 크기 규제가 없는 대신 금어기가 있고, 대문어는 그 반대입니다.',
  },
  {
    species: 'LONGARM_OCTOPUS',
    closedSeasons: [
      { startMonth: 6, startDay: 1, endMonth: 6, endDay: 30, isDefault: true },
      { startMonth: 6, startDay: 21, endMonth: 7, endDay: 20, region: '인천광역시',
        noticeNo: '인천 고시 제2016-109호' },
      { startMonth: 6, startDay: 21, endMonth: 7, endDay: 20, region: '경기도',
        noticeNo: '경기 고시 제2017-26호' },
      { startMonth: 6, startDay: 21, endMonth: 7, endDay: 20, region: '전남광주통합특별시',
        noticeNo: '전라남도 고시 제2016-176호', note: '2026.7.1 전남광주통합특별시가 승계' },
      { startMonth: 6, startDay: 16, endMonth: 7, endDay: 31, region: '경상남도',
        noticeNo: '경상남도 고시 제2016-424호' },
      { startMonth: 4, startDay: 1, endMonth: 5, endDay: 31, region: '충청남도',
        noticeNo: '충남 고시 제2016-131호·제2017-403호', note: '가로림만·근소만에 한정' },
    ],
  },
  {
    species: 'COMMON_SQUID',
    name: '오징어 (살오징어)',
    minLengthCm: 15, lengthBasis: 'MANTLE',
    closedSeasons: [{ startMonth: 4, startDay: 1, endMonth: 5, endDay: 31 }],
    note: '살오징어 기준입니다. 전장이 아니라 외투장(몸통 길이) 15cm 이하가 연중 금지이고, '
        + '4~5월 두 달은 금어기입니다. 업종별 예외는 어업에만 해당하며 낚시인은 기본 기준을 적용받습니다.',
  },

  // ─── 일반 어종 ────────────────────────────────────────────────
  {
    species: 'BLACK_SEA_BREAM', minLengthCm: 25, lengthBasis: 'TOTAL',
    closedSeasons: [{ startMonth: 5, startDay: 1, endMonth: 5, endDay: 31 }],
  },
  { species: 'RED_SEA_BREAM',    minLengthCm: 24, lengthBasis: 'TOTAL' },
  { species: 'STRIPED_BEAKFISH', minLengthCm: 24, lengthBasis: 'TOTAL' },
  { species: 'FLOUNDER',         minLengthCm: 35, lengthBasis: 'TOTAL' },
  { species: 'SEA_BASS',         minLengthCm: 30, lengthBasis: 'TOTAL' },
  {
    species: 'ROCKFISH', minLengthCm: 23, lengthBasis: 'TOTAL',
    note: '조피볼락입니다. 눈 아래에 아래를 향한 가시 3개, 눈에서 뒤아래로 내려오는 검은 띠 2줄, '
        + '꼬리지느러미 위·아래 가장자리가 흰색입니다.',
    caution: '볼락(15cm)·개볼락·누루시볼락과 섞여 잡힙니다. '
           + '15~23cm 구간에서 우럭을 볼락으로 보면 그대로 위법입니다.',
  },
  {
    species: 'BOLLAK', minLengthCm: 15, lengthBasis: 'TOTAL',
    note: '법령이 규정한 것은 볼락(Sebastes inermis) 한 종입니다. '
        + '눈 아래에 예리한 가시 2개가 있고 사선 띠는 없습니다.',
    caution: '가시가 3개면 우럭(조피볼락)이라 23cm가 걸립니다. '
           + '열기·개볼락·황해볼락은 규제가 없습니다.',
  },
  {
    species: 'GREENLING', minLengthCm: 20, lengthBasis: 'TOTAL',
    closedSeasons: [
      { startMonth: 11, startDay: 1, endMonth: 12, endDay: 31,
        note: '서해5도(백령·대청·소청) 일원은 11.15–12.14' },
    ],
    note: '법령이 규정한 것은 쥐노래미(Hexagrammos otakii)입니다. '
        + '옆줄이 5줄이고 꼬리 뒷가장자리 가운데가 안으로 패입니다.',
    caution: '옆줄이 1줄이고 꼬리가 부채처럼 둥글면 노래미로, 규제가 없습니다. '
           + '두 종은 20~30cm에서 겹치므로 구분이 안 되면 20cm 기준을 적용하세요.',
  },
  { species: 'CONGER_EEL',  minLengthCm: 35, lengthBasis: 'TOTAL' },
  { species: 'PIKE_CONGER', minLengthCm: 40, lengthBasis: 'TOTAL' },
  {
    species: 'GAJAMI', minLengthCm: 20, lengthBasis: 'TOTAL',
    closedSeasons: [
      { startMonth: 12, startDay: 1, endMonth: 1, endDay: 31, note: '문치가자미에 적용' },
    ],
    note: '문치가자미·참가자미·용가자미·기름가자미가 모두 20cm 이하 금지입니다. '
        + '금어기는 문치가자미(도다리)에만 있습니다.',
  },
  {
    species: 'FILEFISH',
    note: '쥐치는 규제가 없습니다. 지느러미가 노랗고 체고가 높은 마름모꼴입니다.',
    caution: '말쥐치는 18cm 이하 금지 + 금어기 5.1–7.31 입니다. '
           + '지느러미가 청록색이고 몸이 길쭉하면 말쥐치이며, '
           + '금어기에는 크기와 상관없이 가져갈 수 없습니다.',
  },
  {
    species: 'GIZZARD_SHAD',
    closedSeasons: [
      { startMonth: 5, startDay: 1, endMonth: 7, endDay: 15,
        excludedRegions: ['강원특별자치도', '경상북도'], note: '강원특별자치도·경상북도는 제외' },
    ],
  },
  { species: 'COD',     minLengthCm: 35, lengthBasis: 'TOTAL' },
  { species: 'CROAKER', minLengthCm: 15, lengthBasis: 'TOTAL', note: '참조기 기준입니다.' },
  {
    species: 'RAY', minLengthCm: 42, lengthBasis: 'DISC',
    note: '별표에 오른 것은 참홍어 한 종이며 체반폭 42cm 이하 금지입니다. '
        + '전장이 아니라 몸통 원반의 폭을 재세요.',
    caution: '간재미 등 다른 가오리류는 규제가 없지만, '
           + '참홍어와 구분이 어려우면 42cm 기준으로 보는 쪽이 안전합니다.',
  },
  { species: 'OPALEYE' },
  { species: 'LONGTAIL_OPALEYE' },
  { species: 'YEOLGI' },

  // ─── 회유성 ────────────────────────────────────────────────
  {
    species: 'SAMCHI',
    closedSeasons: [{ startMonth: 5, startDay: 1, endMonth: 5, endDay: 31 }],
  },
  {
    species: 'BANGEO', minLengthCm: 30, lengthBasis: 'TOTAL',
    note: '위턱 뒤끝 윗모서리가 각집니다. 가슴지느러미와 배지느러미 길이가 거의 같습니다.',
    caution: '부시리·잿방어는 규제가 없지만 위턱 뒤끝이 둥글어 방어와 헷갈립니다. '
           + '방어와 부시리는 자연 잡종도 있으니 애매하면 30cm 기준으로 보세요.',
  },
  {
    species: 'MACKEREL', minLengthCm: 21, lengthBasis: 'TOTAL',
    closedSeasons: [
      { startMonth: 4, startDay: 12, endMonth: 5, endDay: 12,
        noticeNo: '해양수산부고시 제2024-40호' },
    ],
    note: '금어기는 시행령이 장관 고시에 위임한 값입니다. '
        + '매년 새로 고시하지 않고 개정될 때만 바뀝니다.',
  },
  {
    species: 'HAIRTAIL', minLengthCm: 18, lengthBasis: 'ANAL',
    closedSeasons: [
      { startMonth: 7, startDay: 1, endMonth: 7, endDay: 31,
        areaNote: '북위 33°00′00″ 이북 해역에 한정' },
    ],
    note: '전장이 아니라 항문장 18cm입니다. 주둥이 끝부터 항문까지를 재세요.',
  },
  { species: 'SANDFISH', minLengthCm: 11, lengthBasis: 'TOTAL' },
];

// ── 런타임 데이터 소스 ────────────────────────────────────────────────────
// 위 배열은 **내장 폴백**이다. 서버(`GET /fish-regulations`)가 응답하면 그 값으로
// 교체된다 — 시·도 고시가 바뀌어도 웹 배포 없이 반영되게 하기 위한 것.
// 서버가 죽었거나 오프라인이면 내장 값이 그대로 쓰인다 (마지막 수동 검증 2026-09-05).
// 아래 판정·목록 함수들은 전부 이 저장소를 읽으므로 호출부는 바꿀 것이 없고,
// 리렌더 트리거만 `useFishRegulations()` 훅이 맡는다.

let current: FishRegulation[] = FISH_REGULATIONS;
let effectiveDate: string = FISH_REGULATION_EFFECTIVE_DATE;
let storeVersion = 0;
const storeListeners = new Set<() => void>();

/** 화면에 병기할 기준일. 서버 값이 오면 그쪽이 우선한다. */
export function regulationEffectiveDate(): string {
  return effectiveDate;
}

/** 데이터가 교체될 때마다 1씩 는다. useMemo 의존성으로 쓴다. */
export function regulationStoreVersion(): number {
  return storeVersion;
}

export function subscribeRegulations(listener: () => void): () => void {
  storeListeners.add(listener);
  return () => {
    storeListeners.delete(listener);
  };
}

/** 서버 응답으로 교체한다. 빈 목록으로 내장값을 지우지는 않는다. */
export function applyServerRegulations(regs: FishRegulation[], serverEffectiveDate?: string): void {
  if (regs.length === 0) return;
  current = regs;
  if (serverEffectiveDate) effectiveDate = serverEffectiveDate;
  storeVersion += 1;
  storeListeners.forEach((l) => l());
}

// ── 판정 ────────────────────────────────────────────────────────────────

/** 해를 넘기는 구간인지 (예: 12.1 → 익년 1.31). */
export function crossesYear(s: ClosedSeason): boolean {
  return s.endMonth < s.startMonth
      || (s.endMonth === s.startMonth && s.endDay < s.startDay);
}

/** `date` 가 이 구간 안에 드는지. 해 넘김을 포함해 판정한다. */
export function seasonContains(s: ClosedSeason, date: Date): boolean {
  const today = (date.getMonth() + 1) * 100 + date.getDate();
  const start = s.startMonth * 100 + s.startDay;
  const end   = s.endMonth   * 100 + s.endDay;
  return start <= end
    ? today >= start && today <= end
    : today >= start || today <= end;
}

export function seasonLabel(s: ClosedSeason): string {
  const from = `${s.startMonth}.${s.startDay}`;
  const to   = `${s.endMonth}.${s.endDay}`;
  return crossesYear(s) ? `${from} – 익년 ${to}` : `${from} – ${to}`;
}

/** `region` 에 실제로 적용되는 금어기 구간. */
export function seasonsFor(reg: FishRegulation, region?: string): ClosedSeason[] {
  const all = reg.closedSeasons ?? [];
  if (all.length === 0) return [];
  if (region) {
    const local = all.filter((s) => s.region === region);
    if (local.length > 0) return local;
  }
  const nationwide = all.filter(
    (s) => !s.region && !(s.excludedRegions ?? []).includes(region ?? ''),
  );
  if (nationwide.length > 0) return nationwide;
  return all.filter((s) => s.isDefault);
}

export function isClosedOn(reg: FishRegulation, date: Date, region?: string): boolean {
  return seasonsFor(reg, region).some((s) => seasonContains(s, date));
}

const LAST_DAY = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 이 구간이 `month` 에 하루라도 걸치는가. */
export function seasonCoversMonth(s: ClosedSeason, month: number): boolean {
  return crossesYear(s)
    ? month >= s.startMonth || month <= s.endMonth
    : month >= s.startMonth && month <= s.endMonth;
}

/** 그 달을 통째로 덮는가. 일부만 걸치면 false — 월 막대에 빗금으로 구분한다. */
export function seasonCoversWholeMonth(s: ClosedSeason, month: number): boolean {
  if (!seasonCoversMonth(s, month)) return false;
  const startsMid = month === s.startMonth && s.startDay > 1;
  const endsMid = month === s.endMonth && s.endDay < LAST_DAY[month - 1];
  return !startsMid && !endsMid;
}

/**
 * `date` 가 속한 **달에 하루라도 걸치면** 금어기로 본다.
 *
 * 오늘만 보면 "9월 30일에 열어 보니 아무것도 없다가 10월 1일에 갑자기 뜬다"가
 * 되어 미리 알려주는 구실을 못 한다. 달 단위로 봐야 이번 달 나갈 계획을 세운다.
 */
export function isClosedInMonth(reg: FishRegulation, date: Date, region?: string): boolean {
  return seasonsFor(reg, region).some((s) => seasonCoversMonth(s, date.getMonth() + 1));
}

/** 이번 달에 하루라도 금어기가 걸리는 항목. */
export function speciesClosedThisMonth(date = new Date(), region?: string): FishRegulation[] {
  return current.filter((r) => isClosedInMonth(r, date, region));
}

export function hasAnyRule(reg: FishRegulation): boolean {
  return reg.minLengthCm != null
      || reg.minWeightG != null
      || (reg.closedSeasons?.length ?? 0) > 0;
}

/** 규제 항목의 경로 열쇠. */
export function regulationKey(reg: FishRegulation): string {
  return reg.id ?? reg.species;
}

/** 화면에 띄울 이름. */
export function regulationName(reg: FishRegulation): string {
  return reg.name ?? FISH_SPECIES_LABELS[reg.species];
}

export function regulationOf(key: string): FishRegulation | undefined {
  return current.find((r) => regulationKey(r) === key);
}

/** 오늘 `region` 에서 금어기인 어종. */
export function speciesClosedNow(date = new Date(), region?: string): FishRegulation[] {
  return current
    .filter((r): r is FishRegulation => !!r)
    .filter((r) => isClosedOn(r, date, region));
}

/** 규제가 하나라도 걸린 어종. */
export function regulatedSpecies(): FishRegulation[] {
  return current
    .filter((r): r is FishRegulation => !!r)
    .filter(hasAnyRule);
}

/**
 * 목록 화면에 실을 어종.
 *
 * 규제가 걸린 어종에 더해, **규제는 없지만 닮은 종과 헷갈려 위법이 되는 어종**
 * (쥐치 → 말쥐치)도 넣는다. 빼 두면 사용자가 목록에 없다는 이유로
 * "이건 괜찮은 종"이라고 오판한다.
 */
export function listedSpecies(): FishRegulation[] {
  return current
    .filter((r): r is FishRegulation => !!r)
    .filter((r) => hasAnyRule(r) || !!r.caution);
}
