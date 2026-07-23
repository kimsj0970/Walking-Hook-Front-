import api from './authApi';

export interface CctvMarker {
  obsName: string;
  displayName: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  capturedAt: string | null;
}

export async function fetchCctvList(): Promise<CctvMarker[]> {
  const { data } = await api.get('/cctv');
  return data.data ?? [];
}
