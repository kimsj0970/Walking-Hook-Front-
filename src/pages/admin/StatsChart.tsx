import { useMemo } from 'react';
import type { Granularity, StatsBucket } from '../../api/adminStatsApi';
import styles from './UserStatsPage.module.css';

/**
 * 활성 사용자(막대, 왼쪽 축) + 신규 가입자(선, 오른쪽 축).
 *
 * 축을 둘로 나눈 이유: 자릿수가 달라(활성 수백 vs 신규 수십) 한 축에 그리면 신규가 바닥에 깔린다.
 * 색은 파랑/주황 — 빨강/초록은 색각 이상에서 구분되지 않는다.
 *
 * 차트 라이브러리를 쓰지 않는다. 홈의 TideChart 와 같이 손으로 그린 SVG 다
 * (관리자 전용 화면 하나 때문에 번들을 늘리지 않는다).
 */

const W = 1180;
const H = 240;
const BASE = 200;   // x축 y좌표
const PLOT = 180;   // 막대가 쓸 수 있는 높이

interface Props {
  buckets: StatsBucket[];
  granularity: Granularity;
  onSelect?: (bucket: StatsBucket) => void;
}

export default function StatsChart({ buckets, granularity, onSelect }: Props) {
  const geom = useMemo(() => {
    const n = buckets.length || 1;
    const step = W / n;
    const barW = Math.min(step * 0.62, 120);

    const activeMax = Math.max(1, ...buckets.map(b => b.activeUsers ?? 0));
    const newMax = Math.max(1, ...buckets.map(b => b.newUsers ?? 0));
    const activeTop = activeMax * 1.15;
    const newTop = newMax * 1.15;

    const cx = (i: number) => step * i + step / 2;
    const activeY = (v: number) => BASE - (v / activeTop) * PLOT;
    const newY = (v: number) => BASE - (v / newTop) * PLOT;

    // 아직 오지 않은 구간은 하나의 회색 밴드로 묶는다 (0명이 아니라 데이터가 없는 것)
    const firstFuture = buckets.findIndex(b => b.activeUsers == null);
    const futureBand = firstFuture >= 0
      ? { x: step * firstFuture, w: W - step * firstFuture, mid: step * firstFuture + (W - step * firstFuture) / 2 }
      : null;

    // 일 단위에서만 주말에 옅은 배경을 깐다. 낚시 앱이라 주말 피크가 뚜렷하게 보인다.
    const weekendBands = granularity !== 'DAY'
      ? []
      : buckets.flatMap((b, i) => {
          const dow = new Date(`${b.key}T00:00:00`).getDay();
          return dow === 0 || dow === 6 ? [{ x: step * i, w: step }] : [];
        });

    const linePoints = buckets
      .map((b, i) => (b.newUsers == null ? null : `${cx(i).toFixed(1)},${newY(b.newUsers).toFixed(1)}`))
      .filter((p): p is string => p !== null)
      .join(' ');

    return { step, barW, cx, activeY, newY, futureBand, weekendBands, linePoints, activeTop, newTop };
  }, [buckets, granularity]);

  const lastReal = buckets.filter(b => b.newUsers != null).length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={styles.chartSvg}
      role="img"
      aria-label="기간별 활성 사용자 막대 그래프와 신규 가입자 선 그래프"
    >
      {geom.weekendBands.map((b, i) => (
        <rect key={`we${i}`} x={b.x} y={0} width={b.w} height={BASE} fill="#EEF3FE" />
      ))}
      {geom.futureBand && (
        <>
          <rect x={geom.futureBand.x} y={0} width={geom.futureBand.w} height={BASE} fill="#F1F3F7" />
          <text x={geom.futureBand.mid} y={BASE / 2} textAnchor="middle" fontSize="12" fill="#667085">
            아직 오지 않음
          </text>
        </>
      )}

      <line x1={0} y1={BASE} x2={W} y2={BASE} stroke="#D5DAE3" strokeWidth={1} />
      <line x1={0} y1={BASE - PLOT / 2} x2={W} y2={BASE - PLOT / 2} stroke="#E4E8EF" strokeWidth={1} strokeDasharray="4 5" />
      <line x1={0} y1={BASE - PLOT} x2={W} y2={BASE - PLOT} stroke="#E4E8EF" strokeWidth={1} strokeDasharray="4 5" />

      {buckets.map((b, i) => {
        if (b.activeUsers == null) return null;
        const y = geom.activeY(b.activeUsers);
        return (
          <rect
            key={b.key}
            x={geom.cx(i) - geom.barW / 2}
            y={y}
            width={geom.barW}
            height={Math.max(BASE - y, 1)}
            rx={4}
            fill={b.partial ? '#3C6FD4' : '#1D4FBF'}
            className={onSelect ? styles.chartBar : undefined}
            onClick={onSelect ? () => onSelect(b) : undefined}
          />
        );
      })}

      {geom.linePoints && (
        <polyline
          points={geom.linePoints}
          fill="none"
          stroke="#B45309"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {buckets.map((b, i) =>
        b.newUsers == null || i !== lastReal ? null : (
          <circle key={`dot${b.key}`} cx={geom.cx(i)} cy={geom.newY(b.newUsers)} r={5} fill="#FFFFFF" stroke="#B45309" strokeWidth={2.5} />
        ),
      )}

      {buckets.map((b, i) => {
        // 칸이 많으면 라벨이 겹친다 — 간격을 보고 건너뛴다
        const skip = geom.step < 34 ? Math.ceil(34 / geom.step) : 1;
        if (i % skip !== 0 && !b.partial) return null;
        return (
          <text
            key={`lb${b.key}`}
            x={geom.cx(i)}
            y={BASE + 22}
            textAnchor="middle"
            fontSize="11"
            fontWeight={b.partial ? 700 : 400}
            fill={b.activeUsers == null ? '#98A2B3' : b.partial ? '#101828' : '#667085'}
          >
            {b.label}
          </text>
        );
      })}
    </svg>
  );
}
