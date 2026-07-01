import { useState, useEffect } from 'react';
import PhotoUploader from './PhotoUploader';
import type { BoardType } from '../../api/s3Api';
import styles from './PostFormModal.module.css';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, photoUrls: string[]) => Promise<void>;
  modalTitle: string;
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  initialTitle?: string;
  initialContent?: string;
  /** undefined = 사진 업로드 없음, null = 무제한, number = 최대 장수 */
  maxPhotos?: number | null;
  boardType?: BoardType;
  initialPhotoUrls?: string[];
  /** undefined = 무제한, number = 내용 최대 글자 수 */
  maxContentLength?: number;
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
  maxPhotos,
  boardType,
  initialPhotoUrls = [],
  maxContentLength,
}: PostFormModalProps) {
  const [title,     setTitle]     = useState(initialTitle);
  const [content,   setContent]   = useState(initialContent);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialPhotoUrls);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setPhotoUrls(initialPhotoUrls);
      setError('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
      await onSubmit(t, c, photoUrls);
      onClose();
    } catch {
      setError('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const showPhotoUploader = maxPhotos !== undefined && boardType !== undefined;

  return (
    <div className={styles.overlay}>
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
            <span className={styles.charCount}>{title.length}/200자</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>내용</label>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={contentPlaceholder}
              maxLength={maxContentLength}
            />
            {maxContentLength !== undefined && (
              <span className={styles.charCount}>{content.length}/{maxContentLength}자</span>
            )}
          </div>
          {showPhotoUploader && (
            <div className={styles.field}>
              <label className={styles.label}>
                사진{maxPhotos !== null ? ` (최대 ${maxPhotos}장)` : ''}
              </label>
              <PhotoUploader
                value={photoUrls}
                onChange={setPhotoUrls}
                boardType={boardType}
                maxPhotos={maxPhotos ?? undefined}
                disabled={loading}
              />
            </div>
          )}
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
