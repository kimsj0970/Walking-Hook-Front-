import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  fetchUserStats,
  type Granularity,
  type StatsBucket,
  type UserStats,
} from '../../api/adminStatsApi';
import StatsChart from './StatsChart';
import styles from './UserStatsPage.module.css';

/**
 * 관리자 사용자 통계 — 년·월·주·일 × (활성 사용자, 신규 가입자).
 *
 * 조작 모형: 버튼은 줌아웃, 칸 클릭은 줌인.
 *  - [년][월][주][일] 은 단위만 바꾸고 보고 있던 기간은 유지한다
 *  - 칸을 누르면 한 단계 좁아지면서 버튼도 따라 옮겨진다
 *  - ◀ ▶ 는 같은 단위에서 앞뒤 기간으로 이동. 미래 쪽은 비활성
 * breadcrumb 은 두지 않는다 — 버튼이 그 역할을 겸하고 조작이 한 번 줄어든다.
 *
 * 합계는 전부 응답의 summary 를 그대로 쓴다. buckets 를 더하지 않는다 —
 * 활성 사용자는 중복 제거 값이라 하위 단위를 더해도 상위 단위가 되지 않는다.
 */

const ORDER: Granularity[] = ['YEAR', 'MONTH', 'WEEK', 'DAY'];
const LABEL: Record<Granularity, string> = { YEAR: '년', MONTH: '월', WEEK: '주', DAY: '일' };
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const nf = new Intl.NumberFormat('ko-KR');
const TODAY = new Date();
const THIS_YEAR = TODAY.getFullYear();
const THIS_MONTH = TODAY.getMonth() + 1;

/** 활성 사용자 농도 5단계. 숫자는 항상 같이 쓴다 — 색만으로 수치를 전달하지 않는다. */
function heatLevel(value: number | null, max: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value == null) return 0;
  if (value <= 0 || max <= 0) return 1;
  const ratio = value / max;
  if (ratio > 0.85) return 5;
  if (ratio > 0.65) return 4;
  if (ratio > 0.4) return 3;
  return 2;
}

export default function UserStatsPage() {
  const [params, setParams] = useSearchParams();

  const granularity = (ORDER.includes(params.get('g') as Granularity)
    ? (params.get('g') as Granularity)
    : 'MONTH');
  const year = Number(params.get('y')) || THIS_YEAR;
  const month = Number(params.get('m')) || THIS_MONTH;
  const selectedDay = params.get('d');

  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const move = useCallback(
    (next: { g?: Granularity; y?: number; m?: number; d?: string | null }) => {
      const p = new URLSearchParams(params);
      p.set('g', next.g ?? granularity);
      p.set('y', String(next.y ?? year));
      p.set('m', String(next.m ?? month));
      if (next.d) p.set('d', next.d);
      else p.delete('d');
      setParams(p);
    },
    [params, setParams, granularity, year, month],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchUserStats(
      granularity,
      granularity === 'YEAR' ? undefined : year,
      granularity === 'WEEK' || granularity === 'DAY' ? month : undefined,
    )
      .then(data => { if (alive) setStats(data); })
      .catch(() => { if (alive) setError('통계를 불러오지 못했습니다.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [granularity, year, month]);

  const buckets = stats?.buckets ?? [];
  const activeMax = useMemo(
    () => Math.max(0, ...buckets.map(b => b.activeUsers ?? 0)),
    [buckets],
  );

  /** 칸 클릭 = 한 단계 좁게. 일 뷰에서는 하루 상세를 연다. */
  const drillDown = (bucket: StatsBucket) => {
    if (bucket.activeUsers == null) return;   // 아직 오지 않은 기간
    const d = new Date(`${bucket.key}T00:00:00`);
    switch (granularity) {
      case 'YEAR':  return move({ g: 'MONTH', y: d.getFullYear() });
      case 'MONTH': return move({ g: 'WEEK', y: d.getFullYear(), m: d.getMonth() + 1 });
      case 'WEEK':  return move({ g: 'DAY', y: d.getFullYear(), m: d.getMonth() + 1 });
      case 'DAY':   return move({ d: bucket.key });
    }
  };

  const shift = (delta: number) => {
    if (granularity === 'MONTH') return move({ y: year + delta });
    const base = new Date(year, month - 1 + delta, 1);
    move({ y: base.getFullYear(), m: base.getMonth() + 1 });
  };

  const rangeLabel =
    granularity === 'YEAR' ? '전체 연도'
      : granularity === 'MONTH' ? `${year}년`
        : `${year}년 ${month}월`;

  const atLatest =
    granularity === 'MONTH'
      ? year >= THIS_YEAR
      : year > THIS_YEAR || (year === THIS_YEAR && month >= THIS_MONTH);

  const selected = selectedDay ? buckets.find(b => b.key === selectedDay) ?? null : null;

  return (
    <div className={styles.page}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>사용자 통계</h1>
        <p className={styles.subtitle}>접속 사용자와 신규 가입자를 기간별로 봅니다</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.segment} role="group" aria-label="기간 단위">
          {ORDER.map(g => (
            <button
              key={g}
              type="button"
              aria-pressed={granularity === g}
              className={granularity === g ? styles.segOn : styles.segOff}
              onClick={() => move({ g, d: null })}
            >
              {LABEL[g]}
            </button>
          ))}
        </div>

        {granularity === 'YEAR' ? (
          <span className={styles.rangeLabel}>{rangeLabel}</span>
        ) : (
          <div className={styles.stepper}>
            <button type="button" aria-label="이전 기간" className={styles.stepBtn} onClick={() => shift(-1)}>‹</button>
            <span className={styles.rangeLabel}>{rangeLabel}</span>
            <button
              type="button"
              aria-label="다음 기간"
              className={styles.stepBtn}
              disabled={atLatest}
              onClick={() => shift(1)}
            >›</button>
          </div>
        )}

        <span className={styles.hint}>버튼 = 한 단계 넓게 · 칸 클릭 = 한 단계 좁게</span>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {stats && (
        <>
          <div className={styles.tiles}>
            <Tile label="현재 회원 수" value={nf.format(stats.summary.currentMembers)} />
            <Tile label={`${rangeLabel} 활성 사용자`} value={nf.format(stats.summary.activeUsers)} tone="blue" />
            <Tile label={`${rangeLabel} 신규 가입자`} value={nf.format(stats.summary.newUsers)} tone="amber" />
            <Tile label="활성 사용자 일평균" value={nf.format(stats.summary.activeAvgPerDay)} />
          </div>

          <div className={styles.notice}>
            <b>활성 사용자는 중복을 제거한 값입니다.</b> 아래 칸의 수치를 더해도 이 값과 같아지지 않습니다.
            같은 사람이 여러 날 접속했기 때문이고, 신규 가입자만 더해집니다.
          </div>
          <div className={styles.noticeWarn}>
            <b>신규 가입자는 “그 기간에 가입해서 지금까지 남아 있는 사람” 입니다.</b> 탈퇴 계정은
            5일 뒤 삭제되어 과거 수치에서 빠지므로, 월끼리의 정밀 비교보다 추세 읽기에 씁니다.
          </div>

          {loading && <p className={styles.loading}>불러오는 중…</p>}

          {granularity === 'WEEK'
            ? <WeekList buckets={buckets} activeMax={activeMax} onSelect={drillDown} />
            : <Grid buckets={buckets} granularity={granularity} activeMax={activeMax} selectedKey={selectedDay} onSelect={drillDown} />}

          {selected && <DayDetail bucket={selected} onClose={() => move({ d: null })} />}

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <h2 className={styles.cardTitle}>{rangeLabel} 추이</h2>
              <span className={styles.legend}><i className={styles.swatchBar} />활성 사용자 (왼쪽)</span>
              <span className={styles.legend}><i className={styles.swatchLine} />신규 가입자 (오른쪽)</span>
              {granularity === 'DAY' && <span className={styles.legend}><i className={styles.swatchWeekend} />주말</span>}
              <span className={styles.cardHint}>막대를 누르면 한 단계 좁아집니다</span>
            </div>
            <StatsChart buckets={buckets} granularity={granularity} onSelect={drillDown} />
          </div>
        </>
      )}

      {!stats && loading && <p className={styles.loading}>불러오는 중…</p>}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'amber' }) {
  const cls = tone === 'blue' ? styles.tileBlue : tone === 'amber' ? styles.tileAmber : styles.tileValue;
  return (
    <div className={styles.tile}>
      <p className={styles.tileLabel}>{label}</p>
      <p className={cls}>{value}<span className={styles.unit}>명</span></p>
    </div>
  );
}

function Cell({ bucket, activeMax, selected, onSelect }: {
  bucket: StatsBucket; activeMax: number; selected: boolean; onSelect: (b: StatsBucket) => void;
}) {
  if (bucket.activeUsers == null) {
    return <div className={styles.cellFuture}><span className={styles.cellLabel}>{bucket.label}</span></div>;
  }
  const lv = heatLevel(bucket.activeUsers, activeMax);
  return (
    <button
      type="button"
      className={[styles.cell, styles[`heat${lv}`], selected ? styles.cellSelected : '', bucket.partial ? styles.cellNow : ''].filter(Boolean).join(' ')}
      onClick={() => onSelect(bucket)}
    >
      <span className={styles.cellLabel}>{bucket.label}{bucket.partial ? ' · 진행 중' : ''}</span>
      <span className={styles.cellValue}>{nf.format(bucket.activeUsers)}</span>
      <span className={styles.cellSub}>신규 {nf.format(bucket.newUsers ?? 0)}</span>
    </button>
  );
}

function Grid({ buckets, granularity, activeMax, selectedKey, onSelect }: {
  buckets: StatsBucket[]; granularity: Granularity; activeMax: number;
  selectedKey: string | null; onSelect: (b: StatsBucket) => void;
}) {
  // 일 뷰만 달력 모양(일~토). 1일이 무슨 요일인지에 따라 앞쪽에 빈 칸을 채운다.
  const leading = granularity === 'DAY' && buckets.length
    ? new Date(`${buckets[0].key}T00:00:00`).getDay()
    : 0;
  const cols = granularity === 'DAY' ? 7 : granularity === 'MONTH' ? 4 : 3;

  return (
    <div className={styles.card}>
      {granularity === 'DAY' && (
        <div className={styles.weekHead}>
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={i === 0 ? styles.wkSun : i === 6 ? styles.wkSat : styles.wkDay}>{d}</span>
          ))}
        </div>
      )}
      <div className={styles.grid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: leading }, (_, i) => <div key={`pad${i}`} />)}
        {buckets.map(b => (
          <Cell key={b.key} bucket={b} activeMax={activeMax} selected={b.key === selectedKey} onSelect={onSelect} />
        ))}
      </div>
      <div className={styles.legendRow}>
        <span className={styles.legendText}>활성 사용자 적음</span>
        <span className={styles.scale}>
          <i className={styles.heat1} /><i className={styles.heat2} /><i className={styles.heat3} /><i className={styles.heat4} /><i className={styles.heat5} />
        </span>
        <span className={styles.legendText}>많음</span>
        <span className={styles.legendNote}>점선 칸은 아직 오지 않은 기간 — 0명이 아니라 데이터 없음입니다</span>
      </div>
    </div>
  );
}

/**
 * 주는 달력이 아니라 목록으로 보여준다.
 * 주가 달 경계에서 잘리기 때문에 날수를 반드시 같이 써야 한다 —
 * "1주 320명, 2주 480명"만 보이면 3일짜리 1주가 급락으로 읽힌다.
 */
function WeekList({ buckets, activeMax, onSelect }: {
  buckets: StatsBucket[]; activeMax: number; onSelect: (b: StatsBucket) => void;
}) {
  return (
    <div className={styles.card}>
      <div className={styles.weekRowHead}>
        <span className={styles.wkCol1}>주</span>
        <span className={styles.wkCol2}>기간</span>
        <span className={styles.wkCol3}>활성 사용자</span>
        <span className={styles.wkCol4}>신규 가입자</span>
      </div>
      {buckets.map(b => {
        if (b.activeUsers == null) {
          return (
            <div key={b.key} className={styles.weekRowFuture}>
              <span className={styles.wkCol1}>{b.label}</span>
              <span className={styles.wkCol2}>{b.subLabel}</span>
              <span className={styles.wkCol3}>아직 오지 않은 주</span>
              <span className={styles.wkCol4}>—</span>
            </div>
          );
        }
        const pct = activeMax > 0 ? Math.max(3, Math.round((b.activeUsers / activeMax) * 100)) : 0;
        return (
          <button
            key={b.key}
            type="button"
            className={b.partial ? styles.weekRowNow : styles.weekRow}
            onClick={() => onSelect(b)}
          >
            <span className={styles.wkCol1}>{b.label}</span>
            <span className={styles.wkCol2}>
              {b.subLabel}
              <em className={b.partial ? styles.wkNow : styles.wkDays}>
                {b.partial ? ' · 진행 중' : ` · ${b.days}일`}
              </em>
            </span>
            <span className={styles.wkCol3}>
              <b className={styles.wkNum}>{nf.format(b.activeUsers)}</b>
              <span className={styles.wkBarTrack}><span className={styles.wkBarFill} style={{ width: `${pct}%` }} /></span>
            </span>
            <span className={styles.wkCol4}><b className={styles.wkNew}>{nf.format(b.newUsers ?? 0)}</b></span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * 하루 상세.
 * 시간대별 접속자는 보여줄 수 없다 — user_access_log 는 날짜만 저장한다.
 */
function DayDetail({ bucket, onClose }: { bucket: StatsBucket; onClose: () => void }) {
  const d = new Date(`${bucket.key}T00:00:00`);
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <p className={styles.detailTitle}>
          {d.getMonth() + 1}월 {d.getDate()}일 <span className={styles.detailDow}>{WEEKDAYS[d.getDay()]}요일</span>
        </p>
        <button type="button" aria-label="상세 닫기" className={styles.detailClose} onClick={onClose}>✕</button>
      </div>
      <div className={styles.detailTiles}>
        <div className={styles.detailTileBlue}>
          <p className={styles.detailLabel}>활성 사용자</p>
          <p className={styles.detailBlue}>{nf.format(bucket.activeUsers ?? 0)}</p>
        </div>
        <div className={styles.detailTileAmber}>
          <p className={styles.detailLabel}>신규 가입자</p>
          <p className={styles.detailAmber}>{nf.format(bucket.newUsers ?? 0)}</p>
        </div>
      </div>
      <p className={styles.detailNote}>
        시간대별 접속자는 표시할 수 없습니다 — 접속 로그가 날짜 단위로만 남습니다.
      </p>
    </div>
  );
}
