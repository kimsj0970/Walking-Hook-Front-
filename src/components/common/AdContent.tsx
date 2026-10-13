import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * "이 화면에 읽을 본문이 있는가" 를 화면 스스로 선언하게 하는 장치.
 *
 * 예전에는 {@link AnchorAdSlot} 이 경로 문자열(allowlist/denylist)로 판단했다.
 * 그 방식은 **경로는 맞지만 본문이 없는 화면**을 놓친다. 실제로 셋이 새어 나갔다.
 *   · /catch-posts/123 — 게시물 상세는 URL 이 없다(같은 주소의 모달). 매칭되는
 *     라우트가 없어 아무것도 렌더되지 않는데, 접두사가 같아서 광고만 떴다.
 *   · /guide/없는슬러그 — "존재하지 않는 가이드입니다" 한 줄 + 광고.
 *   · 주소 오타 — 404 라우트가 없어 완전한 백지 + 광고.
 *
 * AdSense 는 이것을 "게시자 콘텐츠가 없는 화면에 게재된 광고" 위반으로 보고
 * **사이트 전체**를 반려한다(2026-10-13 실제 반려 사유). 그래서 판단 기준을
 * 경로가 아니라 **본문 렌더 여부**로 옮겼다. 경로는 추측이고, 이건 사실이다.
 *
 * 새 화면에 광고를 붙이려면 그 화면에서 {@link useAdContent}(true) 를 부른다.
 * 기준은 하나다 — **로그인 없이 열었을 때도 읽을 글이 그 화면에 있는가.**
 * 로그인해야 보이는 화면은 심사자와 크롤러에게는 빈 화면이므로 해당되지 않는다.
 */
const AdContentContext = createContext<{
  hasContent: boolean;
  declare: (value: boolean) => void;
}>({ hasContent: false, declare: () => {} });

export function AdContentProvider({ children }: { children: ReactNode }) {
  const [hasContent, declare] = useState(false);
  return (
    <AdContentContext.Provider value={{ hasContent, declare }}>
      {children}
    </AdContentContext.Provider>
  );
}

/**
 * 이 화면에 본문이 있음을 선언한다.
 *
 * 화면을 떠나면 cleanup 이 자동으로 false 로 되돌리므로, **다음 화면이 직접
 * 선언하지 않는 한 광고는 꺼져 있는 것이 기본값**이다. 새 페이지를 추가하다가
 * 깜빡해도 "광고가 안 뜨는" 쪽으로 틀리지, "빈 화면에 광고가 뜨는" 쪽으로
 * 틀리지 않는다. 반려를 한 번 겪었으니 안전한 방향을 기본값으로 둔다.
 */
export function useAdContent(hasContent: boolean) {
  const { declare } = useContext(AdContentContext);
  useEffect(() => {
    declare(hasContent);
    return () => declare(false);
  }, [hasContent, declare]);
}

export function useHasAdContent(): boolean {
  return useContext(AdContentContext).hasContent;
}
