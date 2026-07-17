import styles from './Pagination.module.css';

interface PaginationProps {
  /** 현재 페이지 (0-based, 서버 Pageable 과 동일) */
  currentPage: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 페이지 이동 콜백 (0-based 페이지 번호를 넘긴다) */
  onPageChange: (page: number) => void;
  /** 한 블록에 보여줄 페이지 번호 개수 (기본 10) */
  blockSize?: number;
}

/**
 * 공용 페이지네이션.
 *
 * 페이지 번호를 [blockSize]개씩 묶어 한 블록으로 보여주고, ‹ › 화살표로 이전/다음
 * 블록으로 점프한다. 예) 1~10 블록에서 › 를 누르면 11 페이지로 이동하며 11~20 블록이 보인다.
 * 서버 Spring Data Pageable 과 맞추기 위해 [currentPage]/onPageChange 는 모두 0-based 다.
 */
export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  blockSize = 10,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const currentBlock = Math.floor(currentPage / blockSize);
  const blockStart = currentBlock * blockSize;
  const blockEnd = Math.min(blockStart + blockSize, totalPages); // exclusive
  const pages = Array.from({ length: blockEnd - blockStart }, (_, i) => blockStart + i);

  const hasPrevBlock = blockStart > 0;
  const hasNextBlock = blockEnd < totalPages;

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={!hasPrevBlock}
        aria-label="이전 페이지 묶음"
        // 이전 블록의 마지막 페이지로 이동 → 블록이 이전 묶음으로 넘어간다
        onClick={() => onPageChange(blockStart - 1)}
      >
        ‹
      </button>

      {pages.map((p) => (
        <button
          type="button"
          key={p}
          className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
          aria-current={p === currentPage ? 'page' : undefined}
          onClick={() => onPageChange(p)}
        >
          {p + 1}
        </button>
      ))}

      <button
        type="button"
        className={styles.pageBtn}
        disabled={!hasNextBlock}
        aria-label="다음 페이지 묶음"
        // 다음 블록의 첫 페이지로 이동 → 블록이 다음 묶음으로 넘어간다
        onClick={() => onPageChange(blockEnd)}
      >
        ›
      </button>
    </div>
  );
}
