import { type ReactElement } from 'react';
import { FlatfishSVG, BlackPorgySVG, RockfishSVG, SeabassSVG } from './FishImages';
import styles from './FishProbabilityCard.module.css';

export interface FishData {
  id: string;
  name: string;
  probability: number | null; // null = 로딩 중
  trend: 'up' | 'down' | 'stable' | null;
  colorFrom: string;
  colorTo: string;
}

interface Props {
  fish: FishData;
  onClick?: () => void;
}

const FISH_LIST: FishData[] = [
  { id: 'flatfish',   name: '광어',   probability: null, trend: null, colorFrom: '#0077B6', colorTo: '#0096C7' },
  { id: 'blackporgy', name: '감성돔', probability: null, trend: null, colorFrom: '#5A189A', colorTo: '#7B2FBE' },
  { id: 'rockfish',   name: '우럭',   probability: null, trend: null, colorFrom: '#005F73', colorTo: '#0A9396' },
  { id: 'seabass',    name: '농어',   probability: null, trend: null, colorFrom: '#AE2012', colorTo: '#CA6702' },
];

export { FISH_LIST };

const FISH_SVG: Record<string, (props: { className?: string }) => ReactElement> = {
  flatfish:   FlatfishSVG,
  blackporgy: BlackPorgySVG,
  rockfish:   RockfishSVG,
  seabass:    SeabassSVG,
};

function ProbabilityRing({ value, colorFrom, colorTo }: { value: number; colorFrom: string; colorTo: string }) {
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const id = `grad-${colorFrom.replace('#', '')}`;

  return (
    <svg className={styles.ring} viewBox="0 0 100 100">
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colorFrom} />
          <stop offset="100%" stopColor={colorTo} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export default function FishProbabilityCard({ fish, onClick }: Props) {
  const isLoading = fish.probability === null;
  const FishImage = FISH_SVG[fish.id];

  const getProbabilityLabel = (p: number) => {
    if (p >= 75) return { label: '매우 좋음', color: '#10B981' };
    if (p >= 50) return { label: '좋음', color: '#3B82F6' };
    if (p >= 25) return { label: '보통', color: '#F59E0B' };
    return { label: '낮음', color: '#EF4444' };
  };

  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
    >
      {/* 상단 그라디언트 헤더 */}
      <div
        className={styles.cardTop}
        style={{ background: `linear-gradient(135deg, ${fish.colorFrom}, ${fish.colorTo})` }}
      >
        {FishImage ? (
          <FishImage className={styles.fishImage} />
        ) : null}
        <span className={styles.fishName}>{fish.name}</span>
      </div>

      {/* 본문 */}
      <div className={styles.cardBody}>
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <div className={`${styles.skeletonRing} skeleton`} />
            <div className={`${styles.skeletonText} skeleton`} />
            <div className={`${styles.skeletonLabel} skeleton`} />
          </div>
        ) : (
          <>
            <div className={styles.ringWrap}>
              <ProbabilityRing
                value={fish.probability!}
                colorFrom={fish.colorFrom}
                colorTo={fish.colorTo}
              />
              <div className={styles.ringCenter}>
                <div className={styles.ringValue}>
                  <span className={styles.probability}>{fish.probability!}</span>
                  <span className={styles.percentSign}>%</span>
                </div>
              </div>
            </div>

            {(() => {
              const { label, color } = getProbabilityLabel(fish.probability!);
              return (
                <div className={styles.statusBadge} style={{ color, borderColor: color + '66', background: color + '22' }}>
                  {label}
                </div>
              );
            })()}

            {fish.trend && (
              <div className={styles.trend}>
                {fish.trend === 'up' && <span className={styles.trendUp}>↑ 상승 중</span>}
                {fish.trend === 'down' && <span className={styles.trendDown}>↓ 하락 중</span>}
                {fish.trend === 'stable' && <span className={styles.trendStable}>→ 유지 중</span>}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
