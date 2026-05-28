import api from './authApi';

export interface MarineStationMarker {
  id: string;
  stationCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
}

export async function fetchAdminMarineStations(): Promise<MarineStationMarker[]> {
  const { data } = await api.get('/admin/marine-stations');
  return data.data as MarineStationMarker[];
}
