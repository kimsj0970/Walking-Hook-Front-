import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import {
  FISH_REGULATION_DISCLAIMER,
  FISH_REGULATION_PENALTY_KRW,
  FISH_REGULATION_REGIONS,
  LENGTH_BASIS_HINTS,
  LENGTH_BASIS_LABELS,
  isClosedInMonth,
  listedSpecies,
  regulationKey,
  regulationName,
  seasonLabel,
  seasonsFor,
  type ClosedSeason,
  type FishRegulation,
} from '../data/fishRegulations';
import { useFishRegulations } from '../hooks/useFishRegulations';
import {
  hasEcology,
  profileOf,
  speciesImage,
  type FishProfile,
} from '../data/fishProfiles';
import {
  SPECIES_GROUP_LABELS,
  type SpeciesGroup,
} from '../api/fishSpecies';
import styles from './FishRegulationPage.module.css';

/**
 * "가져가도 되나요?" — 어종별 금지체장·금어기.
 *
 * 앱의 `features/regulation` 화면과 같은 데이터(`data/fishRegulations.ts`)를 쓴다.
 * 로그인 없이 열리고 정적 데이터만 쓰므로 API 실패로 빈 화면이 되지 않는다 —
 * 검색엔진·광고 심사가 보는 화면이라 이 점이 중요하다.
 */

/** 어종이 어느 그룹인지. `FISH_SPECIES_LABELS` 순서와 무관하게 판정한다. */
const GROUP_OF: Partial<Record<string, SpeciesGroup>> = {
  SAMCHI: 'MIGRATORY', BANGEO: 'MIGRATORY', MACKEREL: 'MIGRATORY',
  HAIRTAIL: 'MIGRATORY', SANDFISH: 'MIGRATORY',
  WEBFOOT_OCTOPUS: 'CEPHALOPOD', COMMON_OCTOPUS: 'CEPHALOPOD',
  LONGARM_OCTOPUS: 'CEPHALOPOD',
};

const GROUP_ORDER: SpeciesGroup[] = ['CEPHALOPOD', 'RESIDENT', 'MIGRATORY'];

function groupOf(species: string): SpeciesGroup {
  return GROUP_OF[species] ?? 'RESIDENT';
}

function summaryOf(reg: FishRegulation): string {
  const parts: string[] = [];
  if (reg.minLengthCm != null) {
    parts.push(`${LENGTH_BASIS_LABELS[reg.lengthBasis!]} ${reg.minLengthCm}cm 이하 금지`);
  }
  if (reg.minWeightG != null) parts.push(`${reg.minWeightG}g 이하 금지`);
  const seasons = reg.closedSeasons ?? [];
  if (seasons.length === 0) {
    parts.push('금어기 없음');
  } else {
    const nationwide = seasons.filter((s) => !s.region && !s.isDefault);
    parts.push(nationwide.length === 1 ? `금어기 ${seasonLabel(nationwide[0])}` : '금어기 지역별');
  }
  return parts.join(' · ');
}

export default function FishRegulationPage() {
  const [onlyClosed, setOnlyClosed] = useState(false);
  const [openSpecies, setOpenSpecies] = useState<string | null>(null);
  const [region, setRegion] = useState<string>('');

  const { effectiveDate, version } = useFishRegulations();
  const now = useMemo(() => new Date(), []);
  // version — 서버 규제가 도착해 데이터가 교체되면 목록을 다시 만든다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const all = useMemo(() => listedSpecies(), [version]);
  // 달 단위로 센다. 오늘만 보면 월말에 아무것도 안 뜨다가 다음 달 1일에
  // 갑자기 뜨는 화면이 되어 미리 알려주는 구실을 못 한다.
  const closedThisMonth = useMemo(
    () => all.filter((r) => isClosedInMonth(r, now)),
    [all, now],
  );
  const shown = onlyClosed ? closedThisMonth : all;

  const grouped = useMemo(() => {
    const map = new Map<SpeciesGroup, FishRegulation[]>();
    for (const r of shown) {
      const g = groupOf(r.species);
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(r);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ac = isClosedInMonth(a, now) ? 0 : 1;
        const bc = isClosedInMonth(b, now) ? 0 : 1;
        if (ac !== bc) return ac - bc;
        return regulationName(a).localeCompare(regulationName(b), 'ko');
      });
    }
    return map;
  }, [shown, now]);

  return (
    <div className={styles.page}>
      <Header />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>가져가도 되나요?</h1>
          <p className={styles.desc}>
            어종별 금지체장과 금어기입니다.
            <br />
            방파제·갯바위에서 걸어 들어가는 낚시인 기준으로 정리했습니다.
          </p>
        </section>

        <div className={styles.penalty}>
          <strong>어기면 과태료 {FISH_REGULATION_PENALTY_KRW / 10000}만원</strong>
          <span>낚시 관리 및 육성법 제5조·제7조</span>
        </div>

        <div className={styles.filters}>
          <button
            type="button"
            className={!onlyClosed ? styles.chipOn : styles.chip}
            onClick={() => setOnlyClosed(false)}
          >
            전체
          </button>
          <button
            type="button"
            className={onlyClosed ? styles.chipOn : styles.chip}
            onClick={() => setOnlyClosed(true)}
          >
            {closedThisMonth.length > 0
              ? `이번 달 금어기 ${closedThisMonth.length}`
              : '이번 달 금어기'}
          </button>
          {/* 앞의 둘은 목록을 거르는 필터, 이건 다른 화면으로 나가는 버튼이다.
              성격이 달라 테두리 + 꺾쇠로 생김새를 갈라 둔다. */}
          <Link className={styles.compareLink} to="/compare">
            헷갈리는 어종 <span aria-hidden>›</span>
          </Link>
        </div>

        {shown.length === 0 ? (
          <p className={styles.empty}>
이번 달은 금어기인 어종이 없습니다. 크기 제한은 그대로 적용됩니다.
          </p>
        ) : (
          GROUP_ORDER.filter((g) => grouped.get(g)?.length).map((g) => (
            <section key={g} className={styles.group}>
              <h2 className={styles.groupLabel}>
                {SPECIES_GROUP_LABELS[g]}
                <span>{grouped.get(g)!.length}</span>
              </h2>
              <ul className={styles.list}>
                {grouped.get(g)!.map((reg) => {
                  const key = regulationKey(reg);
                  const open = openSpecies === key;
                  const closed = isClosedInMonth(reg, now, region || undefined);
                  return (
                    <li key={key} className={styles.item}>
                      <button
                        type="button"
                        className={styles.row}
                        aria-expanded={open}
                        onClick={() => setOpenSpecies(open ? null : key)}
                      >
                        <SpeciesThumb regKey={key} />
                        <span className={styles.rowMain}>
                          <span className={styles.rowName}>
                            {regulationName(reg)}
                            {closed && <em className={styles.badgeClosed}>이번 달 금어기</em>}
                            {!closed && reg.caution && (
                              <em className={styles.badgeCaution}>닮은 종 주의</em>
                            )}
                          </span>
                          <span className={styles.rowSummary}>{summaryOf(reg)}</span>
                        </span>
                        <span className={open ? styles.arrowOpen : styles.arrow} aria-hidden>
                          ›
                        </span>
                      </button>

                      {open && (
                        <Detail
                          reg={reg}
                          now={now}
                          region={region}
                          onRegionChange={setRegion}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <p className={styles.footer}>
          {FISH_REGULATION_DISCLAIMER}
          <br />
          수산자원관리법 시행령 별표 1(금어기) · 별표 2(금지체장·체중) · 기준일{' '}
          {effectiveDate}
        </p>
      </main>
    </div>
  );
}

function Detail({
  reg, now, region, onRegionChange,
}: {
  reg: FishRegulation;
  now: Date;
  region: string;
  onRegionChange: (v: string) => void;
}) {
  const hasRegional = (reg.closedSeasons ?? []).some((s) => s.region);
  const seasons = seasonsFor(reg, region || undefined);
  const profile = profileOf(regulationKey(reg));

  return (
    <div className={styles.detail}>
      {profile && <Hero reg={reg} profile={profile} />}
      {reg.minLengthCm != null && (
        <div className={styles.metric}>
          <span className={styles.metricLabel}>
            금지체장 ({LENGTH_BASIS_LABELS[reg.lengthBasis!]})
          </span>
          <strong className={styles.metricValue}>{reg.minLengthCm}cm 이하는 방생</strong>
          <span className={styles.metricHint}>{LENGTH_BASIS_HINTS[reg.lengthBasis!]}</span>
        </div>
      )}

      {reg.minWeightG != null && (
        <div className={styles.metric}>
          <span className={styles.metricLabel}>금지체중</span>
          <strong className={styles.metricValue}>{reg.minWeightG}g 이하는 방생</strong>
        </div>
      )}

      {seasons.length > 0 && (
        <div className={styles.seasons}>
          <div className={styles.seasonHead}>
            <span className={styles.metricLabel}>금어기</span>
            {hasRegional && (
              <select
                className={styles.select}
                value={region}
                onChange={(e) => onRegionChange(e.target.value)}
                aria-label="지역 선택"
              >
                <option value="">지역 선택 안 함 (기본값)</option>
                {FISH_REGULATION_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          </div>
          {seasons.map((s, i) => (
            <SeasonRow key={i} season={s} now={now} />
          ))}
        </div>
      )}

      {profile && profile.traits.length > 0 && <Traits profile={profile} />}

      {/* 닮은 종 경고는 한 군데서만. 도감에 있으면 위(형질)에 이미 붙는다. */}
      {reg.caution && !profile?.lookalike && (
        <p className={styles.caution}>
          <strong>닮은 종과 헷갈리면 위법이 됩니다</strong>
          {reg.caution}
        </p>
      )}

      {profile && hasEcology(profile) && <Ecology profile={profile} />}

      {reg.note && <p className={styles.note}>{reg.note}</p>}

      {profile && profile.sources.length > 0 && (
        <p className={styles.profileSource}>
          생김새·생태 — {profile.sources.join(' · ')}
        </p>
      )}
    </div>
  );
}

/**
 * 목록 줄 왼쪽의 작은 그림.
 *
 * 그림 파일이 아직 없을 수 있다. `onError` 로 자리를 통째로 감춰서
 * 줄마다 깨진 이미지 아이콘이 남지 않게 한다 — 파일만 올리면 그대로 살아난다.
 */
function SpeciesThumb({ regKey }: { regKey: string }) {
  const [ok, setOk] = useState(true);
  if (!ok || !profileOf(regKey)) return null;
  return (
    <img
      className={styles.thumb}
      src={speciesImage(regKey)}
      alt=""
      loading="lazy"
      onError={() => setOk(false)}
    />
  );
}

function Hero({ reg, profile }: { reg: FishRegulation; profile: FishProfile }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={styles.hero}>
      {ok && (
        <img
          className={styles.heroImg}
          src={speciesImage(profile.key)}
          alt={`${regulationName(reg)} 생김새`}
          onError={() => setOk(false)}
        />
      )}
      <p className={styles.heroSci}>
        {[profile.nameNote, profile.scientificName, profile.family]
          .filter(Boolean).join(' · ')}
      </p>
    </div>
  );
}

function Traits({ profile }: { profile: FishProfile }) {
  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>생김새로 가리기</h3>
      <ol className={styles.traits}>
        {profile.traits.map((t, i) => (
          <li key={t.head}>
            <span className={styles.traitNo}>{i + 1}</span>
            <span>
              <b>{t.head}</b>
              {t.detail && <em>{t.detail}</em>}
            </span>
          </li>
        ))}
      </ol>
      {profile.lookalike && (
        <p className={styles.lookalike}>{profile.lookalike}</p>
      )}
    </section>
  );
}

function Ecology({ profile }: { profile: FishProfile }) {
  const rows: [string, string | undefined][] = [
    ['어디에 사나', profile.habitat],
    ['뭘 먹나', profile.food],
    ['언제 붙나', profile.season],
    ['알아두면', profile.tip],
  ];
  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>어떤 물고기인가</h3>
      <dl className={styles.eco}>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SeasonRow({ season, now }: { season: ClosedSeason; now: Date }) {
  const crosses =
    season.endMonth < season.startMonth
    || (season.endMonth === season.startMonth && season.endDay < season.startDay);

  const inMonth = (m: number) =>
    crosses
      ? m >= season.startMonth || m <= season.endMonth
      : m >= season.startMonth && m <= season.endMonth;

  return (
    <div className={styles.season}>
      <div className={styles.seasonTop}>
        <span>{season.region ?? (season.isDefault ? '기본값' : '전국')}</span>
        <strong>{seasonLabel(season)}</strong>
      </div>
      <div className={styles.months} aria-hidden>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <span
            key={m}
            className={[
              styles.month,
              inMonth(m) ? styles.monthOn : '',
              m === now.getMonth() + 1 ? styles.monthNow : '',
            ].filter(Boolean).join(' ')}
          >
            {m}
          </span>
        ))}
      </div>
      {crosses && (
        <p className={styles.seasonNote}>
          양끝이 칠해지면 해를 넘긴 것입니다. 정확한 날짜는 위 숫자를 보세요.
        </p>
      )}
      {season.areaNote && <p className={styles.seasonNote}>{season.areaNote}</p>}
      {season.note && <p className={styles.seasonNote}>{season.note}</p>}
      {season.noticeNo && <p className={styles.seasonSource}>{season.noticeNo}</p>}
    </div>
  );
}
