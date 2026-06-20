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
    getAiScheduleStatus().then(setScheduleRunning).catch(() => {});
  }, []);

  const handleScheduleToggle = async () => {
    setScheduleLoading(true);
    try {
      if (scheduleRunning) {
        await stopAiSchedule();
        setScheduleRunning(false);
        showToast('AI 캐싱 스케줄러가 중지되었습니다.');
      } else {
        await startAiSchedule();
        setScheduleRunning(true);
        showToast('AI 캐싱 스케줄러가 시작되었습니다. (1시간 간격, 포인트당 35초 간격)');
      }
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
              ? '실행 중 — 1시간마다 전체 포인트 AI 분석 자동 갱신'
              : '중지됨 — 켜면 1시간마다 전체 포인트 AI 분석을 자동으로 갱신합니다'}
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
