/**
 * 유튜브 주소 다루기 — 화면 여러 곳에서 같은 규칙을 쓴다.
 *
 * 방침(`claude/포인트영상-썸네일-적용내역` 과 동일):
 *   - 썸네일을 **우리 서버에 복제하지 않는다.** 유튜브가 주는 주소를 가리키기만 한다.
 *   - 임베드로 재생하지 않는다. 눌렀을 때 유튜브로 나간다. 각 채널의 콘텐츠다.
 */

/** 유튜브 영상 ID 는 11자, `A-Z a-z 0-9 _ -` 로만 이뤄진다 */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * 주소에서 영상 ID 를 뽑는다. 유튜브 주소가 아니거나 형태를 모르면 null.
 *
 * `watch?v=` 한 형태로 통일해 달라고 안내하지만 실제 데이터에는
 * `youtu.be/…`·`shorts/…`·`?si=…` 가 섞인다. 알려진 형태를 모두 받아 준다.
 */
export function youtubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase();
  const segments = parsed.pathname.split('/').filter(Boolean);
  let id: string | null = null;

  if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
    id = segments[0] ?? null;
  } else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    id = parsed.searchParams.get('v');
    if (!id && segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
      id = segments[1];
    }
  }

  return id && VIDEO_ID.test(id) ? id : null;
}

/**
 * 썸네일 주소. 유튜브 주소가 아니면 null → 부르는 쪽에서 그림 없이 그린다.
 *
 * `mqdefault`(320×180) 를 쓰는 이유 — 모든 영상에 반드시 있고 16:9 라 검은 띠가 없다.
 * `maxresdefault` 는 없는 영상이 많아 깨지고, `hqdefault` 는 4:3 이다.
 */
export function youtubeThumbnail(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** 초 → "5:32" (1시간 이상이면 "1:02:05") */
export function formatVideoTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** 시작 시각이 있으면 그 지점부터 열리는 주소를 만든다. */
export function youtubeWatchUrl(url: string, startSeconds?: number): string {
  const id = youtubeId(url);
  if (!id) return url;
  const base = `https://www.youtube.com/watch?v=${id}`;
  return startSeconds && startSeconds > 0 ? `${base}&t=${startSeconds}s` : base;
}
