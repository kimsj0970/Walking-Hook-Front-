/**
 * 홈 화면 공용 선(stroke) 아이콘 세트.
 *
 * 이모지 아이콘을 SVG 로 교체하면서 만들었다 — 이모지는 OS 마다 모양·색이 달라
 * 화면 전체의 색 톤을 흐트러뜨린다. 여기 아이콘은 전부 currentColor 를 쓰므로
 * 부모의 color 만 정하면 팔레트를 따라간다.
 *
 * 24x24 뷰박스, stroke 기반(두께 1.8~2)이 기본 문법이다.
 */
import type { CSSProperties } from 'react';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
};

function base(
  paths: React.ReactNode,
  { size = 20, color = 'currentColor', strokeWidth = 1.8, style, className }: IconProps,
) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

/** 낚싯바늘 — 로고 */
export function HookIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M12 3v9a5 5 0 0 0 10 0h-3a2 2 0 0 1-4 0V3" />
      <circle cx="12" cy="3" r="1.6" />
    </>,
    p,
  );
}

/** 지도 핀 */
export function PinIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>,
    p,
  );
}

/** 물고기 */
export function FishIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M3 12c3.5-4.5 8.5-4.5 12 0-3.5 4.5-8.5 4.5-12 0z" />
      <path d="M15 12l5-3.5v7L15 12z" />
    </>,
    p,
  );
}

/** 접힌 지도 */
export function MapIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M9 3 3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" />
      <path d="M9 3v16M15 5v16" />
    </>,
    p,
  );
}

/** CCTV 카메라 */
export function CctvIcon(p: IconProps = {}) {
  return base(
    <>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M16 10.5l6-3.5v10l-6-3.5" />
    </>,
    p,
  );
}

/** 금지 */
export function BanIcon(p: IconProps = {}) {
  return base(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 5.6l12.8 12.8" />
    </>,
    p,
  );
}

/** 가이드 책 */
export function BookIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </>,
    p,
  );
}

/** 자(체장 규제) */
export function RulerIcon(p: IconProps = {}) {
  return base(
    <>
      <rect x="3" y="8" width="18" height="8" rx="1.5" transform="rotate(-20 12 12)" />
      <path d="M8.2 12.9l1-2.7M11.6 11.6l1-2.7M15 10.4l1-2.7" />
    </>,
    p,
  );
}

/** 온도계 */
export function ThermoIcon(p: IconProps = {}) {
  return base(<path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z" />, p);
}

/** 파도 */
export function WaveIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M3 14c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0" />
      <path d="M3 8c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0" />
    </>,
    p,
  );
}

/** 바람 */
export function WindIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    </>,
    p,
  );
}

/** 물때(순환 화살표) */
export function TideCycleIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v5h-5" />
    </>,
    p,
  );
}

/** 해 */
export function SunIcon(p: IconProps = {}) {
  return base(
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>,
    p,
  );
}

/** 해+구름 (구름많음) */
export function SunCloudIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M6.8 6.8a4 4 0 0 1 6.9 2.1" />
      <path d="M9 4V2.5M3.9 5.4l1 1M2.5 10.5H4" />
      <path d="M7 20a4 4 0 1 1 .8-7.9A5.2 5.2 0 0 1 18 13.6 3.2 3.2 0 0 1 17 20z" />
    </>,
    p,
  );
}

/** 구름 (흐림) */
export function CloudIcon(p: IconProps = {}) {
  return base(
    <path d="M6.5 19a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19 12.5 3.75 3.75 0 0 1 17.5 19z" />,
    p,
  );
}

/** 비 */
export function RainIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M6.5 16a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19 9.5 3.75 3.75 0 0 1 17.5 16z" />
      <path d="M8 20l1-2M12 21l1-2M16 20l1-2" />
    </>,
    p,
  );
}

/** 눈 */
export function SnowIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M6.5 15a4.5 4.5 0 1 1 .9-8.9A6 6 0 0 1 19 8.5 3.75 3.75 0 0 1 17.5 15z" />
      <path d="M8 19h.01M12 21h.01M16 19h.01M10 22h.01M14 18h.01" strokeWidth={2.6} />
    </>,
    p,
  );
}

/** 우산(강수 없음 기본) */
export function UmbrellaIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z" />
      <path d="M12 12v6a2 2 0 0 0 4 0" />
    </>,
    p,
  );
}

/** 일출 */
export function SunriseIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M17 18a5 5 0 1 0-10 0" />
      <path d="M12 9V3M9.5 5.5L12 3l2.5 2.5" />
      <path d="M2 18h2M20 18h2M4.9 12.9l1.4 1.4M17.7 14.3l1.4-1.4M2 22h20" />
    </>,
    p,
  );
}

/** 일몰 */
export function SunsetIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M17 18a5 5 0 1 0-10 0" />
      <path d="M12 3v6M9.5 6.5L12 9l2.5-2.5" />
      <path d="M2 18h2M20 18h2M4.9 12.9l1.4 1.4M17.7 14.3l1.4-1.4M2 22h20" />
    </>,
    p,
  );
}

/**
 * 달 위상 — 몇 물 카드.
 * phase: 0(그믐/조금) ~ 1(보름/사리). 두 원의 겹침으로 위상을 흉내낸다.
 */
export function MoonPhaseIcon({ phase, size = 24 }: { phase: number; size?: number }) {
  const r = 9;
  // phase 0 = 완전히 어두움, 1 = 완전히 밝음
  const lit = Math.max(0, Math.min(1, phase));
  const offset = (1 - lit) * r * 2;
  const id = `moonclip-${Math.round(lit * 100)}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <clipPath id={id}>
          <circle cx={12} cy={12} r={r} />
        </clipPath>
      </defs>
      <circle cx={12} cy={12} r={r} fill="none" stroke="currentColor" strokeWidth={1.6} />
      <circle
        cx={12 + offset}
        cy={12}
        r={r}
        fill="currentColor"
        opacity={0.85}
        clipPath={`url(#${id})`}
      />
    </svg>
  );
}

/** 트로피 */
export function TrophyIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a3 3 0 0 0 3 5M17 6h3a3 3 0 0 1-3 5" />
    </>,
    p,
  );
}

/** 번개 */
export function BoltIcon(p: IconProps = {}) {
  return base(<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />, p);
}

/** 경고 삼각형 */
export function AlertIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" strokeWidth={2.4} />
    </>,
    p,
  );
}

/** 카메라(사진 첨부) */
export function CameraIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M4 7h3l2-2h6l2 2h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.5" />
    </>,
    p,
  );
}

/** 말풍선(댓글) */
export function CommentIcon(p: IconProps = {}) {
  return base(
    <path d="M21 12a8 8 0 0 1-8 8H4l2.5-3A8 8 0 1 1 21 12z" />,
    p,
  );
}

/** 좋아요 */
export function LikeIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3z" />
      <path d="M7 11l4-8a2.5 2.5 0 0 1 2.4 3.1L12.8 9H19a2 2 0 0 1 2 2.4l-1.3 7A2 2 0 0 1 17.7 20H7" />
    </>,
    p,
  );
}

/** 조류(들물·날물) — 파도 위 흐름 화살표 */
export function FlowIcon(p: IconProps = {}) {
  return base(
    <>
      <path d="M3 16c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0" />
      <path d="M4 8h13M14 4.5 17.5 8 14 11.5" />
    </>,
    p,
  );
}
