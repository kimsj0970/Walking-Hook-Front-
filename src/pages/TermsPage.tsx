import styles from './PrivacyPage.module.css';
import Header from '../components/common/Header';

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>이용약관</h1>
          <p className={styles.updated}>시행일: 2026년 6월 8일</p>

          <p className={styles.intro}>
            본 약관은 Walking Hook(이하 "서비스")이 제공하는 낚시 조황 예측 및 커뮤니티 서비스의 이용 조건과
            절차, 이용자와 서비스 간의 권리·의무 및 책임 사항을 규정합니다.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제1조 (목적)</h2>
            <p>
              본 약관은 Walking Hook 서비스의 이용과 관련하여 서비스와 이용자 간의 권리·의무 및
              책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제2조 (약관의 효력 및 변경)</h2>
            <ul className={styles.list}>
              <li>본 약관은 서비스 내 공지함으로써 효력이 발생합니다.</li>
              <li>서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 사전 안내합니다.</li>
              <li>이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제3조 (이용 계약 체결)</h2>
            <ul className={styles.list}>
              <li>이용 계약은 이용자가 본 약관에 동의하고 서비스에 가입함으로써 체결됩니다.</li>
              <li>만 14세 미만인 자는 서비스에 가입할 수 없습니다.</li>
              <li>서비스는 다음 각 호에 해당하는 경우 이용 신청을 거부할 수 있습니다.
                <ul className={styles.subList}>
                  <li>타인의 명의를 사용한 경우</li>
                  <li>허위 정보를 제공한 경우</li>
                  <li>이전에 서비스 이용 자격을 상실한 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제4조 (이용자의 의무)</h2>
            <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
            <ul className={styles.list}>
              <li>타인의 개인정보 도용 또는 허위 정보 등록</li>
              <li>서비스 운영을 방해하거나 서버에 과부하를 주는 행위</li>
              <li>타인을 비방·모욕하거나 명예를 훼손하는 게시물 작성</li>
              <li>음란물, 불법 콘텐츠 게시</li>
              <li>서비스의 지식재산권을 무단 복제·배포하는 행위</li>
              <li>기타 관계 법령에 위반되는 행위</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제5조 (서비스 제공 및 변경)</h2>
            <ul className={styles.list}>
              <li>서비스는 낚시 조황 예측, 커뮤니티 게시판, 지도 등의 기능을 제공합니다.</li>
              <li>서비스는 운영상·기술상 필요에 따라 제공하는 서비스를 변경할 수 있습니다.</li>
              <li>조황 예측 정보는 기상·해양 데이터를 기반으로 한 참고 정보이며, 실제 낚시 결과를 보장하지 않습니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제6조 (게시물 및 저작권)</h2>
            <ul className={styles.list}>
              <li>이용자가 작성한 게시물의 저작권은 해당 이용자에게 있습니다.</li>
              <li>이용자는 게시물을 서비스에 게시함으로써 서비스가 해당 콘텐츠를 서비스 운영 목적으로 이용할 수 있도록 허락합니다.</li>
              <li>서비스는 이용자가 작성한 게시물이 타인의 권리를 침해하는 경우 사전 통보 없이 삭제할 수 있습니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제7조 (서비스 중단)</h2>
            <ul className={styles.list}>
              <li>서비스는 시스템 점검, 천재지변, 외부 API 장애 등 불가피한 사정이 있을 경우 서비스 제공을 일시 중단할 수 있습니다.</li>
              <li>서비스 중단으로 인한 손해에 대해 서비스는 고의 또는 중과실이 없는 한 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제8조 (면책 조항)</h2>
            <ul className={styles.list}>
              <li>서비스가 제공하는 조황 예측 정보는 참고용이며, 이를 근거로 한 낚시 활동의 결과에 대해 법적 책임을 지지 않습니다.</li>
              <li>이용자 간 분쟁에 대해 서비스는 개입 의무가 없으며, 이로 인한 손해에 책임을 지지 않습니다.</li>
              <li>이용자의 귀책 사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제9조 (분쟁 해결)</h2>
            <ul className={styles.list}>
              <li>서비스 이용과 관련한 분쟁은 서비스 운영자와 협의를 통해 우선 해결합니다.</li>
              <li>협의가 이루어지지 않을 경우 관련 법령에 따른 관할 법원에 소를 제기할 수 있습니다.</li>
              <li>본 약관에 명시되지 않은 사항은 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관계 법령에 따릅니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>제10조 (운영자 정보)</h2>
            <table className={styles.table}>
              <tbody>
                <tr><td>서비스명</td><td>Walking Hook</td></tr>
                <tr><td>운영자</td><td>김승중</td></tr>
                <tr><td>이메일</td><td>kimsj0970@gmail.com</td></tr>
              </tbody>
            </table>
          </section>
        </div>
      </main>
    </>
  );
}
