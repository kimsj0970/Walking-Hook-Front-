import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { agreeToTermsApi } from '../api/authApi';
import styles from './NicknamePage.module.css';

type Step = 'terms' | 'nickname';

export default function NicknamePage() {
  const { needsNickname, setInitialNickname } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('terms');

  const [ageAgreed, setAgeAgreed] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState('');

  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!needsNickname) {
    navigate('/', { replace: true });
    return null;
  }

  const allAgreed = ageAgreed && termsAgreed && privacyAgreed && marketingAgreed;
  const handleAllToggle = () => {
    const next = !allAgreed;
    setAgeAgreed(next);
    setTermsAgreed(next);
    setPrivacyAgreed(next);
    setMarketingAgreed(next);
  };

  const handleTermsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ageAgreed || !termsAgreed || !privacyAgreed) {
      setTermsError('필수 항목에 모두 동의해 주세요.');
      return;
    }
    setTermsError('');
    setTermsLoading(true);
    try {
      await agreeToTermsApi({ termsAgreed, privacyAgreed, marketingAgreed });
      setStep('nickname');
    } catch {
      setTermsError('약관 동의에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setTermsLoading(false);
    }
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) { setError('닉네임은 2자 이상 입력해 주세요.'); return; }
    if (trimmed.length > 20) { setError('닉네임은 20자 이하로 입력해 주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      await setInitialNickname(trimmed);
      navigate('/', { replace: true });
    } catch {
      setError('닉네임 설정에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'terms') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrap}>
            <span className={styles.icon}>🎣</span>
          </div>
          <h1 className={styles.title}>서비스 이용 동의</h1>
          <p className={styles.desc}>
            워킹훅을 이용하려면 아래 약관에 동의해 주세요.
          </p>

          <form onSubmit={handleTermsSubmit} className={styles.form}>
            <div className={styles.checkList}>
              <label className={styles.allCheckItem}>
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={handleAllToggle}
                />
                <span className={styles.allCheckLabel}>전체 동의</span>
              </label>

              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={ageAgreed}
                  onChange={(e) => setAgeAgreed(e.target.checked)}
                />
                <span className={styles.checkLabelText}>본인은 만 14세 이상입니다</span>
                <span className={`${styles.badge} ${styles.badgeRequired}`}>필수</span>
              </label>

              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                />
                <span className={styles.checkLabelText}>이용약관 동의</span>
                <span className={`${styles.badge} ${styles.badgeRequired}`}>필수</span>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className={styles.viewLink}>보기</a>
              </label>

              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                />
                <span className={styles.checkLabelText}>개인정보처리방침 동의</span>
                <span className={`${styles.badge} ${styles.badgeRequired}`}>필수</span>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className={styles.viewLink}>보기</a>
              </label>

              <label className={styles.checkItem}>
                <input
                  type="checkbox"
                  checked={marketingAgreed}
                  onChange={(e) => setMarketingAgreed(e.target.checked)}
                />
                <span className={styles.checkLabelText}>마케팅 수신 동의</span>
                <span className={`${styles.badge} ${styles.badgeOptional}`}>선택</span>
              </label>
            </div>

            {termsError && <p className={styles.error}>{termsError}</p>}

            <button
              type="submit"
              className={styles.btn}
              disabled={termsLoading || !ageAgreed || !termsAgreed || !privacyAgreed}
            >
              {termsLoading ? '처리 중...' : '다음'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <span className={styles.icon}>🎣</span>
        </div>
        <h1 className={styles.title}>닉네임을 설정해 주세요</h1>
        <p className={styles.desc}>
          커뮤니티에서 사용할 닉네임을 입력하세요.
          <br />
          나중에 마이페이지에서 변경할 수 있어요.
        </p>

        <form onSubmit={handleNicknameSubmit} className={styles.form}>
          <div className={styles.inputWrap}>
            <input
              className={styles.input}
              type="text"
              placeholder="닉네임 입력 (2~20자)"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <span className={styles.counter}>{value.trim().length}/20</span>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <button
            type="submit"
            className={styles.btn}
            disabled={loading || value.trim().length < 2}
          >
            {loading ? '설정 중...' : '완료'}
          </button>
        </form>
      </div>
    </div>
  );
}
