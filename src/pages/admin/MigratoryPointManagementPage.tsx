import { useState, useEffect, useCallback } from 'react';
import {
  type MigratoryFishPointSummary,
  type MigratoryFishPointDetail,
  MIGRATORY_SPECIES_LABELS,
  fetchMigratoryFishPoints,
  getMigratoryFishPoint,
  deleteMigratoryFishPoint,
} from '../../api/migratoryFishPointApi';
import { TERRAIN_TYPE_LABELS } from '../../api/fishingPointApi';
import MigratoryFishPointFormModal from './MigratoryFishPointFormModal';
import styles from './PointManagementPage.module.css';

const PAGE_SIZE = 15;

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

  const handleSearch = (e: { preventDefault(): void }) => {
    e.preventDefault();
    setSearchQuery(searchInput);
  };

  const handleClear = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

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
          <h1 className={styles.pageTitle}>회유성 포인트 관리</h1>
          <p className={styles.pageSubtitle}>
            삼치·방어·부시리 등 회유성 어종 포인트를 추가·수정·삭제합니다.
            {searchQuery ? ` "${searchQuery}" 검색 결과 ${totalElements}개` : ` 총 ${totalElements}개`}
          </p>
        </div>
        <button className={styles.addBtn} onClick={handleOpenCreate}>
          + 새 회유성 포인트 추가
        </button>
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
            {searchQuery ? `"${searchQuery}"에 해당하는 포인트가 없습니다.` : '등록된 회유성 포인트가 없습니다.'}
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

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} disabled={currentPage === 0} onClick={() => goToPage(currentPage - 1)}>‹</button>
            {pageNumbers.map(p => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                onClick={() => goToPage(p)}
              >
                {p + 1}
              </button>
            ))}
            <button className={styles.pageBtn} disabled={currentPage === totalPages - 1} onClick={() => goToPage(currentPage + 1)}>›</button>
          </div>
        )}
      </div>

      <MigratoryFishPointFormModal
        open={modalOpen}
        editTarget={editTarget}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />

      {deleteTarget && (
        <div className={styles.dialogOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>회유성 포인트 삭제</h3>
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
