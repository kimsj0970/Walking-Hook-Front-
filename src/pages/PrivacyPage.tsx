import styles from './PrivacyPage.module.css';
import Header from '../components/common/Header';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>개인정보처리방침</h1>
          <p className={styles.updated}>시행일: 2026년 6월 8일</p>

          <p className={styles.intro}>
            Walking Hook(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」을 준수합니다.
            본 방침은 서비스가 수집하는 개인정보의 항목, 이용 목적, 보유 기간 및 이용자의 권리를 안내합니다.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. 수집하는 개인정보 항목</h2>
            <p>서비스는 카카오 소셜 로그인을 통해 다음 정보를 수집합니다.</p>
            <ul className={styles.list}>
              <li>이름 (카카오 계정 제공)</li>
              <li>이메일 주소 (카카오 계정 제공, 선택)</li>
              <li>카카오 고유 식별자 (provider ID)</li>
              <li>닉네임 (서비스 내 직접 입력)</li>
            </ul>
            <p className={styles.sub}>자동 수집 항목: 접속 일시, 서비스 이용 기록</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. 개인정보 수집 및 이용 목적</h2>
            <ul className={styles.list}>
              <li>회원 식별 및 로그인 처리</li>
              <li>낚시 조황 분석 서비스 제공</li>
              <li>고객 문의 응대</li>
              <li>마케팅 수신 동의 시: 이벤트·신기능 안내 (선택 동의자 한정)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. 개인정보 보유 및 이용 기간</h2>
            <ul className={styles.list}>
              <li>회원 탈퇴 시까지 보유 후 즉시 파기</li>
              <li>단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 별도 보관
                <ul className={styles.subList}>
                  <li>소비자 보호에 관한 기록: 5년 (전자상거래법)</li>
                  <li>통신비밀보호법에 따른 접속 기록: 3개월</li>
                </ul>
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. 개인정보 제3자 제공</h2>
            <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 법령에 의한 요청이 있는 경우에만 예외적으로 제공할 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. 개인정보 처리 위탁</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>수탁업체</th>
                  <th>위탁 업무</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Amazon Web Services (AWS)</td>
                  <td>서버 인프라 운영 및 데이터 보관</td>
                </tr>
                <tr>
                  <td>카카오 (Kakao Corp.)</td>
                  <td>소셜 로그인 인증 처리</td>
                </tr>
                <tr>
                  <td>OpenAI</td>
                  <td>AI 기반 조황 분석 텍스트 생성</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. 이용자의 권리</h2>
            <p>이용자는 언제든지 아래 권리를 행사할 수 있습니다.</p>
            <ul className={styles.list}>
              <li>개인정보 열람 요청</li>
              <li>개인정보 수정·삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>동의 철회 (마케팅 수신 동의 포함)</li>
            </ul>
            <p className={styles.sub}>권리 행사는 아래 개인정보보호책임자에게 이메일로 요청하실 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. 개인정보의 안전성 확보 조치</h2>
            <ul className={styles.list}>
              <li>HTTPS를 통한 전송 구간 암호화</li>
              <li>접근 권한 최소화 및 관리</li>
              <li>접속 기록 보관 및 위·변조 방지</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. 개인정보보호책임자</h2>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td>이름</td>
                  <td>김승중</td>
                </tr>
                <tr>
                  <td>이메일</td>
                  <td>kimsj0970@gmail.com</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.sub}>개인정보 침해 관련 신고는 개인정보보호위원회(privacy.go.kr) 또는 한국인터넷진흥원(118)에 문의하실 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. 방침 변경 안내</h2>
            <p>본 개인정보처리방침이 변경될 경우 변경 사항을 서비스 내 공지사항을 통해 사전 안내합니다.</p>
          </section>
        </div>
      </main>
    </>
  );
}
