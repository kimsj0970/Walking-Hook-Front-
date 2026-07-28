import { useState, useEffect, useCallback } from 'react';
import {
  type MigratoryFishPointSummary,
  type MigratoryFishPointDetail,
  type MigratoryFishPointMapMarker,
  MIGRATORY_SPECIES_LABELS,
  fetchMigratoryFishPoints,
  fetchAllMigratoryFishPoints,
  getMigratoryFishPoint,
  deleteMigratoryFishPoint,
} from '../../api/migratoryFishPointApi';
import { TERRAIN_TYPE_LABELS } from '../../api/fishingPointApi';
import MigratoryFishPointFormModal from './MigratoryFishPointFormModal';
import MigratoryPointMapPicker from '../../components/map/MigratoryPointMapPicker';
import PointVideoManagerModal from './PointVideoManagerModal';
import Pagination from '../../components/common/Pagination';
import styles from './PointManagementPage.module.css';

const PAGE_SIZE = 15;

/** 영상 관리 모달을 띄울 대상 — 세 진입점(목록·연필 폼·지도)이 이 상태 하나를 공유한다 */
interface VideoTarget {
  id: string;
  name: string;
}

export default function MigratoryPointManagementPage() {
  const [points, setPoints] = useState<MigratoryFishPointSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<MigratoryFishPointDetail | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MigratoryFishPointSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [videoTarget, setVideoTarget] = useState<VideoTarget | null>(null);

  // 지도로 보기 — 페이지 목록이 아니라 전체 포인트를 핀으로 띄운다.
  const [mapOpen, setMapOpen] = useState(false);
  const [mapPoints, setMapPoints] = useState<MigratoryFishPointMapMarker[]>([]);

  const [toast, setToast] = useState('');

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await fetchMigratoryFishPoints(page, PAGE_SIZE, searchQuery || undefined);
      setPoints(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
      setCurrentPage(result.page);
    } catch {
      showToast('목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => { load(0); }, [load]);

  const goToPage = (page: number) => load(page);

  /** 지도로 보기 — 열 때만 전체 포인트를 받아 핀으로 찍는다 */
  const handleOpenMap = async () => {
    setMapOpen(true);
    if (mapPoints.length > 0) return;
    try {
      const all = await fetchAllMigratoryFishPoints();
      setMapPoints(all.map((p) => ({
        id: p.id, name: p.name, province: p.province, region: p.region,
        latitude: p.latitude, longitude: p.longitude, targetSpecies: p.targetSpecies,
      })));
    } catch {
      showToast('지도용 포인트를 불러오지 못했습니다.');
    }
  };

  /** 지도에서 핀을 고르면 그 포인트의 영상 관리 모달로 넘어간다 */
  const handleMapSelect = (point: MigratoryFishPointMapMarker) => {
    setMapOpen(false);
    setVideoTarget({ id: point.id, name: point.name });
  };

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClear = () => {
    setSearchInput('');
    setSearchQuery('');
  };


  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleOpenCreate = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleOpenEdit = async (id: string) => {
    setLoadingEdit(true);
    try {
      const detail = await getMigratoryFishPoint(id);
      setEditTarget(detail);
      setModalOpen(true);
    } catch {
      showToast('포인트 정보를 불러오지 못했습니다.');
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleSaved = () => {
    setModalOpen(false);
    showToast(editTarget ? '포인트가 수정되었습니다.' : '포인트가 추가되었습니다.');
    load(currentPage);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMigratoryFishPoint(deleteTarget.id);
      setDeleteTarget(null);
      showToast('포인트가 삭제되었습니다.');
      load(currentPage);
    } catch {
      showToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>조황 포인트 관리</h1>
          <p className={styles.pageSubtitle}>
            조황 게시물에 연결되는 낚시 포인트를 추가·수정·삭제합니다.
            {searchQuery ? ` "${searchQuery}" 검색 결과 ${totalElements}개` : ` 총 ${totalElements}개`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.mapBtn} onClick={handleOpenMap}>
            지도로 보기
          </button>
          <button className={styles.addBtn} onClick={handleOpenCreate}>
            + 새 조황 포인트 추가
          </button>
        </div>
      </div>

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

      <div className={styles.tableWrap}>
        {loading ? (
          <div className={styles.loadingBox}><div className={styles.spinner} /></div>
        ) : points.length === 0 ? (
          <div className={styles.emptyBox}>
            {searchQuery ? `"${searchQuery}"에 해당하는 포인트가 없습니다.` : '등록된 조황 포인트가 없습니다.'}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>이름</th>
                <th>지역</th>
                <th>지형</th>
                <th>주요 어종</th>
                <th>공개</th>
                <th>활성</th>
                <th>영상</th>
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
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.targetSpecies.map((s) => (
                        <span
                          key={s}
                          className={styles.badge}
                          style={{ background: 'rgba(11,61,145,0.08)', color: 'var(--color-primary)' }}
                        >
                          {MIGRATORY_SPECIES_LABELS[s]}
                        </span>
                      ))}
                    </div>
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
                  <td>
                    <button
                      className={`${styles.videoBadge} ${p.videoCount > 0 ? styles.videoBadgeOn : styles.videoBadgeOff}`}
                      onClick={() => setVideoTarget({ id: p.id, name: p.name })}
                      title="유튜브 영상 관리"
                    >
                      {p.videoCount > 0 ? `영상 ${p.videoCount}` : '없음'}
                    </button>
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      </div>

      <MigratoryFishPointFormModal
        open={modalOpen}
        editTarget={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onManageVideos={
          editTarget
            ? () => {
                setModalOpen(false);
                setVideoTarget({ id: editTarget.id, name: editTarget.name });
              }
            : undefined
        }
      />

      {/* 지도로 보기 — 핀을 고르면 그 포인트의 영상 관리로 이어진다.
          사용자 조황 작성 화면과 같은 컴포넌트지만, 넘기는 콜백만 다르다. */}
      {mapOpen && (
        <MigratoryPointMapPicker
          points={mapPoints}
          onSelect={handleMapSelect}
          onClose={() => setMapOpen(false)}
          title="지도에서 포인트 선택 — 영상 관리"
          hint='마커를 탭한 뒤 "이 포인트 영상 관리"를 누르면 영상 등록 화면이 열립니다'
          selectLabel="이 포인트 영상 관리"
          emptyMessage="등록된 조황 포인트가 없습니다."
        />
      )}

      {videoTarget && (
        <PointVideoManagerModal
          pointId={videoTarget.id}
          pointName={videoTarget.name}
          onClose={() => setVideoTarget(null)}
          onChanged={() => load(currentPage)}
        />
      )}

      {deleteTarget && (
        <div className={styles.dialogOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>조황 포인트 삭제</h3>
            <p className={styles.dialogBody}>
              <strong>{deleteTarget.name}</strong> 포인트를 삭제합니다.<br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)} disabled={deleting}>
                취소
              </button>
              <button className={styles.confirmDeleteBtn} onClick={handleDeleteConfirm} disabled={deleting}>
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
