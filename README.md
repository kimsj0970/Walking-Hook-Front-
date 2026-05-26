# Walking Hook — Frontend

낚시 어종별 조황 확률 예측 + 커뮤니티 플랫폼

## 기술 스택

- React 19 + TypeScript + Vite
- CSS Modules

## 주요 기능

- 카카오 OAuth 로그인 / 로그아웃 / 회원탈퇴
- 낚시 포인트 지도 (카카오맵)
- 어종별 조황 확률 예측
- 커뮤니티 (예정)

## 시작하기

```bash
npm install
npm run dev
```

## 환경 변수

`.env` 파일을 생성하고 아래 값을 설정하세요.

```
VITE_KAKAO_REST_API_KEY=
VITE_KAKAO_REDIRECT_URI=
VITE_API_BASE_URL=
VITE_KAKAO_MAP_KEY=
```
