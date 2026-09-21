/**
 * 서비스 소개 — 무엇을 하는 서비스인지, 어떻게 쓰는지.
 *
 * 낚시 가이드(`guides.ts`)와 같은 정적 데이터 구조다. API 호출이 없어
 * 비로그인 방문자와 크롤러가 그대로 읽는다.
 *
 * ⚠ 여기에 담으면 안 되는 것 — 어종별 점수 배점·가중치·임계값, 채비 추천 로직,
 *   낚시 포인트·금지구역 좌표. 이 파일은 "무엇을 하는가"만 말한다.
 *
 * 항목은 두 종류다.
 *   · `slug` 가 있으면 상세 페이지(`/about/:slug`)로 들어간다 — 설명할 이야기가 있는 것.
 *   · `href` 만 있으면 그 기능으로 바로 보낸다 — 열어 보면 아는 것.
 *   둘 다 있으면 상세가 우선한다.
 */

export interface AboutShot {
  /** `public/images/about/` 안의 파일명(확장자 제외) */
  image: string;
  /** 이미지 아래 한 줄 설명. 없으면 캡션을 그리지 않는다. */
  caption?: string;
  /** 진입 버튼처럼 작게 보여야 하는 그림 */
  small?: boolean;
}

export interface AboutSection {
  heading: string;
  paragraphs?: string[];
  /** 번호 매긴 사용 순서 */
  steps?: string[];
  shots?: AboutShot[];
  /** 강조 상자 한 줄 */
  callout?: string;
}

export interface AboutItem {
  /** 상세 페이지 주소. 없으면 `href` 로 바로 보낸다. */
  slug?: string;
  /** 바로 가기 대상(앱 내부 경로) */
  href?: string;
  title: string;
  /** 목록 카드의 한 줄 요약 */
  summary: string;
  category: string;
  /** "여기에만 있습니다" 배지 */
  only?: boolean;
  /** 목록 카드 썸네일 */
  thumb: string;
  /** 상세 페이지 맨 위 한 줄 */
  lead?: string;
  /** 상세 페이지 대표 그림 */
  hero?: AboutShot;
  sections?: AboutSection[];
  /** 상세 페이지 맨 아래 "이 기능 열기" 버튼 */
  action?: { label: string; href: string };
}

export const ABOUT_ITEMS: AboutItem[] = [
  {
    slug: 'youtube-points',
    title: '유튜버 포인트 지도',
    summary:
      '영상과 자막을 분석해 언급된 포인트를 뽑아내고, 좌표를 대조해 지도에 얹었습니다. 누르면 그 자리가 나온 영상으로 넘어갑니다.',
    category: '지도',
    only: true,
    thumb: 'youtube-thumb',
    lead: '영상에서 본 그 자리가 어디인지, 더 이상 댓글을 뒤지지 않아도 됩니다.',
    hero: { image: 'youtube-map', caption: '유튜버 포인트를 켠 전국 지도' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '낚시 유튜브를 보다 좋아 보이는 자리를 발견해도, 그게 어느 항 어느 방파제인지 알 방법이 없었습니다. ' +
            '댓글을 뒤지거나, 영상 속 배경을 보고 짐작하거나, 대개는 포기했습니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '낚시 유튜브 영상과 자막을 분석해 언급된 지명을 자리 단위까지 뽑아내고, ' +
            '좌표를 하나씩 대조해 지도에 얹었습니다.',
          '채널별로 필터를 켜고 끌 수 있어서, 즐겨 보는 채널이 다녀간 자리만 골라 볼 수도 있습니다. ' +
            '영상 목록에는 그 포인트가 몇 분 몇 초에 나오는지까지 표시됩니다.',
        ],
        shots: [
          { image: 'youtube-popup', caption: '핀을 누르면 그 포인트가 나오는 영상 수가 뜬다' },
          { image: 'youtube-videos', caption: '등장 시각까지 함께 보여 준다' },
        ],
      },
      {
        heading: '이렇게 씁니다',
        shots: [{ image: 'youtube-button', caption: '홈의 이 버튼으로 들어갑니다', small: true }],
        steps: [
          '홈에서 "모든 낚시 포인트 & 유튜버 포인트"를 누릅니다.',
          '상단에서 "유튜버 포인트"를 고르고, 원하면 채널까지 고릅니다.',
          '핀을 누르면 그 자리가 나온 영상 목록이 뜹니다.',
          '마음에 들면 홈에서 그 포인트를 골라 오늘 조황을 확인합니다.',
        ],
      },
    ],
    action: { label: '포인트 지도 열어 보기', href: '/' },
  },

  {
    slug: 'no-fishing-zones',
    title: '낚시 금지구역 지도',
    summary:
      '흩어져 있던 고시를 모아 지도에 그렸습니다. 어떤 법 어떤 고시로 정해진 구역인지 근거까지 함께 봅니다.',
    category: '지도',
    only: true,
    thumb: 'zone-thumb',
    lead: '여기서 낚시해도 되는지, 지도 한 장으로 확인합니다.',
    hero: { image: 'zone-map', caption: '금지구역·제한구역·어장을 색으로 구분해 표시한다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '낚시 금지구역은 항만법, 수산자원관리법, 해양경찰서 공고 등 여러 갈래에 흩어져 있습니다. ' +
            '관할 기관도 제각각이라 일반인이 "여기가 금지인가"를 확인할 방법이 사실상 없었습니다.',
        ],
        callout: '모르고 들어가도 과태료는 나옵니다. 1차 20만원부터 시작하는 구역도 있습니다.',
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '고시 원문을 읽어 구역을 지도 위에 그렸습니다. 낚시금지구역, 낚시제한구역, 어장 세 종류로 나눠 ' +
            '색을 달리했습니다. 금지와 제한은 성격이 다르기 때문입니다.',
          '구역을 누르면 이름과 함께 **근거 공고 번호와 시행일, 과태료**가 나옵니다. ' +
            '어디서 들은 이야기가 아니라 출처를 밝히고 있다는 뜻입니다.',
        ],
        shots: [{ image: 'zone-detail', caption: '근거 고시와 과태료까지 함께 표시된다' }],
      },
      {
        heading: '이렇게 씁니다',
        shots: [{ image: 'zone-button', caption: '홈의 이 버튼으로 들어갑니다', small: true }],
        steps: [
          '홈에서 "금지구역"을 누릅니다.',
          '가려는 곳까지 지도를 확대합니다. 어장은 확대해야 표시됩니다.',
          '색이 칠해진 구역을 눌러 근거와 과태료를 확인합니다.',
        ],
        callout: '실제 규제 범위와 효력은 관할기관 고시 원문을 기준으로 합니다.',
      },
    ],
    action: { label: '금지구역 지도 열어 보기', href: '/' },
  },

  {
    slug: 'fish-id',
    title: '사진으로 어종 · 크기 판정',
    summary:
      '찍으면 어종을 알려 주고 금어기·금지체장에 걸리는지 판정합니다. 손 한 뼘이 자라서 줄자가 없어도 됩니다.',
    category: '판별',
    only: true,
    thumb: 'fishid-thumb',
    lead: '가져가도 되는 고기인지, 그 자리에서 확인합니다.',
    hero: { image: 'fishid-result', caption: '어종 추정과 규제 판정이 한 화면에 나온다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '금어기와 금지체장은 어종마다 다르고 지역마다 또 다릅니다. ' +
            '현장에서 도감을 뒤지거나 검색해 보기도 어렵고, 닮은 종이면 애초에 뭘 검색해야 할지도 모릅니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '사진을 넣으면 어종을 찾고, 그 어종의 금어기·금지체장을 지역까지 반영해 판정합니다. ' +
            '관찰된 특징을 함께 보여 주기 때문에 왜 그렇게 봤는지 확인할 수 있고, 다르면 직접 고를 수도 있습니다.',
          '크기는 **손 한 뼘을 자로 씁니다.** 그래서 처음 한 번만 내 한 뼘을 등록하면, ' +
            '이후로는 줄자 없이 사진만으로 크기를 잽니다.',
        ],
        shots: [
          { image: 'fishid-upload', caption: '찍는 법을 그림으로 안내한다' },
          { image: 'fishid-analyzing', caption: '10~20초면 끝난다' },
          { image: 'fishid-notice', caption: '여러 마리가 찍혀도 가장 큰 한 마리로 판별한다' },
        ],
      },
      {
        heading: '이렇게 씁니다',
        shots: [{ image: 'fishid-cta', caption: '홈의 이 카드로 들어갑니다' }],
        steps: [
          '홈에서 "사진으로 어종 판별"을 누릅니다.',
          '처음이라면 내 한 뼘을 등록합니다. 마이페이지에서 나중에 바꿀 수 있습니다.',
          '물고기 옆면이 보이게, 펼친 손을 옆에 나란히 두고 위에서 찍습니다.',
          '판정을 확인하고, 필요하면 그대로 조과글로 올립니다.',
        ],
        callout: '판별과 판정은 참고용입니다. 최종 확인은 직접 해 주세요.',
      },
    ],
    action: { label: '어종 판별 열어 보기', href: '/fish-id' },
  },

  {
    slug: 'conditions',
    title: '포인트별 AI 조황 분석',
    summary:
      '수온·파고·물때 등 아홉 가지를 한 번에 보여 주고, 어떤 어종이 잘 나올지 점수와 근거를 냅니다.',
    category: '조황',
    thumb: 'conditions-thumb',
    lead: '오늘 거기가 어떤지, 숫자와 이유로 봅니다.',
    hero: { image: 'conditions-gauge', caption: '아홉 칸마다 출처와 측정 시각이 붙는다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '수온은 국립수산과학원, 조석은 국립해양조사원, 날씨는 기상청. ' +
            '한 번 나가려면 서로 다른 사이트를 몇 개씩 돌아야 했고, 그렇게 모아도 ' +
            '"그래서 오늘 뭐가 잘 나오는데?"는 결국 감으로 판단했습니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '포인트를 고르면 수온, 파고, 풍속, 물때, 조류, 하늘, 기온, 몇 물, 강수량을 한 화면에 모읍니다. ' +
            '칸마다 어느 기관의 어느 자료를 몇 시 기준으로 가져왔는지 적어 둡니다.',
          '그 조건에서 어종별로 얼마나 기대할 수 있는지 점수를 매기고, ' +
            '**왜 그 점수인지**를 현재 상황·포인트 적합성·공략 방향·채비 운용·주의사항으로 나눠 설명합니다.',
        ],
        shots: [
          { image: 'conditions-species', caption: '어종별 기대도와 순위' },
          { image: 'conditions-tide', caption: '조석 그래프와 시간별 예보' },
          { image: 'conditions-reason', caption: '지그 무게까지 짚어 주는 분석 근거' },
        ],
      },
      {
        heading: '이렇게 씁니다',
        steps: [
          '홈에서 포인트를 고르거나, 지도에서 핀을 누릅니다.',
          '고르면 화면이 계기판까지 자동으로 내려갑니다.',
          '어종 카드의 "분석"을 눌러 근거를 폅니다.',
        ],
        shots: [{ image: 'conditions-map', caption: '지도에서 골라도 됩니다' }],
      },
    ],
    action: { label: '포인트 고르러 가기', href: '/' },
  },

  {
    slug: 'regulations',
    title: '금어기 · 금지체장',
    summary:
      '어종·지역별로 언제 못 잡고 몇 cm 미만이 금지인지 정리했습니다. 헷갈리는 어종은 나란히 비교합니다.',
    category: '규제',
    thumb: 'regulation-thumb',
    lead: '가져가도 되는지, 어종별로 찾아봅니다.',
    hero: { image: 'regulation-list', caption: '과태료와 근거 조항을 맨 위에 둔다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '금어기와 금지체장은 수산자원관리법 시행령에 있지만, 표가 방대하고 지역 예외가 붙습니다. ' +
            '게다가 대문어와 참문어, 광어와 가자미처럼 닮은 종끼리 규제가 다른 경우가 많습니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '방파제·갯바위에서 걸어 들어가는 낚시인이 만날 만한 어종만 추려 정리했습니다. ' +
            '규제가 갈리는 닮은 종에는 "닮은 종 주의" 표시를 달았습니다.',
          '어종을 누르면 일러스트, 금지체장과 그 측정 기준, 열두 칸 달력으로 그린 금어기, ' +
            '생김새로 가리는 법, 서식·먹이·산란기까지 나옵니다.',
        ],
        shots: [
          { image: 'regulation-detail', caption: '측정 기준과 구분 형질까지 함께' },
          { image: 'regulation-compare', caption: '헷갈리는 어종은 나란히 놓고 가른다' },
        ],
      },
      {
        heading: '이렇게 씁니다',
        shots: [{ image: 'regulation-button', caption: '홈의 이 버튼으로 들어갑니다', small: true }],
        steps: [
          '홈에서 "금어기"를 누릅니다.',
          '"이번 달 금어기"로 지금 걸리는 어종만 볼 수 있습니다.',
          '헷갈리는 어종은 상단의 "헷갈리는 어종"에서 비교합니다.',
        ],
        callout: '고시는 바뀔 수 있습니다. 최종 확인은 관할기관 고시 원문을 기준으로 합니다.',
      },
    ],
    action: { label: '금어기 표 보러 가기', href: '/regulations' },
  },

  {
    slug: 'cctv',
    title: 'CCTV로 미리 보기',
    summary: '주요 항만의 지금 모습을 지도에서 바로 봅니다. 출발 전에 파도를 눈으로 확인합니다.',
    category: '현장',
    thumb: 'cctv-thumb',
    lead: '예보 숫자 말고, 지금 거기가 어떤지 봅니다.',
    hero: { image: 'cctv-popup', caption: '핀을 누르면 그 항구의 지금 모습이 뜬다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '파고 0.5m가 실제로 어느 정도인지는 숫자만으로 가늠하기 어렵습니다. ' +
            '한참 달려가서야 "오늘은 아니구나" 하고 돌아서는 일이 생깁니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '주요 항만의 CCTV 화면을 지도에 얹었습니다. 여러 항구를 동시에 띄워 비교할 수도 있습니다.',
          '지금은 **10분 단위로 갱신되는 정지 화면**입니다. 공공데이터가 그 주기로 제공되기 때문입니다. ' +
            '화면마다 언제 기준인지 함께 표시합니다. 실시간 영상으로 바꾸는 작업을 진행하고 있습니다.',
        ],
        shots: [{ image: 'cctv-map', caption: '주요 항만에 카메라가 찍혀 있다' }],
      },
      {
        heading: '이렇게 씁니다',
        shots: [{ image: 'cctv-button', caption: '홈의 이 버튼으로 들어갑니다', small: true }],
        steps: ['홈에서 "CCTV"를 누릅니다.', '가려는 항구의 핀을 누릅니다.'],
      },
    ],
    action: { label: 'CCTV 지도 열어 보기', href: '/map/cctv' },
  },

  {
    href: '/tackle',
    title: '루어 채비 · 낚시 가이드',
    summary:
      '로드·릴·원줄·쇼크리더·매듭을 장비 그림과 함께 정리했습니다. 물때 보는 법과 안전 수칙도 글로 담았습니다.',
    category: '채비',
    thumb: 'tackle-thumb',
  },

  {
    slug: 'catch-board',
    title: '조황 게시판',
    summary:
      '남들이 어디서 뭘 잡았는지 봅니다. 포인트·지역·날짜·어종으로 걸러서 볼 수 있습니다.',
    category: '커뮤니티',
    thumb: 'board-thumb',
    lead: '글 목록이 아니라 필터입니다.',
    hero: { image: 'board-list', caption: '글마다 어종·포인트·잡은 날짜가 함께 붙는다' },
    sections: [
      {
        heading: '무엇이 문제였나',
        paragraphs: [
          '조황 정보는 카페와 단톡방에 흩어져 있고, 대부분 "오늘 잘 나왔다" 정도로 끝납니다. ' +
            '어디서 언제 뭐가 나왔는지를 되짚어 보려면 글을 하나씩 열어 봐야 했습니다.',
        ],
      },
      {
        heading: '어떻게 했나',
        paragraphs: [
          '글을 쓸 때 어종과 포인트, 잡은 날짜를 함께 받습니다. 그래서 목록만 훑어도 ' +
            '"언제, 어디서, 뭐가"가 읽히고, 네 가지 기준으로 걸러 볼 수 있습니다.',
        ],
        steps: [
          '지도로 보기 — 지도에서 포인트를 찍으면 그 자리에서 실제로 조과가 올라온 글만 남습니다.',
          '지역으로 보기 — 시·도 단위로 추립니다.',
          '날짜로 보기 — 연·월을 골라 그때 뭐가 나왔는지 봅니다. 작년 이맘때가 올해 판단의 근거가 됩니다.',
          '어종으로 찾기 — 노리는 어종만 골라 봅니다.',
        ],
        shots: [
          { image: 'board-map', caption: '지도에서 포인트를 골라 거른다' },
          { image: 'board-filter', caption: '그 포인트에서 잡힌 글만 남는다' },
          { image: 'board-date', caption: '연·월로 되짚어 본다' },
          { image: 'board-species', caption: '어종으로 고른다' },
        ],
      },
    ],
    action: { label: '조황 게시판 가기', href: '/catch-posts' },
  },
];

/** 상세가 있는 항목만 — 라우트 매칭에 쓴다. */
export function findAboutItem(slug: string): AboutItem | undefined {
  return ABOUT_ITEMS.find((item) => item.slug === slug);
}
