import { useRef, useState } from 'react';
import { uploadImage, type BoardType } from '../../api/s3Api';
import styles from './PhotoUploader.module.css';

interface PhotoUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  boardType: BoardType;
  /** undefined = no limit, positive number = max count */
  maxPhotos?: number;
  disabled?: boolean;
}

export default function PhotoUploader({ value, onChange, boardType, maxPhotos, disabled }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = maxPhotos !== undefined ? maxPhotos - value.length : Infinity;
  const canAdd = remaining > 0;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    if (maxPhotos !== undefined && value.length + files.length > maxPhotos) {
      setError(`사진은 최대 ${maxPhotos}장까지 첨부할 수 있습니다.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    setError('');
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, boardType)));
      onChange([...value, ...urls]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = (i: number) => {
    const next = [...value];
    next.splice(i, 1);
    onChange(next);
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {value.map((url, i) => (
          <div key={i} className={styles.thumb}>
            <img src={url} alt={`사진 ${i + 1}`} className={styles.img} />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => remove(i)}
              disabled={disabled || uploading}
              aria-label="사진 삭제"
            >✕</button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <span className={styles.addIcon}>+</span>
            <span className={styles.addLabel}>{uploading ? '업로드 중...' : '사진 추가'}</span>
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}
      {maxPhotos !== undefined && (
        <p className={styles.hint}>{value.length}/{maxPhotos}장</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple={remaining > 1}
        onChange={handleFiles}
        className={styles.hidden}
        disabled={disabled || uploading}
      />
    </div>
  );
}
