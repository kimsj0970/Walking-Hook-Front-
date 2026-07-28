/**
 * 조황 게시물·낚시 포인트에서 공통으로 쓰는 어종 목록.
 * 백엔드 `FishSpecies` 와 값이 1:1로 대응한다.
 *
 * 포인트(`MigratoryFishPoint#targetSpecies`)에는 회유성 어종만 등록할 수 있어서
 * 관리자 화면은 서버가 걸러 내려주는 목록(`/admin/migratory-fish-points/species`)을 쓰거나
 * 여기의 {@link MIGRATORY_SPECIES_OPTIONS} 를 쓴다.
 */

export type SpeciesGroup = 'MIGRATORY' | 'RESIDENT' | 'CEPHALOPOD';

export const SPECIES_GROUP_LABELS: Record<SpeciesGroup, string> = {
  MIGRATORY:  '회유성',
  RESIDENT:    '일반 어종',
  CEPHALOPOD: '두족류',
};

export type FishSpecies =
  // 회유성
  | 'SAMCHI' | 'BANGEO' | 'BUSSIRI' | 'JATBANGEO' | 'MACKEREL' | 'TUNA' | 'JEONGAENGI'
  // 일반 어종
  | 'FLOUNDER' | 'ROCKFISH' | 'BLACK_SEA_BREAM' | 'RED_SEA_BREAM' | 'OPALEYE'
  | 'STRIPED_BEAKFISH' | 'SEA_BASS'
  // 두족류
  | 'CUTTLEFISH' | 'BIGFIN_REEF_SQUID' | 'WEBFOOT_OCTOPUS';

export const FISH_SPECIES_LABELS: Record<FishSpecies, string> = {
  SAMCHI:            '삼치',
  BANGEO:            '방어',
  BUSSIRI:           '부시리',
  JATBANGEO:         '잿방어',
  MACKEREL:          '고등어',
  TUNA:              '참치',
  JEONGAENGI:        '전갱이',
  FLOUNDER:          '광어',
  ROCKFISH:          '우럭',
  BLACK_SEA_BREAM:   '감성돔',
  RED_SEA_BREAM:     '참돔',
  OPALEYE:           '벵에돔',
  STRIPED_BEAKFISH:  '돌돔',
  SEA_BASS:          '농어',
  CUTTLEFISH:        '갑오징어',
  BIGFIN_REEF_SQUID: '무늬오징어',
  WEBFOOT_OCTOPUS:   '쭈꾸미',
};

export const FISH_SPECIES_GROUPS: Record<FishSpecies, SpeciesGroup> = {
  SAMCHI:            'MIGRATORY',
  BANGEO:            'MIGRATORY',
  BUSSIRI:           'MIGRATORY',
  JATBANGEO:         'MIGRATORY',
  MACKEREL:          'MIGRATORY',
  TUNA:              'MIGRATORY',
  JEONGAENGI:        'MIGRATORY',
  FLOUNDER:          'RESIDENT',
  ROCKFISH:          'RESIDENT',
  BLACK_SEA_BREAM:   'RESIDENT',
  RED_SEA_BREAM:     'RESIDENT',
  OPALEYE:           'RESIDENT',
  STRIPED_BEAKFISH:  'RESIDENT',
  SEA_BASS:          'RESIDENT',
  CUTTLEFISH:        'CEPHALOPOD',
  BIGFIN_REEF_SQUID: 'CEPHALOPOD',
  WEBFOOT_OCTOPUS:   'CEPHALOPOD',
};

export const FISH_SPECIES_OPTIONS = Object.entries(FISH_SPECIES_LABELS) as [FishSpecies, string][];

/** 그룹별로 묶은 어종 목록 — 어종 선택 UI를 소제목과 함께 그릴 때 쓴다. */
export const FISH_SPECIES_BY_GROUP: [SpeciesGroup, [FishSpecies, string][]][] =
  (Object.keys(SPECIES_GROUP_LABELS) as SpeciesGroup[]).map((group) => [
    group,
    FISH_SPECIES_OPTIONS.filter(([code]) => FISH_SPECIES_GROUPS[code] === group),
  ]);

/** 포인트에 등록할 수 있는 회유성 어종만. */
export const MIGRATORY_SPECIES_OPTIONS = FISH_SPECIES_OPTIONS.filter(
  ([code]) => FISH_SPECIES_GROUPS[code] === 'MIGRATORY',
);

export function isMigratorySpecies(code: FishSpecies): boolean {
  return FISH_SPECIES_GROUPS[code] === 'MIGRATORY';
}

/**
 * 어종명이 목록의 어종과 정확히 일치하면 그 코드를 돌려준다.
 * 사용자가 칩을 누르지 않고 "방어"라고 직접 입력한 경우를 같은 어종으로 묶기 위한 것이다.
 */
export function speciesCodeFromLabel(label: string): FishSpecies | null {
  const trimmed = label.trim();
  const found = FISH_SPECIES_OPTIONS.find(([, name]) => name === trimmed);
  return found ? found[0] : null;
}

// ── 어종 직접 입력 규칙 (백엔드 CatchPostService 검증과 같은 규칙) ──────────────

export const MAX_SPECIES_COUNT = 10;
export const MAX_SPECIES_NAME_LENGTH = 10;

/** 한글·영문·숫자·공백만 허용 — 이모지·특수문자를 막는다. */
const ALLOWED_NAME = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/;

/** 앞뒤 공백을 없애고 연속 공백을 한 칸으로 줄인다. */
export function normalizeSpeciesName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/** 문제가 있으면 사용자에게 보여줄 문구를, 없으면 null을 돌려준다. */
export function validateSpeciesName(raw: string, alreadyPicked: string[]): string | null {
  const name = normalizeSpeciesName(raw);
  if (!name) return '어종을 입력해주세요.';
  if (name.length > MAX_SPECIES_NAME_LENGTH) return `어종명은 ${MAX_SPECIES_NAME_LENGTH}자 이내로 입력해주세요.`;
  if (!ALLOWED_NAME.test(name)) return '어종명은 한글·영문·숫자만 사용할 수 있습니다.';
  if (alreadyPicked.includes(name)) return '이미 추가한 어종입니다.';
  if (alreadyPicked.length >= MAX_SPECIES_COUNT) return `어종은 최대 ${MAX_SPECIES_COUNT}개까지 추가할 수 있습니다.`;
  return null;
}
