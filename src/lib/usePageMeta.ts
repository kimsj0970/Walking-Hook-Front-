import { useEffect } from 'react';

/**
 * 화면마다 <title> 과 설명을 바꾼다.
 *
 * SPA 는 index.html 하나로 모든 주소를 그리기 때문에, 아무것도 안 하면 **모든
 * 페이지의 제목이 똑같다.** 2026-10 AdSense 반려 당시 실제로 전 페이지가
 * "Walking Hook" 하나였다 — 검색엔진과 심사자에게는 같은 페이지가 수십 개
 * 복제된 것처럼 보인다. 설명(meta description)은 아예 없었다.
 *
 * 화면을 떠나면 기본값으로 되돌린다. 선언하지 않은 화면이 앞 화면의 제목을
 * 물려받는 일을 막기 위해서다.
 */
export const DEFAULT_TITLE = '워킹 훅 — 걸어서 가는 바다낚시 포인트';
export const DEFAULT_DESCRIPTION =
  '걸어서 들어가는 바다낚시 포인트, 물때·바람·파고 기반 AI 조황 분석, 사진 한 장으로 어종과 크기 판정, 금어기·금지체장 확인까지. 서해·남해·제주 포인트를 한곳에서.';

function setTag(selector: string, create: () => HTMLMetaElement, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function apply(title: string, description: string) {
  document.title = title;
  setTag('meta[name="description"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('name', 'description');
    return m;
  }, description);
  setTag('meta[property="og:title"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:title');
    return m;
  }, title);
  setTag('meta[property="og:description"]', () => {
    const m = document.createElement('meta');
    m.setAttribute('property', 'og:description');
    return m;
  }, description);
}

/** 한 줄 요약이 너무 길면 검색 결과에서 잘린다. 160자 근처에서 끊는다. */
function trim(text: string): string {
  const flat = text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  return flat.length <= 160 ? flat : `${flat.slice(0, 157)}…`;
}

export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    apply(title ? `${title} | 워킹 훅` : DEFAULT_TITLE, description ? trim(description) : DEFAULT_DESCRIPTION);
    return () => apply(DEFAULT_TITLE, DEFAULT_DESCRIPTION);
  }, [title, description]);
}
