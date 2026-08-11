import { useState, useEffect, useCallback } from 'react';
import {
  type FishingPointSummary,
  type FishingPointDetail,
  searchFishingPoints,
  getFishingPoint,
  deleteFishingPoint,
  deletePointAnalysis,
  getAiScheduleStatus,
  startAiSchedule,
  stopAiSchedule,
  SAFETY_LEVEL_LABELS,
  TERRAIN_TYPE_LABELS,
} from '../../api/fishingPointApi';
import FishingPointFormModal from './FishingPointFormModal';
import styles from './PointManagementPage.module.css';

/** 기본 동작 시간대: 06시 ~ 24시 (새벽 시간대 제외) */
const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 24;

/** 시작 시각 후보 0~23시, 종료 시각 후보 1~24시 (24 = 자정) */
const START_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);
const END_HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i + 1);

const formatHour = (hour: number) => `${String(hour).padStart(2, '0')}시`;

/** 06시~24시처럼 동작 구간을 사람이 읽는 문구로. 자정을 넘는 구간도 표기 */
const formatWindow = (startHour: number, endHour: number) =>
  startHour < endHour
    ? `${formatHour(startHour)}~${formatHour(endHour)}`
    : `${formatHour(startHour)}~다음날 ${formatHour(endHour)}`;

export default function PointManagementPage() {
  const [points, setPoints] = useState<FishingPointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FishingPointDetail | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FishingPointSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [deleteAnalysisTarget, setDeleteAnalysisTarget] = useState<FishingPointSummary | null>(null);
  const [deletingAnalysis, setDeletingAnalysis] = useState(false);

  const [toast, setToast] = useState('');

  const [scheduleRunning, setScheduleRunning] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleStartHour, setScheduleStartHour] = useState(DEFAULT_START_HOUR);
  const [scheduleEndHour, setScheduleEndHour] = useState(DEFAULT_END_HOUR);

  // 시간대 선택 다이얼로그 (스케줄러 켜기 클릭 시 오픈)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [draftStartHour, setDraftStartHour] = useState(DEFAULT_START_HOUR);
  const [draftEndHour, setDraftEndHour] = useState(DEFAULT_END_HOUR);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await searchFishingPoints(searchQuery || undefined);
      setPoints(result);
    } catch {
      showToast('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getAiScheduleStatus()
      .then((status) => {
        setScheduleRunning(status.running);
        setScheduleStartHour(status.startHour);
        setScheduleEndHour(status.endHour);
      })
      .catch(() => {});
  }, []);

  /** 켜져 있으면 즉시 중지, 꺼져 있으면 시간대 선택 다이얼로그를 연다 */
  const handleScheduleToggle = async () => {
    if (!scheduleRunning) {
      setDraftStartHour(scheduleStartHour);
      setDraftEndHour(scheduleEndHour);
      setScheduleDialogOpen(true);
      return;
    }

    setScheduleLoading(true);
    try {
      await stopAiSchedule();
      setScheduleRunning(false);
      showToast('AI 캐싱 스케줄러가 중지되었습니다.');
    } catch {
      showToast('스케줄러 상태 변경에 실패했습니다.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleScheduleStart = async () => {
    if (draftStartHour === draftEndHour) {
      showToast('시작 시각과 종료 시각이 같을 수 없습니다.');
      return;
    }
    setScheduleLoading(true);
    try {
      await startAiSchedule(draftStartHour, draftEndHour);
      setScheduleRunning(true);
      setScheduleStartHour(draftStartHour);
      setScheduleEndHour(draftEndHour);
      setScheduleDialogOpen(false);
      showToast(
        `AI 캐싱 스케줄러가 시작되었습니다. (매일 ${formatWindow(draftStartHour, draftEndHour)}, 1시간 간격, 포인트당 35초 간격)`,
      );
    } catch {
      showToast('스케줄러 상태 변경에 실패했습니다.');
    } finally {
      setScheduleLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClear = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = async (id: string) => {
    setLoadingEdit(true);
    try {
      const detail = await getFishingPoint(id);
      if (!detail) {
        showToast('포인트 정보를 찾을 수 없습니다.');
        return;
      }
      setEditTarget(detail);
      setModalOpen(true);
    } catch {
      showToast('포인트 정보를 불러오지 못했습니다. 로그인 상태와 네트워크를 확인해주세요.');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    showToast(editTarget ? '포인트가 수정되었습니다.' : '포인트가 추가되었습니다.');
    load();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFishingPoint(deleteTarget.id);
      setDeleteTarget(null);
      showToast('포인트가 삭제되었습니다.');
      load();
    } catch {
      showToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAnalysisConfirm = async () => {
    if (!deleteAnalysisTarget) return;
    setDeletingAnalysis(true);
    try {
      await deletePointAnalysis(deleteAnalysisTarget.id);
      setDeleteAnalysisTarget(null);
      showToast('AI 분석 캐시가 삭제되었습니다.');
      load();
    } catch {
      showToast('AI 분석 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeletingAnalysis(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* AI 캐싱 스케줄러 배너 */}
      <div className={`${styles.schedulerBanner} ${scheduleRunning ? styles.schedulerOn : styles.schedulerOff}`}>
        <div className={styles.schedulerInfo}>
          <span className={`${styles.schedulerDot} ${scheduleRunning ? styles.dotOn : styles.dotOff}`} />
          <span className={styles.schedulerLabel}>
            AI 캐싱 스케줄러
          </span>
          <span className={styles.schedulerStatus}>
            {scheduleRunning
              ? `실행 중 — 매일 ${formatWindow(scheduleStartHour, scheduleEndHour)}에만 1시간마다 전체 포인트 AI 분석 자동 갱신`
              : '중지됨 — 켜기를 누르면 동작 시간대를 고를 수 있습니다'}
          </span>
        </div>
        <button
          className={`${styles.schedulerBtn} ${scheduleRunning ? styles.schedulerBtnOff : styles.schedulerBtnOn}`}
          onClick={handleScheduleToggle}
          disabled={scheduleLoading}
        >
          {scheduleLoading ? '처리 중...' : scheduleRunning ? '스케줄러 끄기' : '스케줄러 켜기'}
        </button>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>낚시 포인트 관리</h1>
          <p className={styles.pageSubtitle}>
            포인트를 추가·수정·삭제할 수 있습니다.
            {searchQuery
              ? ` "${searchQuery}" 검색 결과 ${points.length}개`
              : ` 활성·공개 포인트 ${points.length}개`}
          </p>
        </div>
        <button className={styles.addBtn} onClick={handleOpenCreate}>
          + 새 포인트 추가
        </button>
      </div>

      {/* 검색 */}
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <input
          className={styles.searchInput}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="이름으로 검색..."
        />
        {searchInput && (
          <button type="button" className={styles.clearBtn} onClick={handleClear}>✕</button>
        )}
        <button type="submit" className={styles.searchBtn}>검색</button>
      </form>

      {/* 테이블 */}
      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
          </div>
        ) : points.length === 0 ? (
          <div className={styles.emptyBox}>
            {searchQuery ? `"${searchQuery}"에 해당하는 포인트가 없습니다.` : '등록된 포인트가 없습니다.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>지역</th>
                <th>지형</th>
                <th>안전</th>
                <th>공개</th>
                <th>활성</th>
                <th>AI 분석 생성</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id}>
                  <td className={styles.nameCell}>{p.name}</td>
                  <td>{p.region}</td>
                  <td>{TERRAIN_TYPE_LABELS[p.terrainType]}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[`safety_${p.safetyLevel}`]}`}>
                      {SAFETY_LEVEL_LABELS[p.safetyLevel]}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.publicVisible ? styles.badgeGreen : styles.badgeOrange}`}>
                      {p.publicVisible ? '공개' : '비공개'}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${p.enabled ? styles.badgeGreen : styles.badgeRed}`}>
                      {p.enabled ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className={styles.analyzedAtCell}>
                    {p.lastAnalyzedAt ?? <span className={styles.noAnalysis}>미생성</span>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleOpenEdit(p.id)}
                        disabled={loadingEdit}
                        title="수정"
                      >
                        ✏️
                      </button>
                      <button
                        className={styles.deleteAnalysisBtn}
                        onClick={() => setDeleteAnalysisTarget(p)}
                        disabled={!p.lastAnalyzedAt}
                        title={p.lastAnalyzedAt ? 'AI 분석 삭제' : 'AI 분석 없음'}
                      >
                        AI분석 삭제
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => setDeleteTarget(p)}
                        title="삭제"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 스케줄러 동작 시간대 선택 다이얼로그 */}
      {scheduleDialogOpen && (
        <div className={styles.dialogOverlay} onClick={() => !scheduleLoading && setScheduleDialogOpen(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>스케줄러 동작 시간대</h3>
            <p className={styles.dialogBody}>
              매일 선택한 시간대에만 AI 분석 갱신이 돌아갑니다.<br />
              시간대 밖에서는 다음날 시작 시각까지 대기하며, 끄기 전까지 계속 유지됩니다.
            </p>
            <div className={styles.hourPicker}>
              <label className={styles.hourField}>
                <span className={styles.hourLabel}>시작</span>
                <select
                  className={styles.hourSelect}
                  value={draftStartHour}
                  onChange={(e) => setDraftStartHour(Number(e.target.value))}
                  disabled={scheduleLoading}
                >
                  {START_HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
              <span className={styles.hourSeparator}>~</span>
              <label className={styles.hourField}>
                <span className={styles.hourLabel}>종료</span>
                <select
                  className={styles.hourSelect}
                  value={draftEndHour}
                  onChange={(e) => setDraftEndHour(Number(e.target.value))}
                  disabled={scheduleLoading}
                >
                  {END_HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
              </label>
            </div>
            <p className={styles.hourHint}>
              {draftStartHour === draftEndHour
                ? '시작 시각과 종료 시각이 같을 수 없습니다.'
                : `${formatWindow(draftStartHour, draftEndHour)} 동안 동작합니다.`}
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setScheduleDialogOpen(false)}
                disabled={scheduleLoading}
              >
                취소
              </button>
              <button
                className={styles.startScheduleBtn}
                onClick={handleScheduleStart}
                disabled={scheduleLoading || draftStartHour === draftEndHour}
              >
                {scheduleLoading ? '시작 중...' : '스케줄러 켜기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 생성/수정 모달 */}
      <FishingPointFormModal
        open={modalOpen}
        editTarget={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <div className={styles.dialogOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>포인트 삭제</h3>
            <p className={styles.dialogBody}>
              <strong>{deleteTarget.name}</strong> 포인트를 삭제합니다.<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                취소
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 분석 삭제 확인 다이얼로그 */}
      {deleteAnalysisTarget && (
        <div className={styles.dialogOverlay} onClick={() => !deletingAnalysis && setDeleteAnalysisTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>AI 분석 캐시 삭제</h3>
            <p className={styles.dialogBody}>
              <strong>{deleteAnalysisTarget.name}</strong> 포인트의 AI 분석 캐시를 삭제합니다.<br />
              삭제 후 다음 조회 시 AI가 새로 분석을 생성합니다.
            </p>
            <div className={styles.dialogActions}>
              <button
                className={styles.cancelBtn}
                onClick={() => setDeleteAnalysisTarget(null)}
                disabled={deletingAnalysis}
              >
                취소
              </button>
              <button
                className={styles.confirmDeleteBtn}
                onClick={handleDeleteAnalysisConfirm}
                disabled={deletingAnalysis}
              >
                {deletingAnalysis ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
