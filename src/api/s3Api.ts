import api from './authApi';

export type BoardType = 'CATCH_POST' | 'NOTICE' | 'INQUIRY' | 'FREE_POST';

// ── Magic byte signatures for image validation ─────────────────────────────
const SIGNATURES = [
  { mime: 'image/jpeg', check: (b: Uint8Array) => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  { mime: 'image/png',  check: (b: Uint8Array) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  { mime: 'image/gif',  check: (b: Uint8Array) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 },
  {
    mime: 'image/webp',
    check: (b: Uint8Array) =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
];

export async function detectImageMime(file: File): Promise<string> {
  const buf = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buf);
  for (const sig of SIGNATURES) {
    if (sig.check(bytes)) return sig.mime;
  }
  throw new Error('지원하지 않는 파일 형식입니다. JPG, PNG, GIF, WebP 이미지만 업로드할 수 있습니다.');
}

// ── Presigned URL request ─────────────────────────────────────────────────
interface PresignedUrlResult {
  presignedUrl: string;
  objectKey: string;
  publicUrl: string;
}

async function requestPresignedUrl(
  boardType: BoardType,
  contentType: string,
  contentLength: number,
): Promise<PresignedUrlResult> {
  const { data } = await api.post('/s3/presigned-url', { boardType, contentType, contentLength });
  return data.data as PresignedUrlResult;
}

// ── Direct S3 PUT (no auth header — presigned URL carries credentials) ────
async function putToS3(presignedUrl: string, file: File, contentType: string): Promise<void> {
  const res = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) throw new Error(`S3 업로드 실패: ${res.status}`);
}

// ── Public helper: validate → presign → upload → return public URL ────────
export async function uploadImage(file: File, boardType: BoardType): Promise<string> {
  const contentType = await detectImageMime(file);
  const { presignedUrl, publicUrl } = await requestPresignedUrl(boardType, contentType, file.size);
  await putToS3(presignedUrl, file, contentType);
  return publicUrl;
}
