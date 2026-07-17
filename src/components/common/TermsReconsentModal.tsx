import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './AgeConsentModal.module.css';

/**
 * 약관 재동의 모달 (탈퇴 후 복구·재가입 사용자용).
 * 탈퇴 시 약관 동의가 초기화되므로, 계정 복구 후 첫 로그인 시 필수 약관에 다시 동의해야 한다.
 * 신규 가입자(닉네임 미설정)는 NicknamePage 약관 단계에서 처리하므로 제외.
 */
export default function TermsReconsentModal() {
  const { isLoggedIn, needsNickname, needsTermsConsent, isInitializing, confirmTermsReconsent } = useAuth();

  const [ageChecked, setAgeChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [marketingChecked, setMarketingChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const open = !isInitializing && isLoggedIn && needsTermsConsent && !needsNickname;
  const allRequired = ageChecked && termsChecked && privacyChecked;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRequired) return;
    setError('');
    setLoading(true);
    try {
      await confirmTermsReconsent(marketingChecked);
    } catch {
      setError('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <span className={styles.icon}>🎣</span>
        <h2 className={styles.title}>약관 재동의가 필요해요</h2>
        <p className={styles.desc}>
          계정이 복구되어 다시 오신 것을 환영합니다.
          <br />
          서비스 이용을 위해 약관에 다시 동의해 주세요.
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={ageChecked}
              onChange={(e) => setAgeChecked(e.target.checked)}
            />
            <span className={styles.checkLabelText}>본인은 만 14세 이상입니다</span>
            <span className={styles.badge}>필수</span>
          </label>

          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={termsChecked}
              onChange={(e) => setTermsChecked(e.target.checked)}
            />
            <span className={styles.checkLabelText}>
              <Link to="/terms" target="_blank" rel="noopener noreferrer">이용약관</Link>에 동의합니다
            </span>
            <span className={styles.badge}>필수</span>
          </label>

          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
            />
            <span className={styles.checkLabelText}>
              <Link to="/privacy" target="_blank" rel="noopener noreferrer">개인정보처리방침</Link>에 동의합니다
            </span>
            <span className={styles.badge}>필수</span>
          </label>

          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={marketingChecked}
              onChange={(e) => setMarketingChecked(e.target.checked)}
            />
            <span className={styles.checkLabelText}>마케팅 정보 수신에 동의합니다</span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading || !allRequired}>
            {loading ? '처리 중...' : '동의하고 계속하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
