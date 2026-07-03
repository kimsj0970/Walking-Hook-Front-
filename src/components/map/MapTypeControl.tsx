import { useState } from 'react';
import styles from './MapTypeControl.module.css';

type MapType = 'ROADMAP' | 'SKYVIEW' | 'HYBRID';

const OPTIONS: { type: MapType; label: string }[] = [
  { type: 'ROADMAP', label: '일반' },
  { type: 'SKYVIEW', label: '위성' },
  { type: 'HYBRID', label: '하이브리드' },
];

interface MapTypeControlProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any;
  position?: 'top-right' | 'top-left';
}

export default function MapTypeControl({ map, position = 'top-right' }: MapTypeControlProps) {
  const [current, setCurrent] = useState<MapType>('ROADMAP');

  if (!map) return null;

  const handleSelect = (type: MapType) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).kakao;
    if (!kakao?.maps) return;
    map.setMapTypeId(kakao.maps.MapTypeId[type]);
    setCurrent(type);
  };

  return (
    <div className={`${styles.control} ${position === 'top-left' ? styles.topLeft : styles.topRight}`}>
      {OPTIONS.map(({ type, label }) => (
        <button
          key={type}
          type="button"
          className={`${styles.btn} ${current === type ? styles.active : ''}`}
          onClick={() => handleSelect(type)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
