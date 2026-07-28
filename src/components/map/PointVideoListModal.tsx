import { useEffect, useState } from 'react';
import {
  fetchPointVideosPublic,
  type MigratoryPointVideo,
} from '../../api/migratoryFishPointApi';
import Pagination from '../common/Pagination';
import styles from './PointVideoListModal.module.css';

/**
 * 포인트에서 촬영된 유튜브 영상 목록 (사용자용).
 *
 * 채널명·게시일·등장 구간과 "링크" 글자만 노출하고 유튜브로 새 창을 띄운다.
 * 썸네일을 가져오거나 임베드로 재생하지 않는다 — 각 채널의 콘텐츠다.
 */
interface Props {
  pointId: string;
  pointName: string;
  onClose: () => void;
}

/** 초 → "2:05" (1시간 이상이면 "1:02:05") */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

function sectionLabel(v: MigratoryPointVideo): string {
  const start = formatTime(v.startSeconds);
  return v.endSeconds != null ? `${start} ~ ${formatTime(v.endSeconds)}` : `${start} 부터`;
}

function publishedLabel(value: string): string {
  return value.replaceAll('-', '.');
}

/** 한 페이지에 보여줄 개수. 모달 높이 안에서 스크롤 없이 읽히는 선 */
const PAGE_SIZE = 5;
/** 페이지 번호를 5개씩 묶어 ‹ › 로 다음 묶음(6~10)으로 넘어간다 */
const BLOCK_SIZE = 5;

export default function PointVideoListModal({ pointId, pointName, onClose }: Props) {
  const [videos, setVideos] = useState<MigratoryPointVideo[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchPointVideosPublic(pointId, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setVideos(result.content ?? []);
        setTotalPages(result.totalPages);
        setTotalElements(result.totalElements);
        setStatus('ready');
      })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [pointId, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>이 포인트가 나오는 영상</h3>
            <p className={styles.subtitle}>{pointName}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        </div>

        <div className={styles.body}>
          {status === 'loading' && (
            <div className={styles.stateBox}><div className={styles.spinner} /></div>
          )}

          {status === 'error' && (
            <div className={styles.stateBox}>영상을 불러오지 못했습니다.</div>
          )}

          {status === 'ready' && videos.length === 0 && totalElements === 0 && (
            <div className={styles.stateBox}>
              <div>
                <p className={styles.emptyTitle}>등록된 영상이 없습니다</p>
                <p className={styles.emptyDesc}>이 포인트가 나오는 영상이 확인되면 이곳에 추가됩니다.</p>
              </div>
            </div>
          )}

          {status === 'ready' && videos.length > 0 && (
            <>
              <p className={styles.count}>
                영상 {totalElements}개 · 최신순
              </p>
              <ul className={styles.list}>
                {videos.map((v) => (
                  <li key={v.id}>
                    <a
                      className={styles.item}
                      href={v.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <div className={styles.itemMain}>
                        <span className={styles.channel}>{v.channelName}</span>
                        <span className={styles.date}>{publishedLabel(v.publishedOn)}</span>
                        <span className={styles.section}>이 포인트 등장 {sectionLabel(v)}</span>
                      </div>
                      <span className={styles.link}>링크</span>
                    </a>
                  </li>
                ))}
              </ul>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                blockSize={BLOCK_SIZE}
              />
              <p className={styles.disclaimer}>
                각 영상은 해당 채널의 콘텐츠이며, 워킹훅과 제휴 관계가 없습니다.
                노출을 원하지 않는 채널은 문의하기로 알려주시면 바로 내리겠습니다.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
