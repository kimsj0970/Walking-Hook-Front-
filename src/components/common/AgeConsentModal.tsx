import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AgeConsentModal.module.css';

/**
 * 만 14세 이상 확인 동의 모달 (기존 가입자용).
 * 연령 확인 기록(ageAgreedAt)이 없는 상태로 로그인하면 표시되며,
 * 동의 전까지 닫을 수 없다. 신규 가입자는 약관 동의 단계에서 함께 처리된다.
 */
export default function AgeConsentModal() {
  const { isLoggedIn, needsNickname, needsAgeConsent, isInitializing, confirmAgeConsent } = useAuth();

  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 신규 가입자(닉네임 미설정)는 NicknamePage 약관 단계에서 함께 동의하므로 제외
  const open = !isInitializing && isLoggedIn && needsAgeConsent && !needsNickname;

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checked) return;
    setError('');
    setLoading(true);
    try {
      await confirmAgeConsent();
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
        <h2 className={styles.title}>연령 확인이 필요해요</h2>
        <p className={styles.desc}>
          서비스 이용을 위해 만 14세 이상 여부 확인이 필요합니다.
          <br />
          아래 항목에 동의해 주세요.
        </p>

        <form onSubmit={handleSubmit}>
          <label className={styles.checkItem}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span className={styles.checkLabelText}>본인은 만 14세 이상입니다</span>
            <span className={styles.badge}>필수</span>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.btn} disabled={loading || !checked}>
            {loading ? '처리 중...' : '동의하고 계속하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
