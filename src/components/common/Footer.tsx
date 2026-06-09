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
          <span>기상청 API 허브</span>
          <span className={styles.divider}>|</span>
          <span>국립해양조사원</span>
          <span className={styles.divider}>·</span>
          <span>공공누리 제1유형</span>
        </div>

        <div className={styles.links}>
          <button className={styles.link} onClick={() => navigate('/terms')}>
            이용약관
          </button>
          <button className={styles.link} onClick={() => navigate('/privacy')}>
            개인정보처리방침
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
