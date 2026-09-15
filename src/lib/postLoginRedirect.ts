/**
 * 로그인 후 돌아갈 자리.
 *
 * 소셜 로그인은 카카오·네이버로 페이지를 통째로 넘겼다가 `/oauth/callback` 으로
 * 되돌아온다 — 그 사이 SPA 상태가 전부 날아가므로, 가려던 곳은 sessionStorage 에
 * 적어 두는 수밖에 없다(`oauth_state` 와 같은 방식).
 *
 * 값은 **앱 내부 경로만** 받는다. 외부 URL 이 들어오면 로그인 직후 임의의 사이트로
 * 튕겨 보낼 수 있다(오픈 리다이렉트). `//evil.com` 같은 프로토콜 상대 경로도 막는다.
 */
const KEY = 'post_login_redirect';

function isInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//');
}

export function setPostLoginRedirect(path: string): void {
  if (!isInternalPath(path)) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* 사파리 프라이빗 모드 등 — 돌아갈 자리를 못 적어도 로그인 자체는 되어야 한다 */
  }
}

/** 한 번 읽으면 지운다. 다음 로그인에 묵은 값이 따라붙지 않게. */
export function takePostLoginRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return path && isInternalPath(path) ? path : null;
  } catch {
    return null;
  }
}
