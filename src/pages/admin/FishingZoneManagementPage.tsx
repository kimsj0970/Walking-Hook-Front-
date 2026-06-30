import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchAdminFishingZones, createFishingZone, deleteFishingZone,
  type FishingZone, type ZoneType,
} from '../../api/fishingZoneApi';
import { fetchPublicFishingPointsForMap, type FishingPointMapMarker } from '../../api/fishingPointApi';
import styles from './FishingZoneManagementPage.module.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KakaoMap = any;

type DrawMode = 'none' | 'rect' | 'polygon';
type Coord = { lat: number; lng: number };

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

function coordsToKakaoPath(kakao: KakaoMap, coords: Coord[]) {
  return coords.map(c => new kakao.maps.LatLng(c.lat, c.lng));
}

function coordsToGeoJson(coords: Coord[]): string {
  const ring = [...coords, coords[0]].map(c => [c.lng, c.lat]);
  return JSON.stringify({ type: 'Polygon', coordinates: [ring] });
}

function geoJsonToCoords(geoJson: string): Coord[] {
  try {
    const parsed = JSON.parse(geoJson);
    const ring: [number, number][] = parsed.coordinates[0];
    return ring.slice(0, -1).map(([lng, lat]) => ({ lat, lng }));
  } catch {
    return [];
  }
}

function zoneColor(zoneType: ZoneType) {
  return zoneType === 'PROHIBITED' ? '#DC2626' : '#EA580C';
}

export default function FishingZoneManagementPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<KakaoMap>(null);
  const zonePolysRef = useRef<KakaoMap[]>([]);
  const previewPolyRef = useRef<KakaoMap>(null);
  const vertexMarkersRef = useRef<KakaoMap[]>([]);
  const clickListenerRef = useRef<KakaoMap>(null);
  const moveListenerRef = useRef<KakaoMap>(null);

  const drawModeRef = useRef<DrawMode>('none');
  const rectFirstRef = useRef<Coord | null>(null);
  const polyPathRef = useRef<Coord[]>([]);

  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [mapStatus, setMapStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [zones, setZones] = useState<FishingZone[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [drawnCoords, setDrawnCoords] = useState<Coord[]>([]);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<ZoneType>('PROHIBITED');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadZones = useCallback(async () => {
    const list = await fetchAdminFishingZones().catch(() => []);
    setZones(list);
  }, []);

  // ── 기존 구역 폴리곤 렌더링 ────────────────────────────────────────
  useEffect(() => {
    const kakao = (window as any).kakao; // eslint-disable-line
    if (!kakao?.maps || !kakaoMapRef.current) return;

    // 기존 폴리곤 제거
    zonePolysRef.current.forEach(p => p.setMap(null));
    zonePolysRef.current = [];

    zones.forEach(zone => {
      if (!zone.active) return;
      const coords = geoJsonToCoords(zone.geoJson);
      if (coords.length < 3) return;
      const color = zoneColor(zone.zoneType);
      const poly = new kakao.maps.Polygon({
        map: kakaoMapRef.current,
        path: coordsToKakaoPath(kakao, coords),
        strokeWeight: 2,
        strokeColor: color,
        strokeOpacity: 0.9,
        fillColor: color,
        fillOpacity: 0.2,
      });
      const infoWindow = new kakao.maps.InfoWindow({
        content: `
          <div style="padding:12px 16px;min-width:200px;font-family:'Pretendard','Noto Sans KR',sans-serif;border-radius:10px;">
            <strong style="font-size:14px;color:${color};">${escapeHtml(zone.name)}</strong>
            <div style="font-size:11px;color:#94A3B8;margin:3px 0 6px;">${zone.zoneType === 'PROHIBITED' ? '낚시금지구역' : '낚시제한구역'}</div>
            ${zone.description ? `<p style="font-size:12px;color:#334155;margin:0 0 10px;line-height:1.5;">${escapeHtml(zone.description)}</p>` : ''}
            <button id="del-${zone.id}" style="padding:5px 12px;background:#FEE2E2;color:#DC2626;border:1px solid #FCA5A5;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">삭제</button>
          </div>`,
        removable: true,
      });
      kakao.maps.event.addListener(poly, 'click', (e: KakaoMap) => {
        infoWindow.setPosition(e.latLng);
        infoWindow.open(kakaoMapRef.current);
        // 삭제 버튼 이벤트 (InfoWindow DOM이 삽입된 후)
        setTimeout(() => {
          const btn = document.getElementById(`del-${zone.id}`);
          if (btn) {
            btn.onclick = async () => {
              if (!confirm(`"${zone.name}" 구역을 삭제하시겠습니까?`)) return;
              await deleteFishingZone(zone.id);
              infoWindow.close();
              loadZones();
            };
          }
        }, 100);
      });
      zonePolysRef.current.push(poly);
    });
  }, [zones, loadZones]);

  // ── 지도 초기화 ────────────────────────────────────────────────────
  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) { setErrorMsg('VITE_KAKAO_MAP_KEY 환경변수를 설정해주세요.'); setMapStatus('error'); return; }

    let cancelled = false;

    Promise.all([
      loadKakaoSDK(appKey),
      fetchPublicFishingPointsForMap().catch(() => [] as FishingPointMapMarker[]),
      fetchAdminFishingZones().catch(() => [] as FishingZone[]),
    ]).then(([, fishingPoints, initialZones]) => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.5, 127.8),
          level: 13,
        });
        kakaoMapRef.current = map;

        // 낚시 포인트 마커 (파란색)
        fishingPoints.forEach((fp: FishingPointMapMarker) => {
          const marker = new kakao.maps.Marker({
            position: new kakao.maps.LatLng(fp.latitude, fp.longitude),
            map,
          });
          const iw = new kakao.maps.InfoWindow({
            content: `<div style="padding:8px 12px;font-size:13px;font-weight:700;color:#0B3D91;">${escapeHtml(fp.name)}</div>`,
            removable: true,
          });
          kakao.maps.event.addListener(marker, 'click', () => iw.open(map, marker));
        });

        setZones(initialZones);
        setMapStatus('ready');

        // ── 클릭 이벤트 (드로잉) ──────────────────────────────────
        clickListenerRef.current = kakao.maps.event.addListener(map, 'click', (e: KakaoMap) => {
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          const mode = drawModeRef.current;

          if (mode === 'rect') {
            if (!rectFirstRef.current) {
              rectFirstRef.current = { lat, lng };
              // 첫 클릭 마커
              const dot = new kakao.maps.Marker({ position: e.latLng, map });
              vertexMarkersRef.current.push(dot);
            } else {
              const first = rectFirstRef.current;
              const coords: Coord[] = [
                { lat: first.lat, lng: first.lng },
                { lat: first.lat, lng },
                { lat, lng },
                { lat, lng: first.lng },
              ];
              clearDrawing(kakao);
              drawModeRef.current = 'none';
              setDrawMode('none');
              setDrawnCoords(coords);
              setShowForm(true);
            }
          } else if (mode === 'polygon') {
            const path = [...polyPathRef.current, { lat, lng }];
            polyPathRef.current = path;
            const dot = new kakao.maps.Marker({ position: e.latLng, map });
            vertexMarkersRef.current.push(dot);
            // 실시간 미리보기 업데이트
            if (previewPolyRef.current) previewPolyRef.current.setMap(null);
            if (path.length >= 2) {
              previewPolyRef.current = new kakao.maps.Polygon({
                map,
                path: coordsToKakaoPath(kakao, path),
                strokeWeight: 2,
                strokeColor: '#0B3D91',
                strokeOpacity: 0.8,
                strokeStyle: 'dashed',
                fillColor: '#0B3D91',
                fillOpacity: 0.1,
              });
            }
          }
        });

        // ── 마우스무브 (사각형 미리보기) ───────────────────────────
        moveListenerRef.current = kakao.maps.event.addListener(map, 'mousemove', (e: KakaoMap) => {
          if (drawModeRef.current !== 'rect' || !rectFirstRef.current) return;
          const first = rectFirstRef.current;
          const lat = e.latLng.getLat();
          const lng = e.latLng.getLng();
          const previewCoords: Coord[] = [
            { lat: first.lat, lng: first.lng },
            { lat: first.lat, lng },
            { lat, lng },
            { lat, lng: first.lng },
          ];
          if (previewPolyRef.current) previewPolyRef.current.setMap(null);
          previewPolyRef.current = new kakao.maps.Polygon({
            map,
            path: coordsToKakaoPath(kakao, previewCoords),
            strokeWeight: 2,
            strokeColor: '#0B3D91',
            strokeOpacity: 0.8,
            strokeStyle: 'dashed',
            fillColor: '#0B3D91',
            fillOpacity: 0.1,
          });
        });
      });
    }).catch((err: Error) => {
      if (cancelled) return;
      setErrorMsg(err.message);
      setMapStatus('error');
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 드로잉 정리 헬퍼 ──────────────────────────────────────────────
  function clearDrawing(kakao: KakaoMap) {
    if (previewPolyRef.current) { previewPolyRef.current.setMap(null); previewPolyRef.current = null; }
    vertexMarkersRef.current.forEach(m => m.setMap(null));
    vertexMarkersRef.current = [];
    rectFirstRef.current = null;
    polyPathRef.current = [];
    if (kakao) {
      // cursor 복원
      const mapEl = mapRef.current;
      if (mapEl) mapEl.style.cursor = '';
    }
  }

  // ── 드로잉 모드 전환 ──────────────────────────────────────────────
  function startDraw(mode: DrawMode) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearDrawing((window as any).kakao);
    drawModeRef.current = mode;
    setDrawMode(mode);
    if (mapRef.current) mapRef.current.style.cursor = 'crosshair';
  }

  function cancelDraw() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearDrawing((window as any).kakao);
    drawModeRef.current = 'none';
    setDrawMode('none');
  }

  function finishPolygon() {
    if (polyPathRef.current.length < 3) return;
    const coords = [...polyPathRef.current];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clearDrawing((window as any).kakao);
    drawModeRef.current = 'none';
    setDrawMode('none');
    setDrawnCoords(coords);
    setShowForm(true);
  }

  // ── 저장 ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      await createFishingZone({
        name: formName.trim(),
        zoneType: formType,
        geoJson: coordsToGeoJson(drawnCoords),
        description: formDesc.trim(),
      });
      setShowForm(false);
      setFormName(''); setFormDesc(''); setFormType('PROHIBITED');
      setDrawnCoords([]);
      await loadZones();
    } finally {
      setSaving(false);
    }
  }

  function handleFormCancel() {
    setShowForm(false);
    setFormName(''); setFormDesc(''); setFormType('PROHIBITED');
    setDrawnCoords([]);
  }

  const hintText =
    drawMode === 'rect'
      ? rectFirstRef.current
        ? '두 번째 꼭짓점을 클릭하면 사각형이 완성됩니다'
        : '지도를 클릭해 첫 번째 꼭짓점을 선택하세요'
      : drawMode === 'polygon'
      ? '클릭으로 꼭짓점 추가, 3개 이상 찍은 후 "완료" 버튼을 누르세요'
      : '그리기 버튼을 눌러 구역을 지정하세요';

  return (
    <div className={styles.wrap}>
      {/* 상단 컨트롤 바 */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>낚시 금지구역 관리</span>

        <button
          className={`${styles.btnDraw} ${drawMode === 'rect' ? styles.active : ''}`}
          onClick={() => drawMode === 'rect' ? cancelDraw() : startDraw('rect')}
        >
          ⬛ 사각형 그리기
        </button>

        <button
          className={`${styles.btnDraw} ${drawMode === 'polygon' ? styles.active : ''}`}
          onClick={() => drawMode === 'polygon' ? cancelDraw() : startDraw('polygon')}
        >
          ✏️ 자유 그리기
        </button>

        {drawMode === 'polygon' && (
          <button className={styles.btnDraw} onClick={finishPolygon}>
            ✅ 완료
          </button>
        )}

        {drawMode !== 'none' && (
          <button className={styles.btnCancel} onClick={cancelDraw}>취소</button>
        )}

        <span className={styles.hint}>{hintText}</span>
      </div>

      {/* 범례 */}
      <div className={styles.legend}>
        <span className={styles.legendRed}>■ 낚시금지구역</span>
        <span className={styles.legendOrange}>■ 낚시제한구역</span>
        <span className={styles.legendBlue}>● 낚시 포인트</span>
      </div>

      {/* 로딩/에러 */}
      {mapStatus !== 'ready' && (
        <div className={styles.overlay}>
          {mapStatus === 'loading'
            ? <><div className={styles.spinner} /><p>지도를 불러오는 중...</p></>
            : <p className={styles.errorText}>⚠️ {errorMsg}</p>}
        </div>
      )}

      {/* 저장 폼 */}
      {showForm && (
        <div className={styles.formOverlay}>
          <div className={styles.formPanel}>
            <h2 className={styles.formTitle}>구역 정보 입력</h2>

            <div className={styles.formField}>
              <label className={styles.formLabel}>구역 이름 *</label>
              <input
                className={styles.formInput}
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="예: 한강 산란기 금지구역"
                maxLength={100}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>구역 종류 *</label>
              <select
                className={styles.formSelect}
                value={formType}
                onChange={e => setFormType(e.target.value as ZoneType)}
              >
                <option value="PROHIBITED">🔴 낚시금지구역</option>
                <option value="RESTRICTED">🟠 낚시제한구역</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>설명 (금지·제한 사유)</label>
              <textarea
                className={styles.formTextarea}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="예: 매년 4~6월 산란기 동안 낚시 금지. 수산자원관리법 제14조 근거."
                maxLength={2000}
              />
            </div>

            <div className={styles.formActions}>
              <button className={styles.btnFormCancel} onClick={handleFormCancel}>취소</button>
              <button className={styles.btnSave} onClick={handleSave} disabled={!formName.trim() || saving}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
