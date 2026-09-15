import { useMemo, useState } from 'react';
import type { MigratoryPointChannel } from '../../api/migratoryFishPointApi';
import styles from './ChannelFilterPanel.module.css';

/**
 * 지도의 "유튜버 선택" 목록.
 *
 * 한 명만 고른다(라디오). 여러 명을 동시에 고르는 방식은 2026-09-09 에 접었다 —
 * "이 유튜버 코스를 따라간다"는 쓰임이 더 분명하고 화면·로직이 단순해진다.
 *
 * 채널이 170개가 넘는데 그중 대부분이 포인트 1곳짜리다. 그대로 나열하면 목록이 못 쓰게 되므로
 * 서버가 준 포인트 수 내림차순 정렬을 그대로 쓰고, 기준(FOLD_THRESHOLD) 미만은 접는다.
 * 검색은 접힌 것까지 포함해서 찾는다 — 접은 건 표시를 접은 것이지 목록에서 뺀 게 아니다.
 */

/** 이 포인트 수 미만인 채널은 접는다. 1곳짜리(=전체의 3/4)를 감추는 선. */
const FOLD_THRESHOLD = 2;

interface Props {
  channels: MigratoryPointChannel[];
  status: 'loading' | 'ready' | 'error';
  /** null 이면 "전체 유튜버" */
  selected: string | null;
  onSelect: (channelName: string | null) => void;
  onClose: () => void;
  /** "전체 유튜버" 줄의 곳 수 — 지도가 실제로 들고 있는 값 */
  totalPointCount: number;
  /**
   * "전체 유튜버" 줄의 편수 — 서버 합계.
   * 목록에서 감춘 채널이 있어도 핀을 누르면 그 영상은 보이므로,
   * 목록 항목들의 합이 아니라 감춘 것까지 포함한 이 값을 써야 어긋나지 않는다.
   */
  totalVideoCount: number;
}

export default function ChannelFilterPanel({
  channels, status, selected, onSelect, onClose, totalPointCount, totalVideoCount,
}: Props) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const keyword = query.trim().toLowerCase();

  /** 검색 중에는 접기를 무시한다 — 1곳짜리 채널도 이름으로는 찾을 수 있어야 한다 */
  const visible = useMemo(() => {
    if (keyword) {
      return channels.filter((c) => c.channelName.toLowerCase().includes(keyword));
    }
    return expanded ? channels : channels.filter((c) => c.pointCount >= FOLD_THRESHOLD);
  }, [channels, keyword, expanded]);

  const foldedCount = channels.length - channels.filter((c) => c.pointCount >= FOLD_THRESHOLD).length;

  return (
    <div className={styles.panel}>
      <div className={styles.head}>
        <p className={styles.title}>유튜버</p>
        <p className={styles.desc}>한 명을 고르면 그 유튜버 영상이 있는 포인트만 지도에 남습니다</p>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="유튜버 목록 닫기">
          ✕
        </button>
      </div>

      <div className={styles.search}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="유튜버 이름 검색"
          aria-label="유튜버 이름 검색"
        />
      </div>

      {status === 'loading' && <p className={styles.state}>불러오는 중...</p>}
      {status === 'error' && <p className={styles.state}>유튜버 목록을 불러오지 못했습니다.</p>}

      {status === 'ready' && (
        <ul className={styles.list}>
          {!keyword && (
            <li>
              <button
                type="button"
                className={`${styles.row} ${selected === null ? styles.selected : ''}`}
                onClick={() => onSelect(null)}
              >
                <span className={styles.radio} />
                <span className={styles.name}>전체 유튜버</span>
                <span className={styles.count}>{totalPointCount}곳 · {totalVideoCount}편</span>
              </button>
            </li>
          )}

          {visible.map((c) => (
            <li key={c.channelName}>
              <button
                type="button"
                className={`${styles.row} ${selected === c.channelName ? styles.selected : ''}`}
                onClick={() => onSelect(c.channelName)}
              >
                <span className={styles.radio} />
                <span className={styles.name} title={c.channelName}>{c.channelName}</span>
                <span className={styles.count}>{c.pointCount}곳 · {c.videoCount}편</span>
              </button>
            </li>
          ))}

          {keyword && visible.length === 0 && (
            <li><p className={styles.state}>검색 결과가 없습니다.</p></li>
          )}

          {!keyword && !expanded && foldedCount > 0 && (
            <li>
              <button type="button" className={styles.moreBtn} onClick={() => setExpanded(true)}>
                1곳짜리 유튜버 {foldedCount}명 더 보기 ▾
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
