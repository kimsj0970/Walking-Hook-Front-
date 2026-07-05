import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAdminUsersPage, setSuspended, setRole, deleteUser, updateNickname,
  fetchActiveUserCount, fetchRegisteredUserCount, fetchUserVisitStats,
  fetchReRegistrationRequests, approveReRegistration, rejectReRegistration,
  type UserSummary, type ReRegistrationRequest, type UserVisitStats,
} from '../../api/adminUserApi';
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

function roleBadgeClass(role: string): string {
  if (role === 'ADMIN')        return styles.adminBadge;
  if (role === 'MIDDLE_ADMIN') return styles.modBadge;
  return '';
}

export default function UserManagementPage() {
  const { isAdmin, isModerator, userId: myId } = useAuth();

  const [users, setUsers]               = useState<UserSummary[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState<UserSummary | null>(null);
  const [toast, setToast]               = useState('');

  const [currentPage, setCurrentPage]   = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [activeCount, setActiveCount]               = useState<number | null>(null);
  const [activeCountLoading, setActiveCountLoading] = useState(false);
  const [registeredCount, setRegisteredCount]       = useState<number | null>(null);

  const [visitStats, setVisitStats]               = useState<UserVisitStats | null>(null);
  const [visitStatsLoading, setVisitStatsLoading] = useState(false);

  // 재가입 대기자 모달
  const [showReRegModal, setShowReRegModal]     = useState(false);
  const [reRegRequests, setReRegRequests]       = useState<ReRegistrationRequest[]>([]);
  const [reRegLoading, setReRegLoading]         = useState(false);
  const [reRegProcessing, setReRegProcessing]   = useState<string | null>(null);

  // 편집 draft 상태
  const [draftNickname, setDraftNickname]         = useState('');
  const [draftRole, setDraftRole]                 = useState<'USER' | 'MIDDLE_ADMIN'>('USER');
  const [draftSuspended, setDraftSuspended]       = useState(false);
  const [saving, setSaving]                       = useState(false);
  const [deleting, setDeleting]                   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadActiveCount = useCallback(async () => {
    setActiveCountLoading(true);
    try {
      const [active, registered] = await Promise.all([
        fetchActiveUserCount(),
        fetchRegisteredUserCount(),
      ]);
      setActiveCount(active);
      setRegisteredCount(registered);
    } catch {
      // ignore
    } finally {
      setActiveCountLoading(false);
    }
  }, []);

  const loadVisitStats = useCallback(async () => {
    setVisitStatsLoading(true);
    try {
      setVisitStats(await fetchUserVisitStats());
    } catch {
      // ignore
    } finally {
      setVisitStatsLoading(false);
    }
  }, []);

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

  const loadReRegRequests = useCallback(async () => {
    setReRegLoading(true);
    try {
      setReRegRequests(await fetchReRegistrationRequests());
    } catch {
      showToast('재가입 대기자 목록을 불러오지 못했습니다.');
    } finally {
      setReRegLoading(false);
    }
  }, []);

  const handleReRegApprove = async (requestId: string) => {
    setReRegProcessing(requestId);
    try {
      await approveReRegistration(requestId);
      setReRegRequests(prev => prev.filter(r => r.requestId !== requestId));
      showToast('재가입이 승인되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? '처리 중 오류가 발생했습니다.');
    } finally {
      setReRegProcessing(null);
    }
  };

  const handleReRegReject = async (requestId: string) => {
    setReRegProcessing(requestId);
    try {
      await rejectReRegistration(requestId);
      setReRegRequests(prev => prev.filter(r => r.requestId !== requestId));
      showToast('재가입이 거절되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? '처리 중 오류가 발생했습니다.');
    } finally {
      setReRegProcessing(null);
    }
  };

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { loadActiveCount(); }, [loadActiveCount]);
  useEffect(() => { loadVisitStats(); }, [loadVisitStats]);

  // 선택된 사용자 바뀌면 draft 초기화
  useEffect(() => {
    if (selected) {
      setDraftNickname(selected.nickName ?? '');
      setDraftRole(selected.role === 'MIDDLE_ADMIN' ? 'MIDDLE_ADMIN' : 'USER');
      setDraftSuspended(selected.isSuspended);
      setShowDeleteConfirm(false);
    }
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPage = (page: number) => load(page);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return (
      (u.name ?? '').toLowerCase().includes(q) ||
      (u.nickName ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q)
    );
  });

  // 자기 자신은 정지 불가, 중간관리자는 USER만 정지 가능
  const canSuspend = (target: UserSummary): boolean => {
    if (target.id === myId) return false;
    if (isAdmin) return true;
    if (isModerator) return target.role === 'USER';
    return false;
  };

  // 조치 섹션을 보여줄지 여부
  const showActionSection = (target: UserSummary): boolean => {
    if (target.deletedAt) return false;
    if (target.id === myId) return false;
    if (target.role === 'ADMIN') return false;
    return canSuspend(target) || isAdmin;
  };

  // 닉네임·역할·정지 일괄 적용
  const handleApply = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const tasks: Promise<void>[] = [];
      const trimmed = draftNickname.trim();

      if (isAdmin && trimmed && trimmed !== (selected.nickName ?? '')) {
        tasks.push(updateNickname(selected.id, trimmed));
      }
      if (isAdmin && selected.role !== 'ADMIN' && draftRole !== selected.role) {
        tasks.push(setRole(selected.id, draftRole));
      }
      if (canSuspend(selected) && draftSuspended !== selected.isSuspended) {
        tasks.push(setSuspended(selected.id, draftSuspended));
      }

      if (tasks.length === 0) {
        showToast('변경된 내용이 없습니다.');
        return;
      }
      await Promise.all(tasks);

      const updated: UserSummary = {
        ...selected,
        nickName: isAdmin && trimmed && trimmed !== (selected.nickName ?? '') ? trimmed : selected.nickName,
        role: isAdmin && selected.role !== 'ADMIN' ? draftRole : selected.role,
        isSuspended: canSuspend(selected) ? draftSuspended : selected.isSuspended,
      };
      setSelected(updated);
      setUsers(prev => prev.map(u => u.id === selected.id ? updated : u));
      showToast('변경사항이 적용되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? '처리 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 강제 탈퇴
  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteUser(selected.id);
      const updated = { ...selected, deletedAt: new Date().toISOString() };
      setSelected(updated);
      setUsers(prev => prev.map(u => u.id === selected.id ? updated : u));
      setShowDeleteConfirm(false);
      showToast('탈퇴 처리가 완료되었습니다.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg ?? '처리 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
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
        <div className={styles.headerActions}>
          {isAdmin && (
            <button
              className={styles.reRegBtn}
              onClick={() => { setShowReRegModal(true); loadReRegRequests(); }}
            >
              재가입 대기자 목록
            </button>
          )}
          <div className={styles.activeCountBox}>
            <span className={styles.activeCountLabel}>현재 접속 중</span>
            <span className={styles.activeCountValue}>
              {activeCountLoading ? '...' : `${activeCount ?? '-'}명`}
            </span>
            <button
              className={styles.refreshBtn}
              onClick={loadActiveCount}
              disabled={activeCountLoading}
              title="새로고침"
            >
              ↺
            </button>
          </div>
          <div className={styles.activeCountBox}>
            <span className={styles.activeCountLabel}>총 가입자</span>
            <span className={styles.activeCountValue}>
              {activeCountLoading ? '...' : `${registeredCount ?? '-'}명`}
            </span>
          </div>
          <div className={styles.activeCountBox}>
            <span className={styles.activeCountLabel}>일일 사용자(DAU)</span>
            <span className={styles.activeCountValue}>
              {visitStatsLoading ? '...' : `${visitStats?.dailyActiveUsers ?? '-'}명`}
            </span>
          </div>
          <div className={styles.activeCountBox}>
            <span className={styles.activeCountLabel}>월간 사용자(MAU)</span>
            <span className={styles.activeCountValue}>
              {visitStatsLoading ? '...' : `${visitStats?.monthlyActiveUsers ?? '-'}명`}
            </span>
          </div>
          <div className={styles.activeCountBox}>
            <span className={styles.activeCountLabel}>이번 달 재방문율</span>
            <span className={styles.activeCountValue}>
              {visitStatsLoading ? '...' : `${visitStats?.retentionRate.toFixed(1) ?? '-'}%`}
            </span>
            <button
              className={styles.refreshBtn}
              onClick={loadVisitStats}
              disabled={visitStatsLoading}
              title="새로고침"
            >
              ↺
            </button>
          </div>
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
        {/* ── 목록 패널 ── */}
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
                  const badge = roleBadgeClass(u.role);
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

        {/* ── 상세 패널 ── */}
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
                  <tr><th>이번 달 접속일수</th><td>{selected.monthlyVisitCount.toLocaleString()}일</td></tr>
                  <tr><th>누적 접속일수</th><td>{selected.totalVisitCount.toLocaleString()}일</td></tr>
                </tbody>
              </table>

              {/* ── 조치 섹션 (정지·닉네임·역할·탈퇴) ── */}
              {showActionSection(selected) && (
                <div className={styles.adminSection}>
                  <p className={styles.adminSectionTitle}>관리자 조치</p>

                  {/* 활동정지 (draft) */}
                  {canSuspend(selected) && (
                    <div className={styles.adminField}>
                      <label className={styles.suspendLabel}>
                        <input
                          type="checkbox"
                          checked={draftSuspended}
                          onChange={e => setDraftSuspended(e.target.checked)}
                          className={styles.suspendCheck}
                        />
                        <span>활동정지</span>
                      </label>
                      <p className={styles.suspendHint}>
                        체크 시 해당 사용자는 로그인 및 서비스 이용이 차단됩니다.
                      </p>
                    </div>
                  )}

                  {/* 닉네임 수정 (ADMIN 전용) */}
                  {isAdmin && (
                    <div className={styles.adminField}>
                      <label className={styles.adminLabel}>닉네임 수정</label>
                      <input
                        className={styles.adminInput}
                        value={draftNickname}
                        onChange={e => setDraftNickname(e.target.value)}
                        placeholder="새 닉네임 입력 (2~20자)"
                        maxLength={20}
                      />
                    </div>
                  )}

                  {/* 권한 변경 (ADMIN 전용) */}
                  {isAdmin && (
                    <div className={styles.adminField}>
                      <label className={styles.adminLabel}>권한</label>
                      <select
                        className={styles.adminSelect}
                        value={draftRole}
                        onChange={e => setDraftRole(e.target.value as 'USER' | 'MIDDLE_ADMIN')}
                      >
                        <option value="USER">일반 사용자</option>
                        <option value="MIDDLE_ADMIN">중간관리자</option>
                      </select>
                    </div>
                  )}

                  <button
                    className={styles.applyBtn}
                    onClick={handleApply}
                    disabled={saving}
                  >
                    {saving ? '적용 중...' : '적용'}
                  </button>

                  {/* 탈퇴 처리 (ADMIN 전용) */}
                  {isAdmin && (
                    <>
                      <div className={styles.adminDivider} />
                      {!showDeleteConfirm ? (
                        <button
                          className={styles.deleteBtn}
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          탈퇴 처리
                        </button>
                      ) : (
                        <div className={styles.deleteConfirm}>
                          <p className={styles.deleteConfirmText}>
                            정말 탈퇴 처리하시겠습니까?<br />
                            <span>이 작업은 되돌릴 수 없습니다.</span>
                          </p>
                          <div className={styles.deleteConfirmBtns}>
                            <button
                              className={styles.deleteConfirmYes}
                              onClick={handleDelete}
                              disabled={deleting}
                            >
                              {deleting ? '처리 중...' : '탈퇴 확인'}
                            </button>
                            <button
                              className={styles.deleteConfirmNo}
                              onClick={() => setShowDeleteConfirm(false)}
                              disabled={deleting}
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
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

      {/* ── 재가입 대기자 모달 ── */}
      {showReRegModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReRegModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>재가입 대기자 목록</h2>
              <button className={styles.modalClose} onClick={() => setShowReRegModal(false)}>✕</button>
            </div>

            {reRegLoading ? (
              <div className={styles.loading}><div className={styles.spinner} /></div>
            ) : reRegRequests.length === 0 ? (
              <p className={styles.empty}>대기 중인 재가입 요청이 없습니다.</p>
            ) : (
              <ul className={styles.reRegList}>
                {reRegRequests.map(r => (
                  <li key={r.requestId} className={styles.reRegItem}>
                    <div className={styles.reRegInfo}>
                      <span className={styles.reRegName}>{r.name ?? '(이름 없음)'}</span>
                      <span className={styles.reRegEmail}>{r.email ?? '—'}</span>
                      <span className={styles.reRegMeta}>{r.provider} · {formatDate(r.requestedAt)}</span>
                    </div>
                    <div className={styles.reRegActions}>
                      <button
                        className={styles.reRegApproveBtn}
                        onClick={() => handleReRegApprove(r.requestId)}
                        disabled={reRegProcessing === r.requestId}
                      >
                        {reRegProcessing === r.requestId ? '처리 중...' : '승인'}
                      </button>
                      <button
                        className={styles.reRegRejectBtn}
                        onClick={() => handleReRegReject(r.requestId)}
                        disabled={reRegProcessing === r.requestId}
                      >
                        거절
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
