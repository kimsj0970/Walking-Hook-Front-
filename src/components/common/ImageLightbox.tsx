import { useEffect } from 'react';
import styles from './ImageLightbox.module.css';

interface ImageLightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageLightbox({ images, index, onClose, onPrev, onNext }: ImageLightboxProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div className={styles.overlay}>
      <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>

      {images.length > 1 && (
        <button
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={e => { e.stopPropagation(); onPrev(); }}
          aria-label="이전"
        >‹</button>
      )}

      <img
        className={styles.image}
        src={images[index]}
        alt={`사진 ${index + 1}`}
        onClick={e => e.stopPropagation()}
      />

      {images.length > 1 && (
        <button
          className={`${styles.navBtn} ${styles.nextBtn}`}
          onClick={e => { e.stopPropagation(); onNext(); }}
          aria-label="다음"
        >›</button>
      )}

      {images.length > 1 && (
        <div className={styles.counter}>{index + 1} / {images.length}</div>
      )}
    </div>
  );
}
