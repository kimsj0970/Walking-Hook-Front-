import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAdminUsersPage, setSuspended, type UserSummary } from '../../api/adminUserApi';
import styles from './UserManagementPage.module.css';

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function userStatus(u: UserSummary): 'deleted' | 'suspended' | 'active' {
  if (u.deletedAt) return 'deleted';
  if (u.isSuspended) return 'suspended';
  return 'active';
}

function roleLabel(role: string): string {
  if (role === 'ADMIN')        return '관리자';
  if (role === 'MIDDLE_ADMIN') return '중간관리자';
  return '일반 사용자';
}

function roleBadgeClass(role: string, s: typeof styles): string {
  if (role === 'ADMIN')        return styles.adminBadge;
  if (role === 'MIDDLE_ADMIN') return styles.modBadge;
  return '';
}

export default function UserManagementPage() {
  const { isAdmin, isModerator } = useAuth();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast]       = useState('');

  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages]   = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const result = await fetchAdminUsersPage(page, PAGE_SIZE);
      setUsers(result.content);
      setTotalPages(result.totalPages);
      setTotalElements(result.totalElements);
      setCurrentPage(result.page);
    } catch {
      showToast('사용자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(0); }, [load]);

  const goToPage = (page: number) => load(page);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.nickName ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  const canSuspend = (target: UserSummary): boolean => {
    if (isAdmin) return true;
    if (isModerator) return target.role === 'USER';
    return false;
  };

  const handleToggleSuspend = async () => {
    if (!selected || selected.deletedAt) return;
    if (!canSuspend(selected)) {
      showToast('중간관리자는 관리자 및 다른 중간관리자를 정지할 수 없습니다.');
      return;
    }
    setToggling(true);
    try {
      const next = !selected.isSuspended;
      await setSuspended(selected.id, next);
      const updated = { ...selected, isSuspended: next };
      setSelected(updated);
      setUsers(prev => prev.map(u => u.id === selected.id ? updated : u));
      showToast(next ? '활동이 정지되었습니다.' : '활동 정지가 해제되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? '처리 중 오류가 발생했습니다.');
    } finally {
      setToggling(false);
    }
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>사용자 관리</h1>
          <p className={styles.pageSubtitle}>전체 {totalElements}명</p>
        </div>
      </div>

      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          placeholder="이름·닉네임·이메일 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.layout}>
        <div className={styles.listPanel}>
          {loading ? (
            <div className={styles.loading}><div className={styles.spinner} /></div>
          ) : filtered.length === 0 ? (
            <p className={styles.empty}>검색 결과가 없습니다.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {filtered.map(u => {
                  const status = userStatus(u);
                  const badge = roleBadgeClass(u.role, styles);
                  return (
                    <li
                      key={u.id}
                      className={`${styles.listItem} ${selected?.id === u.id ? styles.active : ''}`}
                      onClick={() => setSelected(u)}
                    >
                      <div className={styles.listName}>
                        {u.nickName ?? u.name ?? '(닉네임 없음)'}
                        {badge && <span className={badge}>{roleLabel(u.role)}</span>}
                      </div>
                      <div className={styles.listMeta}>
                        <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                          {status === 'active' ? '활성' : status === 'suspended' ? '정지' : '탈퇴'}
                        </span>
                        <span className={styles.listProvider}>{u.provider}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

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
            </>
          )}
        </div>

        <div className={styles.detailPanel}>
          {selected ? (
            <div className={styles.detail}>
              <h2 className={styles.detailName}>
                {selected.nickName ?? selected.name ?? '(닉네임 없음)'}
              </h2>

              <table className={styles.detailTable}>
                <tbody>
                  <tr><th>이름</th><td>{selected.name ?? '—'}</td></tr>
                  <tr><th>닉네임</th><td>{selected.nickName ?? '—'}</td></tr>
                  <tr><th>이메일</th><td>{selected.email ?? '—'}</td></tr>
                  <tr><th>로그인</th><td>{selected.provider}</td></tr>
                  <tr>
                    <th>권한</th>
                    <td>
                      {selected.role === 'ADMIN' && <span className={styles.adminBadge}>관리자</span>}
                      {selected.role === 'MIDDLE_ADMIN' && <span className={styles.modBadge}>중간관리자</span>}
                      {selected.role === 'USER' && '일반 사용자'}
                    </td>
                  </tr>
                  <tr><th>포인트</th><td>{selected.point.toLocaleString()}P</td></tr>
                  <tr><th>가입일</th><td>{formatDate(selected.createdAt)}</td></tr>
                  <tr><th>탈퇴일</th><td>{formatDate(selected.deletedAt)}</td></tr>
                  <tr>
                    <th>상태</th>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status_${userStatus(selected)}`]}`}>
                        {userStatus(selected) === 'active' ? '활성' : userStatus(selected) === 'suspended' ? '정지' : '탈퇴'}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>

              {!selected.deletedAt && canSuspend(selected) && (
                <div className={styles.suspendSection}>
                  <label className={styles.suspendLabel}>
                    <input
                      type="checkbox"
                      checked={selected.isSuspended}
                      onChange={handleToggleSuspend}
                      disabled={toggling}
                      className={styles.suspendCheck}
                    />
                    <span>활동정지</span>
                  </label>
                  <p className={styles.suspendHint}>
                    체크 시 해당 사용자는 로그인 및 서비스 이용이 차단됩니다.
                  </p>
                </div>
              )}

              {!selected.deletedAt && !canSuspend(selected) && (
                <p className={styles.suspendHint} style={{ color: '#94A3B8', marginTop: 16 }}>
                  중간관리자는 관리자·중간관리자를 정지할 수 없습니다.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.detailEmpty}>
              <span>←</span>
              <p>사용자를 선택하면 상세 정보를 확인할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
