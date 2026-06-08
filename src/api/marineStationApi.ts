import api from './authApi';

export interface MarineStationMarker {
  id: string;
  stationCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  waveHeight: number | null;
  windDirection: number | null;
  windSpeed: number | null;
  gustWindSpeed: number | null;
  waterTemp: number | null;
  airTemp: number | null;
  pressure: number | null;
  humidity: number | null;
}

export async function fetchAdminMarineStations(): Promise<MarineStationMarker[]> {
  const { data } = await api.get('/admin/marine-stations');
  return (data.data ?? []) as MarineStationMarker[];
}

export interface BeachStationMarker {
  id: string;
  beachCode: string;
  beachName: string;
  latitude: number;
  longitude: number;
  cachedAt: string | null;
  cachedNoonSeCd: string | null;
  maxWspd: number | null;
  avgWtem: number | null;
  maxWvhgt: number | null;
  avgArtmp: number | null;
}

export async function fetchAdminBeachStations(): Promise<BeachStationMarker[]> {
  const { data } = await api.get('/admin/beach-stations');
  return (data.data ?? []) as BeachStationMarker[];
}
