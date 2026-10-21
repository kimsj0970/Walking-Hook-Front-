import { useState } from 'react';
import styles from './TackleThumb.module.css';

/** 사진 사용 허락을 못 받은 제품용 기본 썸네일. 앱 `assets/images/tackle/default_thumb.png` 와 같은 그림이다. */
export const TACKLE_DEFAULT_THUMB = '/tackle/default_thumb.svg';

interface Props {
  src?: string | null;
  size?: number;
  alt?: string;
}

/**
 * 제품 썸네일. 제품 사진을 그리는 곳(목록·상세·관리자)은 전부 이것만 쓴다.
 *
 * - 사진이 없으면 기본 썸네일, 로딩에 실패해도 기본 썸네일.
 * - 실패 처리를 상태값으로 한 번만 바꾼다 — onError 에서 src 를 직접 갈아 끼우면
 *   기본 그림까지 실패했을 때 무한 반복이 생긴다.
 * - 기본 썸네일일 때는 96px 이상 칸에서만 `대표 이미지` 라벨을 얹는다(실제 제품 사진으로 오해하지 않게).
 */
export default function TackleThumb({ src, size = 80, alt = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const useDefault = !src || failed;

  return (
    <span className={styles.thumb} style={{ width: size, height: size }}>
      <img
        src={useDefault ? TACKLE_DEFAULT_THUMB : src!}
        alt={useDefault ? '' : alt}
        loading="lazy"
        onError={() => setFailed(true)}
      />
      {useDefault && size >= 96 && <span className={styles.label}>대표 이미지</span>}
    </span>
  );
}
