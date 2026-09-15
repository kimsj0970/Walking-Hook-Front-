import { useNavigate } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.sources}>
          <span className={styles.label}>데이터 출처</span>
          <span className={styles.divider}>|</span>
          <span>기상청</span>
          <span className={styles.divider}>|</span>
          <span>국립해양조사원</span>
          <span className={styles.divider}>|</span>
          <span>국립수산과학원</span>
          <span className={styles.divider}>|</span>
          <span>국립해양측위정보원</span>
          <span className={styles.divider}>|</span>
          <span>한국천문연구원</span>
          <span className={styles.divider}>·</span>
          {/* 공공누리 제1유형은 온라인 이용 시 출처 사이트 링크를 요구한다.
              기관별 링크는 /open-data 가 담당하고 여기서는 그 페이지로 보낸다. */}
          <button className={styles.link} onClick={() => navigate('/open-data')}>
            공공누리 제1유형
          </button>
        </div>

        <div className={styles.links}>
          <button className={styles.link} onClick={() => navigate('/guide')}>
            낚시 가이드
          </button>
          <button className={styles.link} onClick={() => navigate('/community')}>
            커뮤니티
          </button>
          <button className={styles.link} onClick={() => navigate('/notices')}>
            공지사항
          </button>
          <button className={styles.link} onClick={() => navigate('/inquiry')}>
            고객센터
          </button>
          <button className={styles.link} onClick={() => navigate('/terms')}>
            이용약관
          </button>
          <button className={styles.link} onClick={() => navigate('/privacy')}>
            개인정보처리방침
          </button>
          <button className={styles.link} onClick={() => navigate('/open-data')}>
            데이터 출처
          </button>
          <button className={styles.link} onClick={() => navigate('/account-deletion')}>
            회원탈퇴
          </button>
        </div>

        <div className={styles.copy}>
          <span>© 2026 Walking Hook. All rights reserved.</span>
          <span className={styles.cpo}>개인정보보호책임자: 김승중 (kimsj0970@gmail.com)</span>
        </div>
      </div>
    </footer>
  );
}
