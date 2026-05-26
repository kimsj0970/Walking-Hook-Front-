const BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface Harbor {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface HarborWithCity extends Harbor {
  city: string;
}

/**
 * GET /api/harbors/cities
 * 지원하는 시/군 목록 반환
 */
export async function fetchCities(): Promise<string[]> {
  const res = await fetch(`${BASE}/api/harbors/cities`);
  if (!res.ok) throw new Error(`시 목록 로드 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/harbors?city={city}
 * 해당 시/군의 항 목록 반환
 */
export async function fetchHarborsByCity(city: string): Promise<Harbor[]> {
  const res = await fetch(`${BASE}/api/harbors?city=${encodeURIComponent(city)}`);
  if (!res.ok) throw new Error(`항 목록 로드 실패 (${res.status})`);
  return res.json();
}

/**
 * GET /api/harbors/all
 * 전체 항 목록 (지도용)
 */
export async function fetchAllHarbors(): Promise<HarborWithCity[]> {
  const res = await fetch(`${BASE}/api/harbors/all`);
  if (!res.ok) throw new Error(`전체 항 목록 로드 실패 (${res.status})`);
  return res.json();
}
