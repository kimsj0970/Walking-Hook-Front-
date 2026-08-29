import { useEffect, useState } from 'react';
import {
  fetchPointVideosPublic,
  type MigratoryPointVideo,
} from '../../api/migratoryFishPointApi';
import Pagination from '../common/Pagination';
import { formatVideoTime, youtubeThumbnail } from '../../lib/youtube';
import styles from './PointVideoListModal.module.css';

/**
 * 포인트에서 촬영된 유튜브 영상 목록 (사용자용).
 *
 * 영상 제목·채널명·게시일·등장 구간과 썸네일을 노출하고, 누르면 유튜브로 새 창을 띄운다.
 * 임베드로 재생하지 않는다 — 각 채널의 콘텐츠다. 썸네일도 유튜브가 주는 주소를
 * 그대로 가리킬 뿐 우리 서버에 복제하지 않는다.
 *
 * 제목은 길이가 제각각이라(유튜브 제목은 100자까지 간다) 2줄에서 자른다.
 * 자르지 않으면 카드 높이가 항목마다 달라져 목록이 읽히지 않는다.
 */
interface Props {
  pointId: string;
  pointName: string;
  onClose: () => void;
}

function sectionLabel(v: MigratoryPointVideo): string {
  const start = formatVideoTime(v.startSeconds);
  return v.endSeconds != null ? `${start} ~ ${formatVideoTime(v.endSeconds)}` : `${start} 부터`;
}

function publishedLabel(value: string): string {
  return value.replaceAll('-', '.');
}


/**
 * 항목 오른쪽 썸네일.
 *
 * 이미지를 못 받아오면(삭제된 영상 등) 아예 감춘다 — 깨진 이미지 아이콘이 남는 것보다 낫다.
 * 항목 전체가 이미 링크라 alt 는 비워 스크린리더가 같은 내용을 두 번 읽지 않게 한다.
 */
function VideoThumbnail({ url, startSeconds }: { url: string; startSeconds: number }) {
  const [failed, setFailed] = useState(false);
  const src = youtubeThumbnail(url);
  if (!src || failed) return null;

  return (
    <span className={styles.thumb}>
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      <span className={styles.thumbPlay} aria-hidden="true" />
      {/* 등장 시작 시각. 0초는 "영상 처음부터"라 굳이 표시하지 않는다 */}
      {startSeconds > 0 && (
        <span className={styles.thumbBadge}>{formatVideoTime(startSeconds)}</span>
      )}
    </span>
  );
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
                        {/* 제목이 있으면 대표 줄. 없는 영상(컬럼 생기기 전 데이터)은 예전처럼 채널명이 대표 줄이 된다. */}
                        {v.title && (
                          <span className={styles.videoTitle} title={v.title}>
                            {v.title}
                          </span>
                        )}
                        <div className={styles.metaRow}>
                          <span className={v.title ? styles.channel : styles.channelStrong}>
                            {v.channelName}
                          </span>
                          <span className={styles.date}>{publishedLabel(v.publishedOn)}</span>
                          <span className={styles.section}>이 포인트 등장 {sectionLabel(v)}</span>
                        </div>
                      </div>
                      <span className={styles.link}>링크</span>
                      <VideoThumbnail url={v.url} startSeconds={v.startSeconds} />
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
