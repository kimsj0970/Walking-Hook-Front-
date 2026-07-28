import { useCallback, useEffect, useState } from 'react';
import {
  fetchPointVideos,
  createPointVideo,
  updatePointVideo,
  deletePointVideo,
  type MigratoryPointVideo,
} from '../../api/migratoryFishPointApi';
import styles from './PointVideoManagerModal.module.css';

/**
 * 조황 포인트에 연결된 유튜브 영상 관리 모달.
 *
 * 목록·연필 폼·지도 세 진입점이 모두 이 모달 하나를 띄운다.
 * 저장하는 건 URL·채널명·날짜·등장 구간뿐이며, 화면에는 "링크" 글자만 노출한다.
 */
interface Props {
  pointId: string;
  pointName: string;
  onClose: () => void;
  /** 영상 개수가 바뀌었을 때 — 목록의 "영상" 컬럼을 갱신하는 데 쓴다 */
  onChanged?: () => void;
}

interface FormState {
  url: string;
  channelName: string;
  publishedOn: string;
  start: string;
  end: string;
}

const EMPTY_FORM: FormState = { url: '', channelName: '', publishedOn: '', start: '', end: '' };

/** "2:05" / "1:02:05" / "125" → 초. 형식이 틀리면 null */
function parseTime(value: string): number | null {
  const raw = value.trim();
  if (!raw) return null;
  const parts = raw.split(':');
  if (parts.length > 3) return null;

  // 콜론 없이 숫자만 넣으면 초로 본다. 예: "125"
  if (parts.length === 1) return /^\d+$/.test(parts[0]) ? Number(parts[0]) : null;

  let seconds = 0;
  for (const part of parts) {
    if (!/^\d{1,2}$/.test(part)) return null;
    seconds = seconds * 60 + Number(part);
  }
  return seconds;
}

/** 초 → "2:05" (1시간 이상이면 "1:02:05") */
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export default function PointVideoManagerModal({ pointId, pointName, onClose, onChanged }: Props) {
  const [videos, setVideos] = useState<MigratoryPointVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  /** 수정 중인 영상 id. null 이면 새로 등록 */
  const [editingId, setEditingId] = useState<string | null>(null);
  /**
   * 폼 표시 여부. 기본은 닫힘 — 이 모달의 주인공은 등록된 영상 목록이고,
   * 추가는 "+ 영상 추가"를 눌렀을 때만 필요하다.
   */
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setVideos(await fetchPointVideos(pointId));
    } catch {
      setError('영상 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [pointId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** 폼을 비우고 닫는다 — 저장 성공·취소 공용 */
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
    setError('');
  };

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError('');
    setFormOpen(true);
  };

  const handleEdit = (v: MigratoryPointVideo) => {
    setEditingId(v.id);
    setFormOpen(true);
    setError('');
    setForm({
      url: v.url,
      channelName: v.channelName,
      publishedOn: v.publishedOn,
      start: formatTime(v.startSeconds),
      end: v.endSeconds != null ? formatTime(v.endSeconds) : '',
    });
  };

  const handleSubmit = async () => {
    setError('');

    if (!form.url.trim())         { setError('영상 링크를 입력해주세요.'); return; }
    if (!form.channelName.trim()) { setError('채널 이름을 입력해주세요.'); return; }
    if (!form.publishedOn)        { setError('영상 날짜를 선택해주세요.'); return; }

    const startSeconds = parseTime(form.start);
    if (startSeconds === null) { setError('시작 시각을 2:05 형식으로 입력해주세요.'); return; }

    const hasEnd = form.end.trim().length > 0;
    const endSeconds = hasEnd ? parseTime(form.end) : null;
    if (hasEnd && endSeconds === null) { setError('종료 시각을 4:30 형식으로 입력해주세요.'); return; }
    if (endSeconds !== null && endSeconds <= startSeconds) {
      setError('종료 시각은 시작 시각보다 뒤여야 합니다.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updatePointVideo(editingId, {
          url: form.url.trim(),
          channelName: form.channelName.trim(),
          publishedOn: form.publishedOn,
          startSeconds,
          endSeconds: endSeconds ?? undefined,
          clearEndSeconds: !hasEnd,
        });
      } else {
        await createPointVideo(pointId, {
          url: form.url.trim(),
          channelName: form.channelName.trim(),
          publishedOn: form.publishedOn,
          startSeconds,
          endSeconds,
          sortOrder: videos.length,
        });
      }
      if (editingId) {
        resetForm();
      } else {
        // 연달아 여러 개를 넣는 흐름이라 추가 후에는 폼을 비우기만 하고 열어 둔다.
        setForm(EMPTY_FORM);
        setError('');
      }
      await load();
      onChanged?.();
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (v: MigratoryPointVideo) => {
    if (!window.confirm(`${v.channelName} 영상을 삭제할까요?`)) return;
    setSaving(true);
    try {
      await deletePointVideo(v.id);
      if (editingId === v.id) resetForm();
      await load();
      onChanged?.();
    } catch {
      setError('삭제에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={() => !saving && onClose()}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>유튜브 영상 관리</h3>
            <p className={styles.subtitle}>{pointName}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} disabled={saving}>✕</button>
        </div>

        <div className={styles.body}>
          {/* 등록된 영상 목록 */}
          {!loading && (
            <div className={styles.listHeader}>
              <span className={styles.listCount}>
                등록된 영상 {videos.length}개 · 최신순
              </span>
              {!formOpen && (
                <button className={styles.addBtn} onClick={handleOpenCreate} disabled={saving}>
                  + 영상 추가
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className={styles.loadingBox}><div className={styles.spinner} /></div>
          ) : videos.length === 0 ? (
            <div className={styles.emptyBox}>아직 등록된 영상이 없습니다.</div>
          ) : (
            <ul className={styles.list}>
              {videos.map((v) => (
                <li key={v.id} className={`${styles.item} ${editingId === v.id ? styles.itemEditing : ''}`}>
                  <div className={styles.itemMain}>
                    <span className={styles.channel}>{v.channelName}</span>
                    <span className={styles.meta}>{v.publishedOn}</span>
                    <span className={styles.section}>
                      {formatTime(v.startSeconds)}
                      {v.endSeconds != null ? ` ~ ${formatTime(v.endSeconds)}` : ''}
                    </span>
                    <a className={styles.link} href={v.url} target="_blank" rel="noreferrer noopener">
                      링크
                    </a>
                  </div>
                  <div className={styles.itemActions}>
                    <button className={styles.smallBtn} onClick={() => handleEdit(v)} disabled={saving}>
                      수정
                    </button>
                    <button className={styles.smallDangerBtn} onClick={() => handleDelete(v)} disabled={saving}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 등록/수정 폼 — "+ 영상 추가" 또는 목록의 "수정"으로 열린다 */}
          {formOpen && (
          <div className={styles.form}>
            <h4 className={styles.formTitle}>{editingId ? '영상 수정' : '영상 추가'}</h4>

            <label className={styles.field}>
              <span className={styles.label}>영상 링크</span>
              <input
                className={styles.input}
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://youtu.be/... (공유 → 시작 시간 포함)"
                disabled={saving}
              />
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>채널 이름</span>
                <input
                  className={styles.input}
                  value={form.channelName}
                  onChange={(e) => setForm((f) => ({ ...f, channelName: e.target.value }))}
                  placeholder="갯바위낚시TV"
                  disabled={saving}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>영상 날짜</span>
                <input
                  className={styles.input}
                  type="date"
                  value={form.publishedOn}
                  onChange={(e) => setForm((f) => ({ ...f, publishedOn: e.target.value }))}
                  disabled={saving}
                />
              </label>
            </div>

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>등장 시작</span>
                <input
                  className={styles.input}
                  value={form.start}
                  onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                  placeholder="2:05"
                  disabled={saving}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>등장 종료 (선택)</span>
                <input
                  className={styles.input}
                  value={form.end}
                  onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                  placeholder="4:30"
                  disabled={saving}
                />
              </label>
            </div>

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formActions}>
              <button className={styles.cancelBtn} onClick={resetForm} disabled={saving}>
                취소
              </button>
              <button className={styles.saveBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? '저장 중...' : editingId ? '수정 저장' : '영상 추가'}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
