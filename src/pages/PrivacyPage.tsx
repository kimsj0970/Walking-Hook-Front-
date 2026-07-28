import styles from './PrivacyPage.module.css';
import Header from '../components/common/Header';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>개인정보처리방침</h1>
          <p className={styles.updated}>시행일: 2026년 7월 29일 (개정일: 2026년 7월 27일)</p>

          <p className={styles.intro}>
            Walking Hook(이하 "서비스")은 이용자의 개인정보를 소중히 여기며, 「개인정보 보호법」을 준수합니다.
            본 방침은 서비스가 수집하는 개인정보의 항목, 이용 목적, 보유 기간 및 이용자의 권리를 안내합니다.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. 수집하는 개인정보 항목</h2>
            <p>서비스는 소셜 로그인(카카오·네이버)을 통해 다음 정보를 수집합니다.</p>
            <ul className={styles.list}>
              <li>카카오 로그인 시
                <ul className={styles.subList}>
                  <li>카카오 고유 식별자 (provider ID)</li>
                  <li>닉네임 (카카오 프로필 제공)</li>
                  <li>이메일 주소 (카카오 계정 제공, 선택)</li>
                </ul>
              </li>
              <li>네이버 로그인 시
                <ul className={styles.subList}>
                  <li>네이버 고유 식별자 (provider ID)</li>
                  <li>이름 (네이버 계정 제공)</li>
                  <li>이메일 주소 (네이버 계정 제공, 선택)</li>
                  <li>성별, 연령대, 생년월일 및 출생연도 (네이버 계정 제공, 선택)</li>
                </ul>
              </li>
              <li>닉네임 (서비스 내 직접 입력)</li>
            </ul>
            <p>또한 서비스 이용 과정에서 아래 정보가 자동으로 생성·수집됩니다.</p>
            <ul className={styles.list}>
              <li>접속 일시, 접속 IP 주소</li>
              <li>서비스 이용 기록 (화면·페이지 조회 기록, 기능 이용 기록)</li>
              <li>기기 정보 (기기 모델, 운영체제 및 버전, 브라우저 종류, 앱 버전, 언어·국가 설정)</li>
              <li>쿠키 및 분석용 식별자 (웹: 쿠키 기반 클라이언트 식별자, 앱: 앱 인스턴스 식별자)</li>
              <li>광고 식별자 (웹: 광고 쿠키, 앱: Android 광고 ID(AAID) 또는 iOS 광고 식별자(IDFA))</li>
              <li>로그인한 회원의 경우 회원 식별자 (웹·앱 이용 기록을 동일 이용자로 집계하기 위한 용도)</li>
            </ul>
            <p className={styles.sub}>자동 수집 항목은 Google Analytics 및 Google 광고 서비스를 통해 수집되며, 자세한 내용과 거부 방법은 아래 5항을 참고하시기 바랍니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. 개인정보 수집 및 이용 목적</h2>
            <ul className={styles.list}>
              <li>회원 식별 및 로그인 처리</li>
              <li>낚시 조황 분석 서비스 제공</li>
              <li>고객 문의 응대</li>
              <li>서비스 이용 현황 통계 분석 및 서비스 개선</li>
              <li>서비스 내 광고 게재 및 광고 성과 측정</li>
              <li>알림 수신 동의 시: 댓글·답글 등 푸시 알림 발송</li>
              <li>마케팅 수신 동의 시: 이벤트·신기능 안내 (선택 동의자 한정)</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. 개인정보 보유 및 이용 기간</h2>
            <ul className={styles.list}>
              <li>회원 탈퇴 시까지 보유하며, 탈퇴 후 지체 없이(5일 이내) 파기</li>
              <li>단, 관련 법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 별도 보관
                <ul className={styles.subList}>
                  <li>소비자 보호에 관한 기록: 5년 (전자상거래법)</li>
                  <li>통신비밀보호법에 따른 접속 기록: 3개월</li>
                </ul>
              </li>
              <li>서비스 이용 통계 분석 정보(Google Analytics): 수집일로부터 최대 14개월</li>
              <li>광고 게재 관련 정보: Google LLC의 광고 데이터 보관 정책에 따르며, 이용자가 광고 식별자를 삭제·재설정하면 기존 기록과의 연결이 해제됩니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. 개인정보 제3자 제공</h2>
            <p>서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않으며, 아래의 경우에 한하여 예외적으로 제공합니다.</p>
            <ul className={styles.list}>
              <li>Google LLC (Google AdSense · Google AdMob)
                <ul className={styles.subList}>
                  <li>제공 항목: 광고 식별자(광고 쿠키, Android 광고 ID, iOS 광고 식별자), 기기·브라우저 정보, IP 주소에 기반한 대략적 위치 정보(국가·지역 수준), 광고 노출 및 클릭 기록</li>
                  <li>제공 목적: 서비스 내 광고 게재, 광고 성과 측정 및 부정 클릭 방지</li>
                  <li>보유·이용 기간: Google LLC의 광고 데이터 보관 정책에 따름</li>
                </ul>
              </li>
            </ul>
            <p className={styles.sub}>
              Google LLC는 제공받은 정보를 자체 기준에 따라 맞춤형 광고 목적으로 이용할 수 있습니다. 처리 내용은 Google
              개인정보처리방침(policies.google.com/privacy) 및 Google 광고 관련 정책(policies.google.com/technologies/ads)에서
              확인하실 수 있으며, 거부 방법은 아래 5항에 안내되어 있습니다.
            </p>
            <p className={styles.sub}>그 밖에 법령에 의한 요청이 있는 경우에만 예외적으로 제공할 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. 쿠키 등 자동 수집 도구 및 광고의 운영과 거부 방법</h2>
            <p>
              서비스는 이용 현황을 파악하고 서비스를 개선하기 위해 Google LLC의 웹·앱 분석 도구인
              Google Analytics를 사용합니다. 이 과정에서 웹에서는 쿠키가, 앱에서는 앱 인스턴스 식별자가
              이용자의 기기에 저장되어 위 1항의 자동 수집 항목이 수집됩니다.
            </p>
            <p className={styles.sub}>이용자는 아래 방법으로 자동 수집을 거부할 수 있습니다.</p>
            <ul className={styles.list}>
              <li>웹: 브라우저 설정에서 쿠키 저장을 거부하거나 삭제
                <ul className={styles.subList}>
                  <li>Chrome: 설정 &gt; 개인정보 보호 및 보안 &gt; 서드파티 쿠키</li>
                  <li>Safari: 환경설정 &gt; 개인정보 보호 &gt; 쿠키 및 웹사이트 데이터</li>
                </ul>
              </li>
              <li>웹: Google Analytics 차단 브라우저 부가기능 설치 (tools.google.com/dlpage/gaoptout)</li>
              <li>앱: 기기의 설정에서 앱 사용 정보 공유 및 광고 식별자 사용을 제한</li>
            </ul>
            <p className={styles.sub}>
              쿠키 저장을 거부하시더라도 서비스 이용에는 제한이 없으나, 일부 편의 기능의 이용이 불편해질 수 있습니다.
            </p>

            <p>
              또한 서비스는 운영에 필요한 비용을 충당하기 위해 Google LLC의 광고 서비스인 Google AdSense(웹) 및
              Google AdMob(앱)을 통해 광고를 게재합니다. 이 과정에서 웹에서는 광고 쿠키가, 앱에서는 광고 식별자가
              사용되며, 이용자의 관심사에 기반한 맞춤형 광고가 표시될 수 있습니다.
            </p>
            <p className={styles.sub}>이용자는 아래 방법으로 맞춤형 광고를 거부할 수 있습니다.</p>
            <ul className={styles.list}>
              <li>웹: Google 광고 설정에서 맞춤 광고 사용 중지 (adssettings.google.com)</li>
              <li>웹: 브라우저 설정에서 서드파티 쿠키 차단</li>
              <li>Android: 설정 &gt; Google &gt; 모든 서비스 &gt; 광고 &gt; 광고 ID 삭제 또는 재설정</li>
              <li>iOS: 설정 &gt; 개인정보 보호 및 보안 &gt; 추적 &gt; "앱이 추적을 요청하도록 허용" 해제</li>
            </ul>
            <p className={styles.sub}>
              맞춤형 광고를 거부하시더라도 서비스 이용에는 제한이 없습니다. 다만 광고 자체는 계속 표시되며,
              이용자의 관심사와 무관한 일반 광고로 대체됩니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. 개인정보 처리 위탁</h2>
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
                  <td>네이버 (Naver Corp.)</td>
                  <td>소셜 로그인 인증 처리</td>
                </tr>
                <tr>
                  <td>OpenAI</td>
                  <td>AI 기반 조황 분석 텍스트 생성</td>
                </tr>
                <tr>
                  <td>Google LLC</td>
                  <td>서비스 이용 통계 분석(Google Analytics), 푸시 알림 발송(Firebase Cloud Messaging)</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. 개인정보의 국외 이전</h2>
            <p>서비스는 아래와 같이 개인정보를 국외로 이전하고 있습니다.</p>
            <ul className={styles.list}>
              <li>Google LLC (미국)
                <ul className={styles.subList}>
                  <li>이전 항목: 쿠키 및 앱 인스턴스 식별자, 광고 식별자(광고 쿠키, Android 광고 ID, iOS 광고 식별자), 회원 식별자, 기기·브라우저 정보, 서비스 이용 기록, 광고 노출 및 클릭 기록, 푸시 알림 발송을 위한 기기 토큰</li>
                  <li>이전 목적: 서비스 이용 통계 분석, 푸시 알림 발송, 광고 게재 및 광고 성과 측정</li>
                  <li>이전 일시 및 방법: 서비스 이용 시점에 정보통신망을 통해 전송</li>
                  <li>보유 및 이용 기간: 통계 분석 정보는 수집일로부터 최대 14개월, 그 외는 위탁 계약 종료 시까지</li>
                </ul>
              </li>
              <li>OpenAI, L.L.C. (미국)
                <ul className={styles.subList}>
                  <li>이전 항목: 조황 분석 요청에 포함된 지역·기상·해양 정보</li>
                  <li>이전 목적: AI 기반 조황 분석 텍스트 생성</li>
                  <li>이전 일시 및 방법: 분석 요청 시점에 정보통신망을 통해 전송</li>
                  <li>보유 및 이용 기간: 분석 처리 완료 후 즉시 파기</li>
                </ul>
              </li>
            </ul>
            <p className={styles.sub}>
              이용자는 개인정보의 국외 이전을 거부할 수 있으며, 거부를 원하시는 경우 아래 개인정보보호책임자에게 요청하실 수 있습니다.
              다만 거부 시 해당 기능의 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. 이용자의 권리</h2>
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
            <h2 className={styles.sectionTitle}>9. 개인정보의 안전성 확보 조치</h2>
            <ul className={styles.list}>
              <li>HTTPS를 통한 전송 구간 암호화</li>
              <li>접근 권한 최소화 및 관리</li>
              <li>접속 기록 보관 및 위·변조 방지</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. 개인정보보호책임자</h2>
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
            <h2 className={styles.sectionTitle}>11. 만 14세 미만 아동의 개인정보</h2>
            <p>
              서비스는 만 14세 미만 아동의 회원가입을 허용하지 않으며, 만 14세 미만 아동의 개인정보를 수집하지 않습니다.
              회원가입 시 이용자로부터 만 14세 이상임을 확인받으며, 만 14세 미만임이 확인된 계정은 지체 없이 삭제하고
              수집된 개인정보를 파기합니다.
            </p>
            <p className={styles.sub}>
              만 14세 미만 아동의 개인정보가 수집된 사실을 알게 된 경우 아래 개인정보보호책임자에게 알려주시기 바랍니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>12. 방침 변경 안내</h2>
            <p>본 개인정보처리방침이 변경될 경우 변경 사항을 서비스 내 공지사항을 통해 사전 안내합니다.</p>
          </section>
        </div>
      </main>
    </>
  );
}
