// 이 파일은 도구로 생성한다. 손으로 고치지 말 것.
// 앱 `core/data/species_compare.dart` 와 같은 소스에서 뽑는다.

/**
 * 헷갈리는 어종 구별 — 나란히 놓고 보는 표.
 * 
 * **왜 이 화면이 있나.** 닮은 종끼리 규제가 다르다. 볼락 15cm / 우럭 23cm,
 * 말쥐치만 18cm, 쭈꾸미만 금어기 — 종을 잘못 알면 그대로 위법이 된다.
 * 
 * `decisive` 가 true 인 줄이 실제로 종을 가르는 형질이다. 나머지는 보조다.
 * **자료가 갈리거나 기관 기재를 못 찾은 형질은 "자료 없음"으로 두었다.**
 * 애매한 근거로 단정하면 사용자가 잘못된 물고기를 가져간다.
 */

export interface CompareEntry {
  name: string;
  /** 규제 항목 열쇠. 있으면 어종 상세로 넘어간다. */
  regKey?: string;
  /** 규정 한 줄 요약. */
  rule?: string;
}

export interface CompareRow {
  label: string;
  /** `entries` 와 같은 순서. */
  values: string[];
  /** 실제로 종을 가르는 형질인가. 화면에서 강조한다. */
  decisive?: boolean;
}

export interface SpeciesCompare {
  id: string;
  title: string;
  /** 한 줄로 끝내는 판별법. */
  decisive: string;
  /** 왜 갈라야 하는가 — 규제가 어떻게 다른가. */
  why?: string;
  entries: CompareEntry[];
  rows: CompareRow[];
  note?: string;
  sources: string[];
}

export const SPECIES_COMPARES: SpeciesCompare[] = [
  {
    id: 'ROCKFISHES',
    title: '볼락 · 우럭 · 쏨뱅이',
    decisive: '눈 앞 아래 가시를 센다',
    why: '금지체장이 다릅니다. 볼락 15cm, 우럭 23cm. 쏨뱅이는 규제가 없습니다.',
    entries: [
      { name: '볼락', regKey: 'BOLLAK', rule: '전장 15cm 이하 금지' },
      { name: '우럭 (조피볼락)', regKey: 'ROCKFISH', rule: '전장 23cm 이하 금지' },
      { name: '쏨뱅이', rule: '규제 없음' },
    ],
    rows: [
      { label: '눈 앞 아래 가시', values: ['2개', '3개 (하나가 떨어져 있음)', '길고 날카롭게 발달'], decisive: true },
      { label: '눈 아래 사선 띠', values: ['없음', '2줄 (앞쪽이 더 진함)', '없음'], decisive: true },
      { label: '꼬리지느러미 끝', values: ['둥글다', '위·아래 끝이 흰색', '—'] },
      { label: '몸빛', values: ['회갈색에 흐릿한 띠 5~6개', '회갈색에 흑색 반점', '불규칙한 흑갈색 얼룩'] },
      { label: '머리', values: ['가시가 약하다', '주걱턱(아래턱이 길다)', '우락부락하고 두 눈 사이가 팸'] },
    ],
    note: '불볼락(열기)도 누골 가시가 2개라 이 형질로는 볼락과 못 가릅니다. 불볼락은 붉은 몸에 각진 반문 5개입니다.',
    sources: ['해양수산부 어식백과', '한국어 위키백과', '국립해양생물자원관'],
  },
  {
    id: 'GREENLINGS',
    title: '쥐노래미 · 노래미',
    decisive: '몸 옆의 옆줄 개수를 센다',
    why: '규제는 쥐노래미에만 걸립니다. 전장 20cm 이하 금지, 금어기 11.1~12.31.',
    entries: [
      { name: '쥐노래미', regKey: 'GREENLING', rule: '전장 20cm 이하 · 금어기 있음' },
      { name: '노래미', rule: '규제 없음' },
    ],
    rows: [
      { label: '옆줄', values: ['5줄', '1줄'], decisive: true },
      { label: '꼬리지느러미 뒷가장자리', values: ['직선이거나 살짝 오목', '둥글다'], decisive: true },
      { label: '눈 위 피판', values: ['작은 돌기', '깃털 모양'] },
      { label: '크기', values: ['30~45cm (최대 60)', '약 30cm'] },
    ],
    sources: ['국립해양생물자원관', '서울대 해양저서생태학연구실'],
  },
  {
    id: 'FLATFISHES',
    title: '광어 · 가자미',
    decisive: '배를 아래로 두고 눈이 어느 쪽에 있는지 본다 — 좌광우도',
    why: '금지체장이 크게 다릅니다. 광어 35cm, 문치가자미 20cm.',
    entries: [
      { name: '광어 (넙치)', regKey: 'FLOUNDER', rule: '전장 35cm 이하 금지' },
      { name: '가자미 (문치가자미)', regKey: 'GAJAMI', rule: '전장 20cm 이하 금지' },
    ],
    rows: [
      { label: '눈 위치', values: ['왼쪽', '오른쪽'], decisive: true },
      { label: '입', values: ['크게 열려 눈 뒤를 지난다', '작다. 눈 한가운데에도 못 미친다'], decisive: true },
      { label: '이빨', values: ['강한 이가 한 줄', '날카로운 이 없음'] },
      { label: '옆줄', values: ['가슴지느러미에서 활처럼 휜다', '한 번 솟았다가 거의 직선'] },
    ],
    note: '가자미과 전체로 일반화하면 틀립니다. 강도다리는 가자미과인데 눈이 왼쪽입니다. 종 단위로 보세요.',
    sources: ['국립수산과학원', '국립해양생물자원관'],
  },
  {
    id: 'OCTOPUSES',
    title: '참문어 · 대문어',
    decisive: '몸통 무늬와 크기를 본다',
    why: '규정이 정반대입니다. 참문어는 크기 규제가 없고 금어기가 있으며, 대문어는 600g 제한이 있고 금어기가 없습니다.',
    entries: [
      { name: '참문어 (돌문어)', regKey: 'COMMON_OCTOPUS', rule: '금어기 5.16~6.30 · 크기 규제 없음' },
      { name: '대문어 (피문어)', regKey: 'GIANT_PACIFIC_OCTOPUS', rule: '600g 이하 금지 · 금어기 없음' },
    ],
    rows: [
      { label: '몸통 무늬', values: ['다각형', '세로방향 물결무늬'], decisive: true },
      { label: '크기', values: ['1.3m 안팎, 3kg 넘기 드묾', '국내 최대 50kg'], decisive: true },
      { label: '주로 잡히는 곳', values: ['남해', '동해'] },
      { label: '사는 수심', values: ['조간대 하부~60m', '저조선~180m'] },
    ],
    note: '인터넷에 도는 "참문어 300g"은 2020년 입법예고 때 나왔다가 금어기로 대체돼 폐기된 안입니다.',
    sources: ['수산자원관리법 시행령 개정문', '국립해양생물자원관', '어업in수산'],
  },
  {
    id: 'SMALL_OCTOPUSES',
    title: '낙지 · 쭈꾸미',
    decisive: '팔 길이와 팔이 시작되는 곳의 금빛 고리를 본다',
    why: '쭈꾸미에만 금어기가 있습니다. 5.11~8.31. 낙지는 지역별 금어기가 따로 있습니다.',
    entries: [
      { name: '낙지', regKey: 'LONGARM_OCTOPUS', rule: '금어기 6월 (지역별 상이)' },
      { name: '쭈꾸미', regKey: 'WEBFOOT_OCTOPUS', rule: '금어기 5.11~8.31' },
    ],
    rows: [
      { label: '팔 길이', values: ['몸통의 3~5배', '몸통의 2배 정도'], decisive: true },
      { label: '팔 8개의 길이', values: ['제각각 (첫째가 가장 김)', '거의 같다'], decisive: true },
      { label: '금빛 고리', values: ['없음', '팔 기부 좌우에 하나씩, 모두 2개'], decisive: true },
      { label: '크기', values: ['전장 60~70cm', '전장 20~24cm'] },
      { label: '사는 곳', values: ['갯벌 뻘·뻘모래에 굴을 판다', '모래·자갈 바닥, 소라 껍데기 안'] },
    ],
    sources: ['국립해양생물자원관', '해양수산부 어식백과', 'SeaLifeBase'],
  },
  {
    id: 'EELS',
    title: '갯장어 · 붕장어',
    decisive: '옆줄을 따라 흰 점이 줄지어 있는지 본다',
    why: '금지체장이 다릅니다. 갯장어 40cm, 붕장어 35cm.',
    entries: [
      { name: '갯장어', regKey: 'PIKE_CONGER', rule: '전장 40cm 이하 금지' },
      { name: '붕장어', regKey: 'CONGER_EEL', rule: '전장 35cm 이하 금지' },
    ],
    rows: [
      { label: '옆줄 흰 점', values: ['없음', '한 줄로 줄지어 있고 위쪽에 한 줄 더'], decisive: true },
      { label: '이빨', values: ['억센 송곳니가 드러난다', '한 줄. 입을 다물면 안 보인다'], decisive: true },
      { label: '주둥이', values: ['길고 삼각형으로 뾰족', '상대적으로 짧고 둥근 편'] },
      { label: '크기', values: ['120~200cm', '암컷 90cm · 수컷 40cm'] },
    ],
    sources: ['국립수산과학원', '해양수산부 어식백과', 'FishBase'],
  },
  {
    id: 'SEA_BREAMS',
    title: '참돔 · 감성돔',
    decisive: '몸빛과 파란 점을 본다',
    why: '금지체장이 다릅니다. 참돔 24cm, 감성돔 25cm. 감성돔에만 금어기(5.1~5.31)가 있습니다.',
    entries: [
      { name: '참돔', regKey: 'RED_SEA_BREAM', rule: '전장 24cm 이하 금지' },
      { name: '감성돔', regKey: 'BLACK_SEA_BREAM', rule: '전장 25cm 이하 · 금어기 5월' },
    ],
    rows: [
      { label: '몸빛', values: ['적갈색~붉은색', '금속광택 도는 회흑색'], decisive: true },
      { label: '파란 점', values: ['몸 위쪽과 옆줄 주위에 흩어져 있다', '기재 없음'], decisive: true },
      { label: '꼬리지느러미', values: ['뒷가장자리 검고 아래 가장자리 흼', '—'] },
      { label: '사는 수심', values: ['10~200m 암초', '50m 이내, 기수역까지'] },
    ],
    note: '"감성돔에 파란 점이 없다"고 못 박힌 기재는 찾지 못했습니다. 참돔에 있다는 것만 확인됐으니 참돔 쪽을 기준으로 보세요. 체색이 훨씬 확실한 구별점입니다.',
    sources: ['해양수산부 어식백과', '국립해양생물자원관', 'FishBase'],
  },
  {
    id: 'AMBERJACKS',
    title: '방어 · 부시리 · 잿방어',
    decisive: '위턱 뒤끝 모서리가 각졌는지 둥근지 본다',
    why: '금지체장은 방어에만 걸립니다. 전장 30cm 이하 금지.',
    entries: [
      { name: '방어', regKey: 'BANGEO', rule: '전장 30cm 이하 금지' },
      { name: '부시리', rule: '규제 없음' },
      { name: '잿방어', rule: '규제 없음' },
    ],
    rows: [
      { label: '위턱 뒤끝 모서리', values: ['각졌다', '둥글다', '둥글다'], decisive: true },
      { label: '가슴 vs 배지느러미', values: ['거의 같은 길이', '가슴이 더 짧다', '자료 없음'], decisive: true },
      { label: '머리 무늬', values: ['없음', '없음', '눈을 비스듬히 지나는 갈색 띠'] },
      { label: '등쪽 색', values: ['청색', '짙은 청색', '자색을 띤 청색'] },
    ],
    note: '크기와 활어·선어에 따라 몸빛이 달라져 색으로 가르기는 어렵습니다. 부시리의 몸 옆 노란 띠는 기관 자료로 확인되지 않아 넣지 않았습니다.',
    sources: ['해양수산부 어식백과', '어업in수산(국립수산과학원 인용)', 'FishBase'],
  },
  {
    id: 'CODS',
    title: '대구 · 명태',
    decisive: '아래턱 수염 길이와 어느 턱이 앞으로 나왔는지 본다',
    why: '금지체장은 대구에만 걸립니다. 전장 35cm 이하 금지, 금어기 1.16~2.15.',
    entries: [
      { name: '대구', regKey: 'COD', rule: '전장 35cm 이하 · 금어기 1~2월' },
      { name: '명태', rule: '별도 확인 필요' },
    ],
    rows: [
      { label: '아래턱 수염', values: ['눈 지름보다 길다', '흔적만 있어 거의 안 보인다'], decisive: true },
      { label: '앞으로 나온 턱', values: ['위턱', '아래턱'], decisive: true },
      { label: '등·뒷지느러미', values: ['등 3개 · 뒷 2개', '등 3개 · 뒷 2개 (같다)'] },
      { label: '몸 무늬', values: ['흩뿌려진 반점과 물결무늬', '암갈색 세로띠 3줄 정도'] },
    ],
    note: '등지느러미 3개·뒷지느러미 2개는 두 종이 똑같습니다. 이 형질로는 못 가릅니다.',
    sources: ['국립수산과학원', '한국어 위키백과', 'FishBase'],
  },
  {
    id: 'FILEFISHES',
    title: '쥐치 · 말쥐치',
    decisive: '몸이 넓적한 타원인지 길쭉한 유선형인지 본다',
    why: '금지체장 18cm는 말쥐치에만 걸립니다. 쥐치는 규제가 없습니다.',
    entries: [
      { name: '쥐치', regKey: 'FILEFISH', rule: '규제 없음' },
      { name: '말쥐치', rule: '전장 18cm 이하 금지' },
    ],
    rows: [
      { label: '체형', values: ['체고가 높은 타원. 세로로 넓적', '길쭉한 유선형'], decisive: true },
      { label: '등지느러미 첫 가시', values: ['눈 바로 위에서 곧게 솟는다', '자료 없음'], decisive: true },
      { label: '몸빛', values: ['황색·회갈색에 암갈색 얼룩', '청갈색. 지느러미가 청록·암청색'] },
      { label: '크기', values: ['최대 20~30cm (자료마다 갈림)', '최대 37cm'] },
    ],
    note: '⚠️ 말쥐치의 형질을 국내 기관 자료에서 찾지 못했습니다. 지금 확실히 쓸 수 있는 건 체형뿐입니다. 애매하면 놓아 주세요.',
    sources: ['해양수산부 어식백과', '한국어 위키백과', 'FishBase'],
  },
  {
    id: 'SHADS',
    title: '전어 · 밴댕이',
    decisive: '아가미 뒤 검은 점과 등지느러미 끝을 본다',
    why: '금어기는 전어에만 걸립니다. 5.1~7.15 (강원·경북 제외).',
    entries: [
      { name: '전어', regKey: 'GIZZARD_SHAD', rule: '금어기 5.1~7.15' },
      { name: '밴댕이', rule: '규제 없음' },
    ],
    rows: [
      { label: '아가미 뒤 검은 점', values: ['크게 하나. 그 뒤로 점줄', '없음'], decisive: true },
      { label: '등지느러미 마지막 연조', values: ['실처럼 길게 늘어난다', '늘어나지 않는다'], decisive: true },
      { label: '크기', values: ['25~32cm', '약 20cm'] },
    ],
    sources: ['한국어 위키백과', 'FishBase'],
  },
  {
    id: 'SKATES',
    title: '참홍어 · 간재미',
    decisive: '주둥이가 뾰족한지 둥근지 본다',
    why: '금지체장은 참홍어에만 걸립니다. 체반 폭 42cm 이하 금지.',
    entries: [
      { name: '참홍어', regKey: 'RAY', rule: '체반 폭 42cm 이하 금지' },
      { name: '간재미 (홍어)', rule: '별도 확인 필요' },
    ],
    rows: [
      { label: '주둥이', values: ['앞으로 돌출하고 끝이 뾰족', '둥글다'], decisive: true },
      { label: '체반 모양', values: ['마름모꼴. 너비가 매우 넓다', '오각형'], decisive: true },
      { label: '체반 폭', values: ['최대 90cm', '평균 30cm'] },
      { label: '사는 곳', values: ['수심 깊은 근해', '서해·남해 얕은 연안 모래질'] },
    ],
    note: '이름이 헷갈립니다. 시장에서 "홍어"라 부르는 것이 참홍어이고, "간재미"가 표준명 홍어입니다.',
    sources: ['해양수산부 어식백과', '국립수산과학원(언론 인용)'],
  },
];

export function compareOf(id: string): SpeciesCompare | undefined {
  return SPECIES_COMPARES.find((c) => c.id === id);
}
