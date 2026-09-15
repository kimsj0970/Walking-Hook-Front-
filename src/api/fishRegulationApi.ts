import api from './authApi';
import type { FishSpecies } from './fishSpecies';
import type { ClosedSeason, FishRegulation, LengthBasis } from '../data/fishRegulations';

/**
 * `GET /fish-regulations` — 어종 규제 벌크 조회.
 *
 * 서버 응답 모양이 `data/fishRegulations.ts` 구조를 그대로 따르므로 매핑은 거의 1:1 이다.
 * 공개 엔드포인트라 인증 실패와 무관하고, ETag + Cache-Control(1h) 덕에
 * 재방문 시에는 요청이 서버까지 가지 않거나 304 로 끝난다.
 */

interface ServerSeason {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  region?: string | null;
  isDefault?: boolean | null;
  excludedRegions?: string[] | null;
  areaNote?: string | null;
  noticeNo?: string | null;
  note?: string | null;
}

interface ServerRegulation {
  code: string;
  /** enum 에 없는 항목(말쥐치)은 null */
  species: string | null;
  name?: string | null;
  minLengthCm?: number | null;
  lengthBasis?: string | null;
  minWeightG?: number | null;
  note?: string | null;
  caution?: string | null;
  closedSeasons?: ServerSeason[] | null;
}

interface ServerBulk {
  effectiveDate: string;
  penaltyKrw: number;
  disclaimer: string;
  regions: string[];
  regulations: ServerRegulation[];
}

function toSeason(s: ServerSeason): ClosedSeason {
  return {
    startMonth: s.startMonth,
    startDay: s.startDay,
    endMonth: s.endMonth,
    endDay: s.endDay,
    region: s.region ?? undefined,
    isDefault: s.isDefault ?? undefined,
    excludedRegions: s.excludedRegions ?? undefined,
    areaNote: s.areaNote ?? undefined,
    noticeNo: s.noticeNo ?? undefined,
    note: s.note ?? undefined,
  };
}

function toRegulation(r: ServerRegulation): FishRegulation {
  return {
    species: r.species as FishSpecies,
    id: r.code !== r.species ? r.code : undefined,
    name: r.name ?? undefined,
    minLengthCm: r.minLengthCm ?? undefined,
    lengthBasis: (r.lengthBasis ?? undefined) as LengthBasis | undefined,
    minWeightG: r.minWeightG ?? undefined,
    note: r.note ?? undefined,
    caution: r.caution ?? undefined,
    closedSeasons: r.closedSeasons?.map(toSeason),
  };
}

export interface FishRegulationBulk {
  /** '2026.07.01' 형식 — 기존 화면 표기와 맞춘다. */
  effectiveDate: string;
  regulations: FishRegulation[];
}

export async function fetchFishRegulationBulk(): Promise<FishRegulationBulk> {
  const { data } = await api.get('/fish-regulations');
  const bulk: ServerBulk = data.data;
  return {
    effectiveDate: bulk.effectiveDate.replaceAll('-', '.'),
    // species 가 null 인 항목(말쥐치)은 어종판별 기능용이다. 웹 목록의 타입은
    // FishSpecies 를 요구하므로 여기서는 거른다 — 쥐치 항목의 caution 이 대신 안내한다.
    regulations: bulk.regulations.filter((r) => r.species != null).map(toRegulation),
  };
}
