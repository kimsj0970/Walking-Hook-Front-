import { useEffect, useSyncExternalStore } from 'react';
import { fetchFishRegulationBulk } from '../api/fishRegulationApi';
import {
  applyServerRegulations,
  regulationEffectiveDate,
  regulationStoreVersion,
  subscribeRegulations,
} from '../data/fishRegulations';

let started = false;

function ensureLoaded(): void {
  if (started) return;
  started = true;
  fetchFishRegulationBulk()
    .then(({ effectiveDate, regulations }) => applyServerRegulations(regulations, effectiveDate))
    .catch(() => {
      // 실패해도 화면은 내장 폴백으로 이미 그려져 있다. 다음 마운트에서 재시도.
      started = false;
    });
}

/**
 * 규제 데이터를 서버 값으로 갱신하고, 교체 시 리렌더를 트리거한다.
 *
 * 규제를 그리는 컴포넌트는 이 훅을 한 번 호출하고, 데이터 자체는 지금처럼
 * `listedSpecies()` 등 기존 함수로 읽으면 된다. `version` 은 useMemo 의존성용.
 */
export function useFishRegulations(): { effectiveDate: string; version: number } {
  const version = useSyncExternalStore(
    subscribeRegulations,
    regulationStoreVersion,
    regulationStoreVersion,
  );
  useEffect(() => {
    ensureLoaded();
  }, []);
  return { effectiveDate: regulationEffectiveDate(), version };
}
