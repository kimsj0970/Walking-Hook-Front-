import api from './authApi';

export interface MarineStationMarker {
  id: string;
  stationType: string;
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
  stationType: string;
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

export interface KhoaTwStationMarker {
  id: string;
  stationType: string;
  obsCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  airTemp: number | null;
  waterTemp: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  gustWindSpeed: number | null;
  windDirection: number | null;
  currentSpeed: number | null;
  currentDirection: number | null;
  salinity: number | null;
  pressure: number | null;
}

export async function fetchAdminKhoaTwStations(): Promise<KhoaTwStationMarker[]> {
  const { data } = await api.get('/admin/khoa-tw-stations');
  return (data.data ?? []) as KhoaTwStationMarker[];
}

export interface AwsStationMarker {
  id: string;
  stationType: string;
  stnId: number;
  stnName: string;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  temperature: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  precipitation1h: number | null;
}

export async function fetchAdminAwsStations(): Promise<AwsStationMarker[]> {
  const { data } = await api.get('/admin/aws-stations');
  return (data.data ?? []) as AwsStationMarker[];
}

export interface NifsStationMarker {
  id: string;
  stationType: string;
  staCde: string;
  staNamKor: string;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  waterTemp: number | null;
}

export async function fetchAdminNifsStations(): Promise<NifsStationMarker[]> {
  const { data } = await api.get('/admin/nifs-stations');
  return (data.data ?? []) as NifsStationMarker[];
}

export interface NmpntStationMarker {
  id: string;
  stationType: string;
  mmsiCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
  observedAt: string | null;
  windSpeed: number | null;
  windDirection: number | null;
  airTemp: number | null;
  waterTemp: number | null;
}

export async function fetchAdminNmpntStations(): Promise<NmpntStationMarker[]> {
  const { data } = await api.get('/admin/nmpnt-stations');
  return (data.data ?? []) as NmpntStationMarker[];
}
