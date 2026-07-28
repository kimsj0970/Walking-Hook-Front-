import { useEffect, useRef, useState } from 'react';
import MapTypeControl from './MapTypeControl';
import type { MigratoryFishPointMapMarker } from '../../api/migratoryFishPointApi';
import styles from './MigratoryPointMapPicker.module.css';

/**
 * 조황 포인트를 지도에서 하나 고르는 모달.
 *
 * 원래 CatchPostPage 안의 지역 컴포넌트였고, 관리자 "지도로 보기"에서도 쓰려고 추출했다.
 * 기본 동작(핀 클릭 → "이 포인트 선택" → onSelect)은 그대로다. 호출하는 쪽마다 다른 것은
 * title/hint/selectLabel 과 onSelect 뿐이며, 이 컴포넌트는 무엇을 하는지 알지 못한다.
 */
interface MapPickerProps {
  points: MigratoryFishPointMapMarker[];
  onSelect: (point: MigratoryFishPointMapMarker) => void;
  onClose: () => void;
  emptyMessage?: string;
  /** 모달 제목 (기본: 지도에서 포인트 선택) */
  title?: string;
  /** 지도 위 안내 문구 */
  hint?: string;
  /** 핀 말풍선의 버튼 문구 (기본: 이 포인트 선택) */
  selectLabel?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=clusterer`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 로드 실패'));
    document.head.appendChild(script);
  });
}

export default function MigratoryPointMapPicker({
  points,
  onSelect,
  onClose,
  emptyMessage,
  title = '지도에서 포인트 선택',
  hint = '마커를 탭하면 이름이 뜨고, "이 포인트 선택"을 누르면 선택됩니다',
  selectLabel = '이 포인트 선택',
}: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapForControl, setMapForControl] = useState<any>(null);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  const selectLabelRef = useRef(selectLabel);
  useEffect(() => { selectLabelRef.current = selectLabel; }, [selectLabel]);

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) { setMapStatus('error'); return; }

    let cancelled = false;

    loadKakaoSDK(appKey).then(() => {
      if (cancelled || !mapRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao;
      kakao.maps.load(() => {
        if (cancelled || !mapRef.current) return;

        const map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(36.0, 127.8),
          level: 13,
        });
        setMapForControl(map);

        // 모달이 막 열리는 시점엔 flex 레이아웃(.mapPickerMap { flex: 1 })이
        // 아직 확정되지 않아 지도 타일이 실제 크기보다 작게 잡히는 문제가 있어 보정한다.
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(map.getCenter());
        });

        const hoverInfoWindow = new kakao.maps.InfoWindow({ removable: false });

        const markers = points.map((fp) => {
          const position = new kakao.maps.LatLng(fp.latitude, fp.longitude);
          const marker = new kakao.maps.Marker({ position });

          kakao.maps.event.addListener(marker, 'mouseover', () => {
            hoverInfoWindow.setContent(
              `<div style="padding:5px 12px;font-family:'Pretendard','Noto Sans KR',sans-serif;font-size:13px;font-weight:700;color:#0B3D91;white-space:nowrap;">📍 ${escapeHtml(fp.name)}</div>`
            );
            hoverInfoWindow.open(map, marker);
          });

          kakao.maps.event.addListener(marker, 'mouseout', () => {
            hoverInfoWindow.close();
          });

          const pickInfoWindow = new kakao.maps.InfoWindow({
            content: `
              <div style="padding:10px 14px;font-family:'Pretendard','Noto Sans KR',sans-serif;text-align:center;white-space:nowrap;">
                <strong style="font-size:13px;color:#0B3D91;display:block;margin-bottom:8px;">📍 ${escapeHtml(fp.name)}</strong>
                <button id="pick-${fp.id}" style="padding:6px 16px;background:#0B3D91;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">${escapeHtml(selectLabelRef.current)}</button>
              </div>`,
            removable: true,
          });

          kakao.maps.event.addListener(marker, 'click', () => {
            hoverInfoWindow.close();
            pickInfoWindow.open(map, marker);
            setTimeout(() => {
              const btn = document.getElementById(`pick-${fp.id}`);
              if (btn) btn.onclick = () => { pickInfoWindow.close(); onSelectRef.current(fp); };
            }, 0);
          });

          return marker;
        });

        new kakao.maps.MarkerClusterer({
          map,
          markers,
          gridSize: 60,
          averageCenter: true,
          minLevel: 5,
        });

        setMapStatus('ready');
      });
    }).catch(() => setMapStatus('error'));

    return () => { cancelled = true; };
  }, [points]); // onSelect·selectLabel은 ref로 안정화 — deps에서 제외

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.mapPickerOverlay}>
      <div className={styles.mapPickerModal}>
        <div className={styles.mapPickerHeader}>
          <span>{title}</span>
          <button className={styles.mapPickerClose} onClick={onClose}>✕</button>
        </div>
        <p className={styles.mapPickerHint}>{hint}</p>
        {mapStatus === 'loading' && (
          <div className={styles.mapPickerLoading}>
            <div className={styles.spinner} />
          </div>
        )}
        {mapStatus === 'error' && (
          <div className={styles.mapPickerLoading}>
            <p className={styles.mapPickerError}>지도를 불러오지 못했습니다.</p>
          </div>
        )}
        {mapStatus === 'ready' && points.length === 0 && emptyMessage && (
          <p className={styles.mapPickerEmpty}>{emptyMessage}</p>
        )}
        <div className={styles.mapPickerMap}>
          <div ref={mapRef} className={styles.mapPickerMapCanvas} />
          <MapTypeControl map={mapForControl} />
        </div>
      </div>
    </div>
  );
}
