import { useState, useEffect } from 'react';
import styles from './PostFormModal.module.css';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<void>;
  modalTitle: string;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  initialTitle?: string;
  initialContent?: string;
}

export default function PostFormModal({
  isOpen,
  onClose,
  onSubmit,
  modalTitle,
  titlePlaceholder = '제목을 입력하세요',
  contentPlaceholder = '내용을 입력하세요',
  initialTitle = '',
  initialContent = '',
}: PostFormModalProps) {
  const [title,   setTitle]   = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setError('');
    }
  }, [isOpen, initialTitle, initialContent]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim(), c = content.trim();
    if (!t) { setError('제목을 입력해 주세요.'); return; }
    if (!c) { setError('내용을 입력해 주세요.'); return; }
    setError('');
    setLoading(true);
    try {
      await onSubmit(t, c);
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>{modalTitle}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>제목</label>
            <input
              className={styles.input}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
              maxLength={200}
              autoFocus
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>내용</label>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={contentPlaceholder}
            />
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              취소
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
