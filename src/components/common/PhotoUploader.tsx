import { useCallback, useEffect, useRef, useState } from 'react';
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

const LONG_PRESS_MS = 450;   // 모바일: 길게 눌러 드래그 진입
const TOUCH_CANCEL_PX = 10;  // 길게 누르는 동안 이만큼 움직이면 스크롤로 판단
const MOUSE_DRAG_PX = 4;     // 데스크톱: 이만큼 움직이면 드래그 시작

export default function PhotoUploader({ value, onChange, boardType, maxPhotos, disabled }: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // window 리스너에서 최신 props/드래그 상태를 참조하기 위한 ref 미러
  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const dragIdxRef = useRef<number | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const mouseStart = useRef({ x: 0, y: 0 });
  const mouseArmedIdx = useRef<number | null>(null);

  const remaining = maxPhotos !== undefined ? maxPhotos - value.length : Infinity;
  const canAdd = remaining > 0;
  const canDrag = !disabled && !uploading && value.length > 1;

  const setDrag = useCallback((i: number | null) => {
    dragIdxRef.current = i;
    setDragIdx(i);
  }, []);

  // 포인터 좌표 아래의 썸네일을 찾아 드래그 중인 사진을 그 위치로 이동
  const reorderTo = useCallback((clientX: number, clientY: number) => {
    const from = dragIdxRef.current;
    if (from === null) return;
    const target = document.elementFromPoint(clientX, clientY)?.closest('[data-photo-idx]');
    if (!(target instanceof HTMLElement)) return;
    const to = Number(target.dataset.photoIdx);
    if (Number.isNaN(to) || to === from) return;
    const next = [...valueRef.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChangeRef.current(next);
    setDrag(to);
  }, [setDrag]);

  const endDrag = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    mouseArmedIdx.current = null;
    if (dragIdxRef.current !== null) setDrag(null);
  }, [setDrag]);

  // ── 데스크톱: 클릭 후 드래그로 순서 이동 ─────────────────────────────
  const onThumbMouseDown = (e: React.MouseEvent, i: number) => {
    if (!canDrag || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return; // 삭제 버튼 클릭은 제외
    e.preventDefault(); // 브라우저 기본 이미지 드래그 방지
    mouseArmedIdx.current = i;
    mouseStart.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (mouseArmedIdx.current !== null && dragIdxRef.current === null) {
        const dx = e.clientX - mouseStart.current.x;
        const dy = e.clientY - mouseStart.current.y;
        if (Math.hypot(dx, dy) > MOUSE_DRAG_PX) setDrag(mouseArmedIdx.current);
      }
      if (dragIdxRef.current !== null) reorderTo(e.clientX, e.clientY);
    };
    const onUp = () => endDrag();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [reorderTo, endDrag, setDrag]);

  // ── 모바일: 길게 눌러 드래그 진입 후 순서 이동 ───────────────────────
  const onThumbTouchStart = (e: React.TouchEvent, i: number) => {
    if (!canDrag) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null;
      setDrag(i);
      navigator.vibrate?.(30);
    }, LONG_PRESS_MS);
  };

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (dragIdxRef.current === null) {
        // 아직 길게 누르는 중 — 손가락이 움직이면 스크롤 의도로 보고 드래그 취소
        if (pressTimer.current) {
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          if (Math.hypot(dx, dy) > TOUCH_CANCEL_PX) {
            clearTimeout(pressTimer.current);
            pressTimer.current = null;
          }
        }
        return;
      }
      e.preventDefault(); // 드래그 중에는 화면 스크롤 차단
      reorderTo(t.clientX, t.clientY);
    };
    const onTouchEnd = () => endDrag();
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [reorderTo, endDrag]);

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
          <div
            key={url}
            data-photo-idx={i}
            className={[
              styles.thumb,
              canDrag ? styles.draggable : '',
              dragIdx === i ? styles.dragging : '',
            ].join(' ')}
            onMouseDown={e => onThumbMouseDown(e, i)}
            onTouchStart={e => onThumbTouchStart(e, i)}
            onContextMenu={e => { if (canDrag) e.preventDefault(); }}
          >
            <img src={url} alt={`사진 ${i + 1}`} className={styles.img} draggable={false} />
            <span className={styles.orderBadge}>{i + 1}</span>
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
      {value.length > 1 && (
        <p className={styles.hint}>사진을 길게 누르거나 드래그하면 순서를 바꿀 수 있습니다.</p>
      )}
      <p className={styles.notice}>업로드한 사진은 다른 사용자에게 공개됩니다.</p>

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
