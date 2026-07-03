import { useState, useEffect } from 'react';
import { createReport, REPORT_REASON_KEYS, REPORT_REASON_LABELS, type PostType } from '../../api/reportApi';
import styles from './ReportModal.module.css';

interface Props {
  postId: string;
  postType: PostType;
  postTitle: string;
  parentPostId?: string | null;
  onClose: () => void;
}

export default function ReportModal({ postId, postType, postTitle, parentPostId, onClose }: Props) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState('');
  const [customChecked, setCustomChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggleReason = (key: string) => {
    setSelectedReasons(prev =>
      prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    const reasons = [...selectedReasons];
    const hasCustom = customChecked && customReason.trim().length > 0;
    if (reasons.length === 0 && !hasCustom) {
      setError('신고 사유를 하나 이상 선택하거나 직접 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await createReport(postType, postId, postTitle, reasons, hasCustom ? customReason.trim() : undefined, parentPostId);
      setDone(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? '신고 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>신고하기</h3>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div className={styles.doneWrap}>
            <div className={styles.doneIcon}>✅</div>
            <p className={styles.doneMsg}>신고가 접수되었습니다.<br />관리자가 검토 후 조치하겠습니다.</p>
            <button className={styles.submitBtn} onClick={onClose}>확인</button>
          </div>
        ) : (
          <>
            <p className={styles.desc}>신고 사유를 선택해 주세요. (복수 선택 가능)</p>

            <div className={styles.reasonList}>
              {REPORT_REASON_KEYS.map(key => (
                <label key={key} className={styles.reasonItem}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={selectedReasons.includes(key)}
                    onChange={() => toggleReason(key)}
                  />
                  <span className={styles.reasonLabel}>{REPORT_REASON_LABELS[key]}</span>
                </label>
              ))}

              <label className={styles.reasonItem}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={customChecked}
                  onChange={e => setCustomChecked(e.target.checked)}
                />
                <span className={styles.reasonLabel}>직접 입력</span>
              </label>
              {customChecked && (
                <textarea
                  className={styles.customInput}
                  placeholder="신고 내용을 직접 입력해 주세요."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              )}
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={submitting}>취소</button>
              <button className={styles.submitBtn} onClick={handleSubmit} disabled={submitting}>
                {submitting ? '신고 중...' : '신고하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
