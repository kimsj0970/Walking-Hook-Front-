import styles from './PrivacyPage.module.css';
import Header from '../components/common/Header';

// 계정 삭제 요청 안내.
//
// Play 정책(answer/13327111)은 계정 생성이 가능한 앱에 인앱 삭제 경로와 **웹에서
// 삭제를 요청할 수 있는 공개 URL** 을 모두 요구한다. 앱을 이미 삭제한 사용자에게도
// 경로가 있어야 하기 때문이다. 이 페이지 URL 을 Play Console 데이터 안전 설문의
// "계정 삭제 요청 URL" 에 제출한다.
//
// 본문의 삭제 범위·유예 기간은 실제 서버 동작과 일치해야 한다(허위 기재는 정책 위반).
// 근거: UserController /user/delete → 계정·게시물·댓글 소프트 삭제,
//       OAuthUserController /oauth/recovery → 탈퇴 5일 이내 복구 신청.
export default function AccountDeletionPage() {
  return (
    <>
      <Header />
      <main className={styles.container}>
        <div className={styles.content}>
          <h1 className={styles.title}>계정 및 데이터 삭제 요청</h1>
          <p className={styles.updated}>Walking Hook (워킹훅)</p>

          <p className={styles.intro}>
            워킹훅 계정과 관련 데이터의 삭제를 요청하는 방법을 안내합니다. 앱을 삭제하는 것만으로는
            계정이 삭제되지 않으며, 아래 방법 중 하나로 요청하셔야 합니다.
          </p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. 앱에서 직접 삭제하기</h2>
            <ul className={styles.list}>
              <li>워킹훅 앱 실행 후 로그인</li>
              <li>마이페이지 이동</li>
              <li>회원탈퇴 선택 후 안내에 따라 진행</li>
            </ul>
            <p className={styles.sub}>웹사이트에서도 동일하게 마이페이지에서 탈퇴할 수 있습니다.</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. 앱 없이 이메일로 요청하기</h2>
            <p>
              앱을 이미 삭제하셨거나 로그인이 어려운 경우, 아래 이메일로 삭제를 요청하실 수 있습니다.
              본인 확인을 위해 <strong>가입에 사용한 소셜 계정(카카오 · 네이버 · 구글)의 이메일 주소</strong>로
              보내주시고, 제목에 &quot;계정 삭제 요청&quot;을 적어주시기 바랍니다.
            </p>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <td>담당자</td>
                  <td>김승중</td>
                </tr>
                <tr>
                  <td>이메일</td>
                  <td>kimsj0970@gmail.com</td>
                </tr>
              </tbody>
            </table>
            <p className={styles.sub}>
              본인 확인이 완료되면 영업일 기준 3일 이내에 처리하고 결과를 회신해 드립니다.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. 삭제되는 데이터</h2>
            <ul className={styles.list}>
              <li>계정 정보 (이름, 이메일, 닉네임, 생년, 프로필 이미지)</li>
              <li>작성한 게시물 및 댓글</li>
              <li>첨부한 사진</li>
              <li>알림 수신을 위한 기기 토큰</li>
              <li>약관 동의 이력 및 서비스 이용 기록</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. 삭제 시점 및 복구 유예 기간</h2>
            <ul className={styles.list}>
              <li>
                탈퇴 즉시 계정과 게시물·댓글이 다른 이용자에게 보이지 않도록 처리되며, 서비스를 이용할 수 없게 됩니다.
              </li>
              <li>
                착오로 인한 탈퇴를 대비해 <strong>5일간의 복구 유예 기간</strong>을 둡니다. 이 기간 안에 같은 소셜 계정으로
                로그인하면 복구를 신청할 수 있습니다.
              </li>
              <li>유예 기간이 지나면 데이터는 복구할 수 없도록 완전히 삭제됩니다.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. 삭제 후에도 보관되는 정보</h2>
            <p>아래 정보는 관계 법령에 따라 정해진 기간 동안 분리 보관한 뒤 파기합니다.</p>
            <ul className={styles.list}>
              <li>전자상거래법에 따른 소비자 불만 및 분쟁 처리 기록: 3년</li>
              <li>통신비밀보호법에 따른 서비스 접속 기록: 3개월</li>
            </ul>
            <p className={styles.sub}>
              자세한 내용은 <a href="/privacy">개인정보처리방침</a>을 참고하시기 바랍니다.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
