import { getInMemoryToken } from './authApi';

/**
 * 웹 체험판(비로그인) — 투표 기간 동안만.
 *
 * 서버는 기존 엔드포인트의 자물쇠를 그대로 두고 `/demo/**` 라는 별도 문을 낸다(앱이 부르는 API 가
 * 바뀌면 안 되기 때문). 웹은 **로그인 안 했으면** 같은 요청을 `/demo` 접두어로 보낸다.
 * 로그인하면 지금까지와 완전히 같은 경로다.
 *
 * 켜고 끄는 스위치는 없다. 체험판이 끝나면 이 파일과 관련 컴포넌트를 지운다.
 */

/** 지금 이 요청이 체험판 경로로 가야 하는가 — 비로그인이면 그렇다. */
export function isDemoMode(): boolean {
  return !getInMemoryToken();
}

/**
 * 기존 경로 → 체험판 경로. 로그인 상태면 그대로 돌려준다.
 *
 * 각 api 함수의 경로 문자열을 이걸로 감싸는 것이 전부다. 호출하는 화면·모달은 자기가 어느 문으로
 * 나가는지 몰라도 된다.
 */
export function demoPath(path: string): string {
  return isDemoMode() ? `/demo${path}` : path;
}
