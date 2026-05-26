import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type DocumentInfo,
  getDocuments,
  uploadDocument,
  deleteDocument,
} from '../../api/documentApi';
import styles from './DocumentManagementPage.module.css';

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export default function DocumentManagementPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadError, setUploadError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<DocumentInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await getDocuments());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // ── 파일 선택 ──────────────────────────────────────────────────────────────

  const validateAndSet = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    setUploadStatus('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSet(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  // ── 업로드 ─────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus('uploading');
    setUploadError('');
    try {
      await uploadDocument(selectedFile);
      setUploadStatus('done');
      setSelectedFile(null);
      showToast('문서가 업로드되었습니다.');
      load();
    } catch {
      setUploadStatus('error');
      setUploadError('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  // ── 삭제 ──────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      showToast('문서가 삭제되었습니다.');
      load();
    } catch {
      showToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // ── 날짜 포맷 ──────────────────────────────────────────────────────────────

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const current = documents[0] ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>RAG 문서 관리</h1>
        <p className={styles.pageSubtitle}>
          낚시 조황 예측에 사용할 PDF 문서를 관리합니다. 문서는 1개만 유지됩니다.
        </p>
      </div>

      {/* ── 현재 문서 ─────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>현재 문서</h2>
        {loading ? (
          <div className={styles.loadingBox}><div className={styles.spinner} /></div>
        ) : current ? (
          <div className={styles.currentDoc}>
            <div className={styles.docIcon}>📄</div>
            <div className={styles.docInfo}>
              <p className={styles.docName}>{current.fileName}</p>
              <p className={styles.docMeta}>등록일: {formatDate(current.createdAt)}</p>
            </div>
            <button
              className={styles.deleteDocBtn}
              onClick={() => setDeleteTarget(current)}
            >
              삭제
            </button>
          </div>
        ) : (
          <div className={styles.emptyDoc}>
            <span className={styles.emptyIcon}>📭</span>
            <p>등록된 문서가 없습니다.</p>
          </div>
        )}
      </section>

      {/* ── 업로드 ────────────────────────────────────────────── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>문서 업로드</h2>

        {current && (
          <div className={styles.replaceWarning}>
            ⚠️ 새 문서를 업로드하면 기존 문서와 임베딩이 모두 삭제됩니다.
          </div>
        )}

        {/* 드래그 앤 드롭 영역 */}
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ''} ${selectedFile ? styles.fileSelected : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className={styles.hiddenInput}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <div className={styles.selectedFile}>
              <span className={styles.fileIcon}>📋</span>
              <div>
                <p className={styles.fileName}>{selectedFile.name}</p>
                <p className={styles.fileSize}>{formatSize(selectedFile.size)}</p>
              </div>
              <button
                className={styles.clearFile}
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setUploadStatus('idle'); }}
              >
                ✕
              </button>
            </div>
          ) : (
            <div className={styles.dropzoneInner}>
              <span className={styles.dropIcon}>📁</span>
              <p className={styles.dropText}>PDF 파일을 여기에 드래그하거나 클릭해서 선택</p>
              <p className={styles.dropHint}>PDF 파일만 지원합니다</p>
            </div>
          )}
        </div>

        {uploadError && <p className={styles.errorMsg}>{uploadError}</p>}

        {selectedFile && (
          <button
            className={`${styles.uploadBtn} ${uploadStatus === 'uploading' ? styles.uploading : ''}`}
            onClick={handleUpload}
            disabled={uploadStatus === 'uploading'}
          >
            {uploadStatus === 'uploading' ? (
              <>
                <span className={styles.btnSpinner} />
                처리 중... (임베딩 생성 중)
              </>
            ) : (
              '업로드'
            )}
          </button>
        )}

        {uploadStatus === 'uploading' && (
          <p className={styles.uploadingHint}>
            PDF 텍스트 추출 및 벡터 임베딩 생성 중입니다. 잠시 기다려 주세요.
          </p>
        )}
      </section>

      {/* ── 삭제 확인 다이얼로그 ──────────────────────────────── */}
      {deleteTarget && (
        <div className={styles.dialogOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>문서 삭제</h3>
            <p className={styles.dialogBody}>
              <strong>{deleteTarget.fileName}</strong> 을 삭제합니다.<br />
              연결된 모든 청크 및 임베딩도 함께 삭제되며 되돌릴 수 없습니다.
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
