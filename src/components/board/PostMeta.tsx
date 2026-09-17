import type { ReactNode } from 'react';
import { CameraIcon, CommentIcon, LikeIcon, PinIcon, MapIcon } from '../common/Icons';
import styles from './PostMeta.module.css';

/**
 * 게시판 목록·상세가 같이 쓰는 메타 표시.
 *
 * 예전에는 조황·자유·공지·커뮤니티 홈이 각자 같은 줄을 따로 그렸다. 그래서
 *   · 조황만 "관리자" 강조가 없어 회색으로 묻혔고,
 *   · 글자 크기가 12px / 13px 로 갈렸고,
 *   · 공지는 사진 개수를 안 붙이고 좋아요가 아예 없었고,
 *   · 조황은 0 이어도 댓글 0 · 좋아요 0 을 찍었다.
 * 규칙을 여기 한 곳에 둔다.
 */

/** 0 은 그리지 않는다 — 없는 것을 굳이 0 으로 말할 이유가 없다. */
function Count({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  if (!value) return null;
  return (
    <span className={styles.count} title={label}>
      {icon}
      {value}
    </span>
  );
}

/**
 * 글쓴이 이름. 운영진이면 붉게 세운다.
 *
 * `official` 은 **서버가 권한을 보고 내려주는 값**이다. 닉네임 문자열로 판단하지 않는다 —
 * 그러면 그 이름으로 가입하기만 해도 관리자로 보였다.
 */
export function AuthorLabel({ nickname, official }: { nickname: string; official?: boolean }) {
  return (
    <span className={official ? styles.authorOfficial : styles.author}>
      {nickname}
    </span>
  );
}

export interface PostMetaProps {
  authorNickname: string;
  official?: boolean;
  photoCount?: number;
  commentCount?: number;
  likeCount?: number;
  /** 포인트 이름 또는 시/도. 조황 게시판만 쓴다. */
  place?: { label: string; kind: 'point' | 'province' } | null;
}

export default function PostMeta({
  authorNickname, official, photoCount = 0, commentCount = 0, likeCount = 0, place,
}: PostMetaProps) {
  return (
    <span className={styles.row}>
      {place && (
        <span className={styles.place}>
          {place.kind === 'point'
            ? <PinIcon size={14} strokeWidth={1.9} />
            : <MapIcon size={14} strokeWidth={1.9} />}
          {place.label}
        </span>
      )}
      <AuthorLabel nickname={authorNickname} official={official} />
      <Count icon={<CameraIcon size={14} strokeWidth={1.9} />} value={photoCount} label="사진" />
      <Count icon={<CommentIcon size={14} strokeWidth={1.9} />} value={commentCount} label="댓글" />
      <Count icon={<LikeIcon size={14} strokeWidth={1.9} />} value={likeCount} label="좋아요" />
    </span>
  );
}
