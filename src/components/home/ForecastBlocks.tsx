import { useMemo, useState } from 'react';
import type { HourlyForecast, DailyForecast } from '../../api/fishingPointApi';
import { SunIcon, SunCloudIcon, CloudIcon, RainIcon, SnowIcon } from '../common/Icons';
import styles from './ForecastBlocks.module.css';

/**
 * 히어로 계기판 안에 들어가는 예보 블록 두 개. 앱의 `forecast_blocks.dart` 와 같은 화면이다.
 *
 * 데이터가 없으면 아무것도 그리지 않는다(서버가 빈 배열이 아니라 null 을 준다).
 * 백엔드가 `hourly`/`daily` 를 못 채운 동안에도 홈은 그대로 뜬다.
 *
 * ⚠ 여기에 "지금" 값은 들어오지 않는다. 관측값은 위 계기 타일이 기존 소스 우선순위 그대로
 * 담당하고, 이 블록들은 예보만 맡는다. 한 줄에 관측과 예보를 섞으면 소스 계통이 달라
 * 값이 튄다(예보 풍속은 육상 5km 격자 기준).
 */

/** 풍속 강조 임계값 — 서버 FishingConditionsService.CAUTION_WIND 과 같은 값.
 *  여기서는 색만 바꾼다. 출조 판정 자체는 서버가 한다. */
const WIND_CAUTION_MS = 12.0;

/** 하늘 상태 → 선 아이콘. 강수형태가 있으면 그것이 하늘상태를 이긴다
    (비 오는데 "구름많음"으로 보이면 안 된다). 이모지는 OS 마다 색·모양이 달라
    A안(딥블루 미니멀) 팔레트를 흐트러뜨려 SVG 로 바꿨다. */
function SkyGlyph({ sky, pty, size = 16 }: { sky: string | null; pty?: string | null; size?: number }) {
  if (pty && pty !== '없음') {
    if (pty === '눈') return <SnowIcon size={size} />;
    return <RainIcon size={size} />;
  }
  if (sky === '맑음') return <SunIcon size={size} />;
  if (sky === '흐림') return <CloudIcon size={size} />;
  return <SunCloudIcon size={size} />;
}

// ── ① 시간별 — 앞으로 6시간 ────────────────────────────────────────────────

export function HourlyForecastStrip({ items }: { items: HourlyForecast[] | null }) {
  if (!items || items.length === 0) return null;
  // 여섯 칸을 넘기면 한 칸이 좁아 숫자가 잘린다. 앞에서부터 자른다.
  const slots = items.slice(0, 6);

  // ⚠ 줄을 켤지는 칸마다가 아니라 스트립 전체로 정한다. 칸별로 정하면 비 오는 칸만
  // 한 줄 길어져 기온·풍속이 칸마다 다른 높이에 놓인다 — 가로로 읽을 수가 없다.
  // 강수량은 비가 올 때만이 아니라 항상 보여 준다. 줄이 통째로 사라지면 사용자는
  // "비 안 옴"이 아니라 "이 화면은 강수를 안 알려 준다"로 읽는다.
  // 기상청 RN1 은 강수 없음을 null 로 주므로 그때는 0mm 로 적는다.
  const showPrecip = true;
  const showWave = slots.some(h => h.waveHeight != null);
  // "1mm 미만" 은 좁은 기기에서 두 줄로 흐른다. 그 칸만 길어지면 옆 칸과 풍속 줄이
  // 어긋나므로, 한 칸이라도 흐를 수 있으면 여섯 칸 모두 두 줄 자리를 잡아 둔다.
  const precipTwoLine = slots.some(h => (shortPrecipitation(h.precipitation) ?? '').includes(' '));
  const note = ['기온', ...(showPrecip ? ['강수'] : []), '풍속', ...(showWave ? ['파고'] : [])].join(' · ');

  return (
    <div className={styles.block}>
      <div className={styles.blockHeader}>
        <span className={styles.blockTitle}>앞으로 {slots.length}시간</span>
        <span className={styles.blockNote}>{note}</span>
      </div>
      <div className={styles.hourRow}>
        {slots.map((h, i) => (
          <HourCell
            key={`${h.time}-${i}`}
            item={h}
            showPrecip={showPrecip}
            showWave={showWave}
            precipTwoLine={precipTwoLine}
          />
        ))}
      </div>
    </div>
  );
}

function HourCell({ item, showPrecip, showWave, precipTwoLine }: {
  item: HourlyForecast;
  showPrecip: boolean;
  showWave: boolean;
  precipTwoLine: boolean;
}) {
  const wind = item.windSpeed;
  const gusty = wind != null && wind >= WIND_CAUTION_MS;

  return (
    <div className={styles.hourCell}>
      <span className={styles.hourTime}>{hourLabel(item.time)}</span>
      <span className={styles.hourIcon}><SkyGlyph sky={item.sky} pty={item.precipitationType} /></span>
      <span className={styles.hourTemp}>
        {item.temperature != null ? `${item.temperature.toFixed(1)}°` : '—'}
      </span>
      {showPrecip && (
        <span className={[
          styles.hourSub,
          precipTwoLine ? styles.hourSubTall : '',
          item.precipitation ? styles.hourRain : '',
        ].filter(Boolean).join(' ')}>
          {shortPrecipitation(item.precipitation) ?? '0mm'}
        </span>
      )}
      {/* 12m/s 를 넘는 시각만 붉게. 언제 꺾이는지가 이것만으로 보인다. */}
      <span className={`${styles.hourWind} ${gusty ? styles.hourWindHot : ''}`}>
        {wind != null ? `${wind.toFixed(1)}m/s` : '—'}
      </span>
      {showWave && (
        <span className={styles.hourSub}>
          {item.waveHeight != null ? `${item.waveHeight.toFixed(1)}m` : '—'}
        </span>
      )}
    </div>
  );
}

/**
 * 강수량 원문을 좁은 칸(약 46px)에 들어가게 줄인다. 오늘–모레 카드는 원문을 그대로 쓴다.
 *
 * 기상청은 숫자로 줄 때도 있고 "1.0mm 미만" / "30.0~50.0mm" / "50.0mm 이상" 처럼
 * 범주형으로 줄 때도 있다. 어느 쪽이 오든 깨지지 않게 숫자만 뽑아 다시 조립한다.
 * 형식을 못 알아보면 원문을 그대로 돌려준다 — 임의로 지우는 것보다 넘치는 편이 낫다.
 */
export function shortPrecipitation(raw: string | null): string | null {
  if (raw == null) return null;
  const v = raw.trim();
  if (v === '') return null;

  const nums = (v.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter(Number.isFinite);
  if (nums.length === 0) return v;

  const n = (d: number) => String(Math.round(d));
  // 부등호(<, +) 대신 기상청이 쓰는 말을 그대로 쓴다. 칸이 좁아 두 줄로 흐를 수 있는데,
  // 스트립 전체가 같은 줄 수로 그려지므로 칸끼리 어긋나지 않는다.
  if (v.includes('미만')) return `${n(nums[0])}mm 미만`;
  if (v.includes('이상')) return `${n(nums[0])}mm 이상`;
  if (nums.length >= 2) return `${n(nums[0])}~${n(nums[1])}mm`;
  // 순수 숫자면 소수 한 자리까지 — "0.5mm" 처럼 적은 비가 0mm 로 뭉개지지 않게.
  return nums[0] < 10 ? `${nums[0].toFixed(1)}mm` : `${n(nums[0])}mm`;
}

/** "07:00" → "7시". 분이 0이 아니면 그대로 둔다(초단기예보는 항상 정시다). */
function hourLabel(time: string): string {
  const parts = time.split(':');
  if (parts.length !== 2) return time;
  const hour = Number(parts[0]);
  const minute = Number(parts[1]);
  if (!Number.isFinite(hour) || minute !== 0) return time;
  return `${hour}시`;
}

// ── ② 오늘 – 모레 ──────────────────────────────────────────────────────────

type DayGroup = { date: string; halves: DailyForecast[] };

/**
 * 기본은 펼침 — 앱과 같다. 접혀 있으면 헤더 한 줄만 남아 내일·모레 예보가 없는 것처럼 보였다.
 * 헤더를 누르면 접을 수 있고, 접힌 상태에서는 오른쪽에 결론 요약이 보인다.
 */
export function DailyForecastCard({ items }: { items: DailyForecast[] | null }) {
  const [open, setOpen] = useState(true);
  const [dayIndex, setDayIndex] = useState(0);

  const days = useMemo<DayGroup[]>(() => groupByDate(items), [items]);
  if (days.length === 0) return null;

  const safeIndex = dayIndex < days.length ? dayIndex : 0;
  const day = days[safeIndex];
  const tides = highTidesOf(day);

  return (
    <div className={styles.block}>
      <button
        type="button"
        className={styles.dailyToggle}
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span className={styles.blockTitle}>오늘 – 모레</span>
        <span className={styles.blockNote}>
          {open ? '단기예보 · 오전/오후' : summarize(days)}
        </span>
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden>⌄</span>
      </button>

      {open && (
        <>
          <div className={styles.dayTabs} role="tablist">
            {days.map((d, i) => (
              <button
                key={d.date}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                className={`${styles.dayTab} ${i === safeIndex ? styles.dayTabActive : ''}`}
                onClick={() => setDayIndex(i)}
              >
                <span className={styles.dayTabLabel}>{dayLabel(i, d.date)}</span>
                {/* 몇물은 아직 오늘치만 계산돼 대개 비어 있다. 빈 자리를 남기지 않고 감춘다. */}
                {d.halves[0]?.waterNumber && (
                  <span className={styles.dayTabSub}>{d.halves[0].waterNumber}</span>
                )}
              </button>
            ))}
          </div>

          <div className={styles.halfRow}>
            {day.halves.map(h => (
              <HalfCard key={`${h.date}-${h.afternoon}`} half={h} />
            ))}
          </div>

          <div className={styles.dayFooter}>
            {tides.length > 0 && <span className={styles.dayFooterTide}>만조 {tides.join(' · ')}</span>}
            <span className={styles.dayFooterNote}>수온은 예보 없음</span>
          </div>
        </>
      )}
    </div>
  );
}

function HalfCard({ half }: { half: DailyForecast }) {
  const index = half.fishingIndex;
  const bad = isBad(index);

  return (
    <div className={styles.halfCard}>
      <div className={styles.halfHead}>
        <span className={styles.halfWhen}>{half.afternoon ? '오후' : '오전'}</span>
        {index && (
          <span className={`${styles.halfBadge} ${bad ? styles.halfBadgeBad : ''}`}>{index}</span>
        )}
      </div>

      <div className={styles.halfMain}>
        <span className={styles.halfIcon}><SkyGlyph sky={half.sky} size={22} /></span>
        <div className={styles.halfMainText}>
          <span className={styles.halfTemp}>{tempLabel(half)}</span>
          <span className={styles.halfSky}>{skyLine(half)}</span>
        </div>
      </div>

      <div className={styles.halfDivider} />
      <MetricRow label="풍속" value={rangeLabel(half.windSpeedMin, half.windSpeedMax, 'm/s', 1)} hot={bad} />
      <MetricRow label="파고" value={rangeLabel(half.waveHeightMin, half.waveHeightMax, 'm', 1)} hot={bad} />
      {/* 강수량은 기상청 원문 그대로. "1.0mm 미만" 을 숫자로 바꾸면 없는 정밀도가 생긴다. */}
      <MetricRow label="강수" value={half.precipitation ?? '없음'} hot={false} />
    </div>
  );
}

function MetricRow({ label, value, hot }: { label: string; value: string; hot: boolean }) {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${hot ? styles.metricValueHot : ''}`}>{value}</span>
    </div>
  );
}

// ── 헬퍼 ───────────────────────────────────────────────────────────────────

/** 날짜별로 묶는다. 서버가 (날짜 × 오전/오후) 로 최대 6칸을 보낸다. */
function groupByDate(items: DailyForecast[] | null): DayGroup[] {
  if (!items || items.length === 0) return [];
  const map = new Map<string, DailyForecast[]>();
  for (const d of items) {
    const list = map.get(d.date);
    if (list) list.push(d);
    else map.set(d.date, [d]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, halves]) => ({
      date,
      halves: [...halves].sort((a, b) => Number(a.afternoon) - Number(b.afternoon)),
    }));
}

function dayLabel(index: number, date: string): string {
  const prefix = ['오늘', '내일', '모레'][index] ?? '';
  const parts = date.split('-');
  const md = parts.length === 3 ? `${Number(parts[1])}/${Number(parts[2])}` : date;
  return prefix ? `${prefix} ${md}` : md;
}

/**
 * 접힌 상태의 요약 — "내일 나쁨 · 모레 좋음".
 * 오늘은 이미 위 계기판이 답하고 있으므로 내일부터 센다.
 */
function summarize(days: DayGroup[]): string {
  const parts: string[] = [];
  for (let i = 1; i < days.length && i < 3; i++) {
    const index = days[i].halves.map(h => h.fishingIndex).find(v => v && v.length > 0);
    if (!index) continue;
    parts.push(`${dayLabel(i, days[i].date).split(' ')[0]} ${index}`);
  }
  return parts.length > 0 ? parts.join(' · ') : '오전/오후';
}

function highTidesOf(day: DayGroup): string[] {
  return [...new Set(day.halves.flatMap(h => h.highTides ?? []))].sort();
}

function isBad(index: string | null): boolean {
  return !!index && (index.includes('나쁨') || index.includes('낮음'));
}

function rangeLabel(lo: number | null, hi: number | null, unit: string, digits: number): string {
  if (lo == null && hi == null) return '-';
  const a = (lo ?? hi) as number;
  const b = (hi ?? lo) as number;
  return a === b ? `${a.toFixed(digits)}${unit}` : `${a.toFixed(digits)} – ${b.toFixed(digits)}${unit}`;
}

function tempLabel(half: DailyForecast): string {
  if (half.tempMin == null && half.tempMax == null) return '-';
  const lo = Math.round((half.tempMin ?? half.tempMax) as number);
  const hi = Math.round((half.tempMax ?? half.tempMin) as number);
  return lo === hi ? `${lo}°` : `${lo}° / ${hi}°`;
}

function skyLine(half: DailyForecast): string {
  const sky = half.sky ?? '-';
  return half.precipitationProbability == null
    ? sky
    : `${sky} · 강수 ${half.precipitationProbability}%`;
}
