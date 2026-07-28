import { useState } from 'react';
import {
  reactToPost,
  type ReactionKind, type ReactionState, type ReactionTargetType,
} from '../../api/reactionApi';
import styles from './ReactionBar.module.css';

interface Props {
  targetType: ReactionTargetType;
  targetId: string;
  /** 게시물 상세에서 내려준 초기 상태 */
  initial: ReactionState;
  /** 비로그인이면 버튼을 눌렀을 때 로그인으로 유도한다 */
  isLoggedIn: boolean;
  onRequireLogin?: () => void;
}

/**
 * 게시물 따봉/다운 바. 같은 버튼을 다시 누르면 취소, 반대 버튼을 누르면 전환된다.
 * 응답이 최신 개수를 그대로 주므로 낙관적 업데이트 없이 서버 값으로 덮어쓴다.
 */
export default function ReactionBar({ targetType, targetId, initial, isLoggedIn, onRequireLogin }: Props) {
  const [state, setState] = useState<ReactionState>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const toggle = async (kind: ReactionKind) => {
    if (!isLoggedIn) { onRequireLogin?.(); return; }
    if (pending) return;
    setPending(true);
    setError('');
    try {
      setState(await reactToPost(targetType, targetId, kind));
    } catch {
      setError('반응을 저장하지 못했습니다.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={`${styles.btn} ${state.myReaction === 'LIKE' ? styles.likeActive : ''}`}
        onClick={() => toggle('LIKE')}
        disabled={pending}
        aria-pressed={state.myReaction === 'LIKE'}
        aria-label="추천"
      >
        <span className={styles.icon}>👍</span>
        <span className={styles.count}>{state.likeCount}</span>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${state.myReaction === 'DISLIKE' ? styles.dislikeActive : ''}`}
        onClick={() => toggle('DISLIKE')}
        disabled={pending}
        aria-pressed={state.myReaction === 'DISLIKE'}
        aria-label="비추천"
      >
        <span className={styles.icon}>👎</span>
        <span className={styles.count}>{state.dislikeCount}</span>
      </button>
      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
