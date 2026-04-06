import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './NicknamePage.module.css';

export default function NicknamePage() {
  const { needsNickname, setNickname } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 이미 닉네임이 있으면 홈으로
  if (!needsNickname) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setError('닉네임은 2자 이상 입력해 주세요.');
      return;
    }
    if (trimmed.length > 20) {
      setError('닉네임은 20자 이하로 입력해 주세요.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await setNickname(trimmed);
      navigate('/', { replace: true });
    } catch {
      setError('닉네임 설정에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

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

        <form onSubmit={handleSubmit} className={styles.form}>
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
