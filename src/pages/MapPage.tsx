import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MapPage.module.css';

/** 카카오맵 SDK 동적 로드 */
function loadKakaoSDK(appKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).kakao?.maps) { resolve(); return; }
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('카카오맵 스크립트 로드 실패'));
    document.head.appendChild(script);
  });
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const appKey = import.meta.env.VITE_KAKAO_MAP_KEY as string | undefined;
    if (!appKey) {
      setErrorMsg('.env 파일에 VITE_KAKAO_MAP_KEY를 설정해주세요.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    // 카카오맵 SDK 먼저 로드 → 지도 띄움 → 항 데이터 따로 로드
    loadKakaoSDK(appKey)
      .then(() => {
        if (cancelled || !mapRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).kakao;
        kakao.maps.load(() => {
          if (cancelled || !mapRef.current) return;

          const map = new kakao.maps.Map(mapRef.current, {
            center: new kakao.maps.LatLng(36.5, 127.8),
            level: 9,
          });

          setStatus('ready');

          // 현재 위치 표시
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (cancelled) return;
                const userLatLng = new kakao.maps.LatLng(
                  pos.coords.latitude,
                  pos.coords.longitude
                );

                // 내 위치 마커
                const myMarker = new kakao.maps.Marker({
                  map,
                  position: userLatLng,
                  title: '내 위치',
                  image: new kakao.maps.MarkerImage(
                    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
                    new kakao.maps.Size(64, 69),
                    { offset: new kakao.maps.Point(27, 69) }
                  ),
                });

                // 내 위치로 지도 이동
                map.setCenter(userLatLng);
                map.setLevel(7);

                // 마커 클릭 시 내 위치 표시
                kakao.maps.event.addListener(myMarker, 'click', () => {
                  const infoWindow = new kakao.maps.InfoWindow({
                    content: '<div style="padding:8px 12px;font-size:13px;font-weight:600;color:#0B3D91">📍 내 위치</div>',
                  });
                  infoWindow.open(map, myMarker);
                });
              },
              () => {
                // 위치 권한 거부 시 기본 위치(한국 중심) 유지
              }
            );
          }

          // TODO: 항 마커 표시 기능 활성화 방법
          // 1. 상단에 import 추가:
          //    import { fetchAllHarbors, type HarborWithCity } from '../api/harborsApi';
          // 2. escapeHtml 함수 복구 (XSS 방지용, harbor.name/city를 HTML에 직접 삽입하므로 필수):
          //    function escapeHtml(str: string): string {
          //      return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          //                .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
          //    }
          // 3. 아래 주석 블록 해제
          /* fetchAllHarbors()
            .then((harbors) => {
              if (cancelled) return;

              harbors.forEach((harbor: HarborWithCity) => {
                const position = new kakao.maps.LatLng(harbor.lat, harbor.lng);

                const imgSrc = 'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png';
                const imgSize = new kakao.maps.Size(24, 35);
                const markerImage = new kakao.maps.MarkerImage(imgSrc, imgSize);

                const marker = new kakao.maps.Marker({
                  map,
                  position,
                  title: harbor.name,
                  image: markerImage,
                });

                const infoContent = `
                  <div style="
                    padding:14px 16px;
                    min-width:160px;
                    font-family:'Pretendard','Noto Sans KR',sans-serif;
                    border-radius:12px;
                  ">
                    <strong style="font-size:14px;color:#0B3D91">${escapeHtml(harbor.name)}</strong>
                    <p style="margin:3px 0 10px;font-size:12px;color:#64748B">${escapeHtml(harbor.city)}</p>
                    <button
                      id="pick-${harbor.id}"
                      style="
                        width:100%;
                        padding:8px 0;
                        background:linear-gradient(90deg,#0B3D91,#0096C7);
                        color:#fff;
                        border:none;
                        border-radius:8px;
                        cursor:pointer;
                        font-size:13px;
                        font-weight:600;
                      "
                    >
                      ✓ 이 항 선택하기
                    </button>
                  </div>
                `;

                const infoWindow = new kakao.maps.InfoWindow({
                  content: infoContent,
                  removable: true,
                });

                kakao.maps.event.addListener(marker, 'click', () => {
                  infoWindow.open(map, marker);
                  setTimeout(() => {
                    document
                      .getElementById(`pick-${harbor.id}`)
                      ?.addEventListener('click', () => {
                        navigate(
                          `/?city=${encodeURIComponent(harbor.city)}&portId=${encodeURIComponent(harbor.id)}`
                        );
                      });
                  }, 50);
                });
              });
            })
            .catch(() => {
              // 마커 로드 실패해도 지도는 그대로 유지
            })); */
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setErrorMsg(err.message);
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className={styles.page}>
      {/* 상단 헤더 */}
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← 돌아가기
        </button>
        <h1 className={styles.title}>낚시 포인트 지도</h1>
        <span className={styles.spacer} />
      </header>

      <p className={styles.hint}>
        ⚓ 마커를 클릭하면 해당 항을 선택할 수 있습니다
      </p>

      {/* 로딩 / 에러 오버레이 */}
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

      {/* 카카오맵 컨테이너 */}
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}
