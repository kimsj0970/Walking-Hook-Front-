import styles from './PrivacyPage.module.css';

/**
 * 공공데이터 출처 고지.
 *
 * 쓰고 있는 공공데이터는 전부 공공누리 제1유형(출처표시) 또는 "이용허락범위 제한 없음"이라
 * 상업적 이용이 허용된다. 다만 제1유형은 출처 표시가 조건이고, 온라인 이용 시에는
 * 출처 사이트로 가는 하이퍼링크까지 요구한다. Footer 의 한 줄 요약만으로는 부족해
 * 이 페이지를 따로 둔다. 앱의 OpenDataPage 와 같은 내용이다.
 *
 * API 를 새로 붙이면 아래 SOURCES 도 같이 갱신할 것.
 */

const SOURCES = [
  {
    agency: '기상청',
    items: '단기예보 · 초단기예보 · 초단기실황 · 자동기상관측(AWS) · 해양기상관측',
    url: 'https://apihub.kma.go.kr',
  },
  {
    agency: '국립해양조사원',
    items: '조석예보 · 바다낚시지수 · 해수욕장예보 · 실시간 해양관측 · 해무 CCTV',
    url: 'https://www.khoa.go.kr',
  },
  {
    agency: '국립수산과학원',
    items: '연안정지관측 수온',
    url: 'https://www.nifs.go.kr',
  },
  {
    agency: '국립해양측위정보원',
    items: '해양기상정보',
    url: 'https://www.nmpnt.go.kr',
  },
  {
    agency: '한국천문연구원',
    items: '음양력 정보',
    url: 'https://www.kasi.re.kr',
  },
];

export default function OpenDataPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>공공데이터 출처</h1>
        <p className={styles.updated}>최종 확인: 2026년 9월 7일</p>

        <p className={styles.intro}>
          Walking Hook 은 아래 기관이 개방한 공공데이터를 이용합니다. 해당 데이터는 공공누리
          제1유형(출처표시) 또는 이용허락범위 제한 없음으로 개방되어 있으며, 본 서비스는 그
          이용조건에 따라 출처를 표시합니다.
        </p>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>데이터 제공 기관</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>기관</th>
                <th>이용 데이터</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((s) => (
                <tr key={s.agency}>
                  <td>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.agency}
                    </a>
                  </td>
                  <td>{s.items}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>이용 조건</h2>
          <ul className={styles.list}>
            <li>공공누리 제1유형은 출처를 표시하면 상업적 이용과 변형이 가능합니다.</li>
            <li>본 서비스는 원본 데이터를 그대로 재배포하지 않으며, 화면 표시를 위해 가공하여 사용합니다.</li>
            <li>각 기관은 본 서비스를 후원하거나 본 서비스와 특수한 관계에 있지 않습니다.</li>
          </ul>
          <p className={styles.sub}>
            <a href="https://www.kogl.or.kr" target="_blank" rel="noopener noreferrer">
              공공누리 이용조건 안내
            </a>
            {' · '}
            <a href="https://www.data.go.kr" target="_blank" rel="noopener noreferrer">
              공공데이터포털
            </a>
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>정보 이용 시 유의사항</h2>
          <ul className={styles.list}>
            <li>기상·해양 정보는 참고용이며 실제와 다를 수 있습니다.</li>
            <li>
              본 서비스가 표시하는 출조 판단과 조황 점수는 공공데이터를 참고해 산출한 자체
              지표이며, 기상청이 발표하는 기상예보나 기상특보가 아닙니다.
            </li>
            <li>출조 전 반드시 기상청 예보와 기상특보를 직접 확인하시기 바랍니다.</li>
            <li>관측값은 관측소 사정에 따라 결측되거나 지연될 수 있습니다.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
