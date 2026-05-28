import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchPublicFishingPointsForMap,
  analyzeFishingPoint,
  type FishingPointMapMarker,
  type FishingAnalysisResult,
  type SpeciesAnalysis,
} from '../api/fishingPointApi';
import styles from './MapPage.module.css';

function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [selectedPoint, setSelectedPoint] = useState<FishingPointMapMarker | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FishingAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState('');
  const analysisAbortRef = useRef({ cancelled: false });

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    Promise.all([
      loadKakaoSDK(appKey),
      fetchPublicFishingPointsForMap().catch(() => [] as FishingPointMapMarker[]),
    ])
      .then(([, fishingPoints]) => {
        if (cancelled || !mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 13,
          });

          const clusterer = new kakao.maps.MarkerClusterer({
            map,
            averageCenter: true,
            minLevel: 10,
          });

          const markers = fishingPoints.map((fp: FishingPointMapMarker) => {
            const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
            const marker = new kakao.maps.Marker({ position });

            const infoWindow = new kakao.maps.InfoWindow({
              content: `
                <div style="padding:8px 12px;min-width:140px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:8px;">
                  <strong style="font-size:13px;color:#0B3D91">${escapeHtml(fp.name)}</strong>
                  <p style="margin:3px 0 0;font-size:11px;color:#64748B">클릭하여 조황 분석 보기</p>
                </div>`,
              removable: true,
            });

            kakao.maps.event.addListener(marker, 'click', () => {
              infoWindow.open(map, marker);

              analysisAbortRef.current.cancelled = true;
              analysisAbortRef.current = { cancelled: false };
              const abort = analysisAbortRef.current;

              setSelectedPoint(fp);
              setIsAnalyzing(true);
              setAnalysisResult(null);
              setAnalysisError('');

              analyzeFishingPoint(fp.id)
                .then((r) => { if (!abort.cancelled) setAnalysisResult(r); })
                .catch((err) => {
                  if (!abort.cancelled)
                    setAnalysisError(err?.response?.data?.message ?? '분석 중 오류가 발생했습니다.');
                })
                .finally(() => { if (!abort.cancelled) setIsAnalyzing(false); });
            });

            return marker;
          });

          clusterer.addMarkers(markers);
          setStatus('ready');
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
      analysisAbortRef.current.cancelled = true;
    };
  }, [navigate]);

  const closePanel = () => {
    analysisAbortRef.current.cancelled = true;
    setSelectedPoint(null);
    setAnalysisResult(null);
    setAnalysisError('');
    setIsAnalyzing(false);
  };

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>
        <h1 className={styles.title}>낚시 포인트 지도</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        📍 마커를 클릭하면 포인트별 AI 조황 분석을 확인할 수 있습니다
      </p>

      {status !== 'ready' && (
        <div className={styles.overlay}>
          {status === 'loading' ? (
            <>
              <div className={styles.spinner} />
              <p>지도를 불러오는 중...</p>
            </>
          ) : (
            <>
              <p className={styles.errorText}>⚠️ {errorMsg}</p>
              <button className={styles.retryBtn} onClick={() => window.close()}>
                창 닫기
              </button>
            </>
          )}
        </div>
      )}

      <div className={styles.mapContainer}>
        <div ref={mapRef} className={styles.map} />

        {selectedPoint && (
          <aside className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelPointName}>{selectedPoint.name}</span>
              <button className={styles.panelClose} onClick={closePanel} aria-label="패널 닫기">✕</button>
            </div>
            <div className={styles.panelBody}>
              {isAnalyzing ? (
                <div className={styles.panelLoading}>
                  <div className={styles.panelSpinner} />
                  <p>AI 조황 분석 중...</p>
                </div>
              ) : analysisError ? (
                <p className={styles.panelError}>⚠️ {analysisError}</p>
              ) : analysisResult ? (
                <AnalysisView result={analysisResult} />
              ) : null}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function AnalysisView({ result }: { result: FishingAnalysisResult }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <div className={styles.condGrid}>
        <CondBadge label="수온" value={result.waterTemp != null ? `${result.waterTemp}℃` : '—'} />
        <CondBadge label="파고" value={result.waveHeight != null ? `${result.waveHeight}m` : '—'} />
        <CondBadge label="풍속" value={result.windSpeed != null ? `${result.windSpeed}m/s` : '—'} />
        <CondBadge label="물때" value={result.tideDescription ?? '—'} />
      </div>

      {result.outingStatus !== 'SAFE' && result.outingWarning && (
        <div className={`${styles.outingBanner} ${result.outingStatus === 'IMPOSSIBLE' ? styles.outingImpossible : styles.outingCaution}`}>
          {result.outingStatus === 'IMPOSSIBLE' ? '⛔' : '⚠️'} {result.outingWarning}
        </div>
      )}

      {result.results ? (
        <>
          <p className={styles.sectionLabel}>어종별 조황 기대도</p>
          <div className={styles.fishList}>
            {result.results.map((r: SpeciesAnalysis) => (
              <div key={r.species} className={styles.fishItem}>
                <div className={styles.fishItemTop}>
                  <span className={styles.fishName}>{r.species}</span>
                  <span className={styles.fishScore}>{r.score}점</span>
                </div>
                <div className={styles.fishBarBg}>
                  <div className={styles.fishBarFill} style={{ width: `${r.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <p className={styles.sectionLabel}>AI 분석 이유</p>
          <div className={styles.reasonList}>
            {result.results.map((r: SpeciesAnalysis) => (
              <button
                key={r.species}
                className={`${styles.reasonItem} ${expanded === r.species ? styles.reasonItemOpen : ''}`}
                onClick={() => setExpanded(expanded === r.species ? null : r.species)}
              >
                <div className={styles.reasonItemHeader}>
                  <span className={styles.reasonSpecies}>{r.species}</span>
                  <span className={styles.reasonToggle}>{expanded === r.species ? '▲' : '▼'}</span>
                </div>
                {expanded === r.species && (
                  <p className={styles.reasonText}>{r.reason}</p>
                )}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.impossibleBox}>
          <p>⛔ 출조 불가 조건 — 어종 점수 분석이 제공되지 않습니다.</p>
        </div>
      )}
    </>
  );
}

function CondBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.condBadge}>
      <span className={styles.condLabel}>{label}</span>
      <span className={styles.condValue}>{value}</span>
    </div>
  );
}
