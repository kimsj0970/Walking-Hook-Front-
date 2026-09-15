import { Fragment } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/common/Header';
import { SPECIES_COMPARES, compareOf, type SpeciesCompare } from '../data/speciesCompares';
import styles from './SpeciesComparePage.module.css';

/**
 * 「헷갈리는 어종」 — 목록과 비교표.
 *
 * 닮은 종끼리 **규제가 다르다**는 게 이 화면이 있는 이유다. 볼락 15cm / 우럭 23cm,
 * 말쥐치만 18cm, 쭈꾸미만 금어기 — 종을 잘못 알면 그대로 위법이 된다.
 *
 * 표는 세로가 형질, 가로가 종이다. 종을 세로로 늘어놓으면 "이 형질에서 둘이
 * 어떻게 다른가"를 눈으로 못 비교한다 — 같은 줄에 나란히 놓아야 갈린다.
 * 앱 `features/regulation/species_compare_page.dart` 와 같은 데이터를 쓴다.
 */

export function SpeciesCompareListPage() {
  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>헷갈리는 어종</h1>
          <p className={styles.desc}>
            닮은 종끼리 규제가 다릅니다. 종을 잘못 알면 그대로 위법이 됩니다.
            <br />
            아래 한 줄만 봐도 대부분 그 자리에서 갈립니다.
          </p>
        </section>

        <ul className={styles.list}>
          {SPECIES_COMPARES.map((c) => (
            <li key={c.id}>
              <Link className={styles.tile} to={`/compare/${c.id}`}>
                <span className={styles.tileMain}>
                  <strong>{c.title}</strong>
                  <em>{c.decisive}</em>
                </span>
                <span className={styles.arrow} aria-hidden>›</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

export default function SpeciesComparePage() {
  const { id } = useParams<{ id: string }>();
  const c = id ? compareOf(id) : undefined;

  if (!c) return <SpeciesCompareListPage />;

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>{c.title}</h1>
        </section>

        <Decisive compare={c} />
        <CompareTable compare={c} />

        {c.note && <p className={styles.note}>{c.note}</p>}

        <p className={styles.footer}>
          근거 — {c.sources.join(' · ')}
          <br />
          규정은 「가져가도 되나요?」의 어종별 화면에서 확인하세요.
        </p>
      </main>
    </div>
  );
}

/** 맨 위에 판별법 한 줄. 이것만 읽고 나가는 사람이 제일 많다. */
function Decisive({ compare }: { compare: SpeciesCompare }) {
  return (
    <section className={styles.decisive}>
      <span className={styles.decisiveLabel}>이걸로 가른다</span>
      <strong className={styles.decisiveText}>{compare.decisive}</strong>
      {compare.why && <p className={styles.why}>{compare.why}</p>}
    </section>
  );
}

function CompareTable({ compare }: { compare: SpeciesCompare }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {compare.entries.map((e) => (
              <th key={e.name}>
                {e.regKey
                  ? <Link to={`/regulations/${e.regKey}`}>{e.name} <span aria-hidden>›</span></Link>
                  : <span className={styles.plain}>{e.name}</span>}
                {e.rule && <em>{e.rule}</em>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compare.rows.map((r) => (
            // 항목 이름은 한 줄을 통째로 쓰고, 그 아래에 종별 값이 나란히 온다.
            // 좁은 폭에서 이름과 값을 한 줄에 넣으면 값 칸이 두 글자로 찌그러진다.
            <Fragment key={r.label}>
              <tr className={r.decisive ? styles.decisiveRow : undefined}>
                <th scope="rowgroup" colSpan={compare.entries.length} className={styles.rowLabel}>
                  {r.decisive && <i aria-hidden>★</i>}
                  {r.label}
                </th>
              </tr>
              <tr className={r.decisive ? styles.decisiveRow : undefined}>
                {r.values.map((v, j) => (
                  <td key={compare.entries[j].name} className={styles.value}>{v}</td>
                ))}
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
