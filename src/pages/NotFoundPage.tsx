import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import styles from './NotFoundPage.module.css';
import { usePageMeta } from '../lib/usePageMeta';

/**
 * 주소가 어느 라우트와도 맞지 않을 때.
 *
 * 예전에는 이 화면이 아예 없었다. <Routes> 가 아무것도 렌더하지 않고, Routes
 * 바깥의 Footer 와 하단 배너만 남아 **백지에 광고만 뜨는 화면**이 됐다.
 * 주소 오타뿐 아니라 /catch-posts/123 처럼 "있을 법하지만 없는" 주소가 전부
 * 여기로 온다. 광고는 붙이지 않는다 — 안내만 있는 화면이기 때문이다.
 */
export default function NotFoundPage() {
  usePageMeta('페이지를 찾을 수 없습니다');
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <Header />
      <main className={styles.main}>
        <p className={styles.code}>404</p>
        <h1 className={styles.title}>페이지를 찾을 수 없습니다</h1>
        <p className={styles.desc}>
          주소가 바뀌었거나 삭제된 페이지일 수 있어요.
          <br />
          아래에서 원하는 곳으로 이동해 주세요.
        </p>
        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => navigate('/')}>
            홈으로
          </button>
          <button className={styles.ghost} onClick={() => navigate('/guide')}>
            낚시 가이드
          </button>
        </div>
      </main>
    </div>
  );
}
