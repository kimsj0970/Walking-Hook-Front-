/**
 * 댓글 스레드 공용 헬퍼 (인스타·유튜브식 2단 표시)
 *
 * - 서버에는 답글의 실제 부모(parentId)를 그대로 저장한다 → 알림이 답글 받은 사람에게 간다.
 * - 화면은 원댓글 아래 한 단계로만 들여쓰고, 답글의 답글은 본문 앞에 "@닉네임"을 붙여 구분한다.
 */
interface ThreadNode {
  id: string;
  parentId?: string | null;
  authorNickname: string;
}

/** 원댓글 아래 달린 답글·대대댓글 전체 (부모 바로 뒤에 자식이 오는 순서) */
export function descendantsOf<T extends ThreadNode>(all: T[], rootId: string): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  const walk = (pid: string) => {
    for (const c of all) {
      if (c.parentId === pid && !seen.has(c.id)) {
        seen.add(c.id);
        out.push(c);
        walk(c.id);
      }
    }
  };
  walk(rootId);
  return out;
}

/** 답글의 답글이면 부모 작성자 닉네임, 원댓글에 바로 단 답글이면 null */
export function replyMentionOf<T extends ThreadNode>(all: T[], reply: T, rootId: string): string | null {
  if (!reply.parentId || reply.parentId === rootId) return null;
  const parent = all.find(c => c.id === reply.parentId);
  return parent ? parent.authorNickname : null;
}
