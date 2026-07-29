import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyInfoApi, type UserInfoResponse } from '../api/authApi';
import { fetchBlockedUsers, unblockUser, type BlockedUser } from '../api/blockApi';
import styles from './MyPage.module.css';

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: '구글',
};

export default function MyPage() {
  const { nickname, logout, deleteAccount, setNickname } = useAuth();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserInfoResponse | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [newNick, setNewNick] = useState(nickname ?? '');
  const [nickError, setNickError] = useState('');
  const [nickLoading, setNickLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getMyInfoApi()
      .then((info) => setUserInfo(info))
      .catch(() => setInfoError(true))
      .finally(() => setInfoLoading(false));
  }, []);

  const displayNick = userInfo?.nickName ?? nickname ?? '';

  const cooldown = (() => {
    const changedAt = userInfo?.nicknameChangedAt;
    if (!changedAt) return { inCooldown: false, nextDate: null };
    const nextAvailable = new Date(new Date(changedAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    if (new Date() < nextAvailable) {
      const y = nextAvailable.getFullYear();
      const m = String(nextAvailable.getMonth() + 1).padStart(2, '0');
      const d = String(nextAvailable.getDate()).padStart(2, '0');
      return { inCooldown: true, nextDate: `${y}.${m}.${d}` };
    }
    return { inCooldown: false, nextDate: null };
  })();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNicknameSave = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const trimmed = newNick.trim();
    if (trimmed.length < 2) { setNickError('2자 이상 입력해 주세요.'); return; }
    if (trimmed.length > 20) { setNickError('20자 이하로 입력해 주세요.'); return; }
    setNickError('');
    setNickLoading(true);
    try {
      await setNickname(trimmed);
      setUserInfo((prev) => prev ? { ...prev, nickName: trimmed } : prev);
      setEditMode(false);
    } catch {
      setNickError('변경에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setNickLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteAccount();
      navigate('/');
    } catch {
      alert('탈퇴 처리에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        {/* 뒤로가기 */}
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>

        {/* 프로필 카드 */}
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            {displayNick ? displayNick.charAt(0).toUpperCase() : '?'}
          </div>

          {!editMode ? (
            <>
              <h2 className={styles.nickName}>{displayNick}</h2>
              <button
                className={styles.editBtn}
                onClick={() => { setNewNick(displayNick); setEditMode(true); }}
                disabled={cooldown.inCooldown}
              >
                닉네임 변경
              </button>
              {cooldown.inCooldown
                ? <p className={styles.nickNote}>{cooldown.nextDate}부터 변경 가능합니다</p>
                : <p className={styles.nickNote}>닉네임은 30일에 한 번 변경할 수 있습니다</p>
              }
            </>
          ) : (
            <form onSubmit={handleNicknameSave} className={styles.editForm}>
              <input
                className={styles.editInput}
                value={newNick}
                onChange={(e) => setNewNick(e.target.value)}
                maxLength={20}
                autoFocus
                placeholder="새 닉네임"
              />
              {nickError && <p className={styles.error}>{nickError}</p>}
              <div className={styles.editBtnRow}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditMode(false)}>취소</button>
                <button type="submit" className={styles.saveBtn} disabled={nickLoading}>
                  {nickLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 계정 정보 */}
        <div className={styles.infoCard}>
          <p className={styles.infoCardTitle}>계정 정보</p>
          {infoLoading ? (
            <div className={styles.infoLoading}>
              <div className={`${styles.skeletonRow} skeleton`} />
              <div className={`${styles.skeletonRow} skeleton`} />
              <div className={`${styles.skeletonRow} skeleton`} />
            </div>
          ) : userInfo ? (
            <>
              <InfoRow label="이름" value={userInfo.name || '없음'} />
              <InfoRow label="이메일" value={userInfo.email || '없음'} />
              <InfoRow label="로그인" value={PROVIDER_LABEL[userInfo.provider] ?? userInfo.provider} />
              <InfoRow label="출생연도" value={userInfo.birthyear || '없음'} />
              <InfoRow label="연령대" value={userInfo.age || '없음'} />
              <InfoRow label="포인트" value={`${userInfo.point.toLocaleString()} P`} highlight />
            </>
          ) : infoError ? (
            <p className={styles.infoError}>정보를 불러오지 못했습니다. 새로고침 해주세요.</p>
          ) : (
            <p className={styles.infoError}>정보를 불러오지 못했습니다.</p>
          )}
        </div>

        <BlockedUsersCard />

        {/* 메뉴 */}
        <div className={styles.menuSection}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <span>로그아웃</span>
            <span className={styles.menuArrow}>→</span>
          </button>
        </div>

        {/* 탈퇴 */}
        <div className={styles.dangerSection}>
          <p className={styles.dangerLabel}>계정 관리</p>
          <button
            className={styles.deleteBtn}
            onClick={() => setShowDeleteConfirm(true)}
          >
            회원 탈퇴
          </button>
        </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showDeleteConfirm && (
        <div className={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={styles.modalTitle}>정말 탈퇴하시겠어요?</h3>
            {/* 실제 동작(5일 유예 후 하드 삭제, 그 안에는 복구 가능)과 문구를 맞춘다. */}
            <p className={styles.modalDesc}>
              탈퇴하시면 작성하신 게시물·댓글이 모두 숨겨지고,
              <br />5일 뒤 계정과 개인정보가 완전히 삭제됩니다.
              <br />5일 안에 다시 로그인하시면 관리자 승인을 거쳐
              <br />계정을 복구할 수 있습니다.
            </p>
            <div className={styles.modalBtns}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                취소
              </button>
              <button
                className={styles.modalConfirm}
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 차단한 사용자 목록·해제.
 *
 * 차단은 게시판의 게시글·댓글에서 걸고 해제는 여기서만 한다. 앱(app-flutter)의
 * 마이페이지 > 차단한 사용자 화면과 같은 역할이며 같은 엔드포인트를 쓴다.
 */
function BlockedUsersCard() {
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // 해제 요청 중인 사용자 — 같은 줄을 두 번 누르는 것을 막는다.
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchBlockedUsers()
      .then(setUsers)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (user: BlockedUser) => {
    const ok = window.confirm(
      `${user.nickname} 님의 차단을 해제하시겠습니까?\n` +
      '이 사용자의 게시글과 댓글이 다시 보이게 됩니다.',
    );
    if (!ok) return;
    setBusyId(user.userId);
    try {
      await unblockUser(user.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId));
    } catch {
      alert('차단 해제에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={styles.infoCard}>
      <p className={styles.infoCardTitle}>차단한 사용자</p>
      {loading ? (
        <div className={styles.infoLoading}>
          <div className={`${styles.skeletonRow} skeleton`} />
        </div>
      ) : error ? (
        <p className={styles.infoError}>차단 목록을 불러오지 못했습니다. 새로고침 해주세요.</p>
      ) : users.length === 0 ? (
        <p className={styles.blockedEmpty}>
          차단한 사용자가 없습니다. 게시글이나 댓글의 차단 버튼으로 차단할 수 있습니다.
        </p>
      ) : (
        users.map((user) => (
          <div key={user.userId} className={styles.blockedRow}>
            <div className={styles.blockedInfo}>
              <span className={styles.blockedNick}>{user.nickname}</span>
              <span className={styles.blockedDate}>
                {new Date(user.blockedAt).toLocaleDateString('ko-KR')} 차단
              </span>
            </div>
            <button
              className={styles.unblockBtn}
              onClick={() => handleUnblock(user)}
              disabled={busyId === user.userId}
            >
              해제
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${highlight ? styles.infoValueHighlight : ''}`}>{value}</span>
    </div>
  );
}
