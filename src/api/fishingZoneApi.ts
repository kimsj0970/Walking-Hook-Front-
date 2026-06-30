import api from './authApi';

export type ZoneType = 'PROHIBITED' | 'RESTRICTED';

export interface FishingZone {
  id: string;
  name: string;
  zoneType: ZoneType;
  geoJson: string;
  description: string | null;
  active: boolean;
  createdAt: string;
}

export async function fetchFishingZones(): Promise<FishingZone[]> {
  const { data } = await api.get('/fishing-zones');
  return data.data ?? [];
}

export async function fetchAdminFishingZones(): Promise<FishingZone[]> {
  const { data } = await api.get('/admin/fishing-zones');
  return data.data ?? [];
}

export async function createFishingZone(payload: {
  name: string;
  zoneType: ZoneType;
  geoJson: string;
  description: string;
}): Promise<void> {
  await api.post('/admin/fishing-zones', payload);
}

export async function updateFishingZone(
  id: string,
  payload: { name?: string; zoneType?: ZoneType; geoJson?: string; description?: string; active?: boolean },
): Promise<void> {
  await api.patch(`/admin/fishing-zones/${id}`, payload);
}

export async function deleteFishingZone(id: string): Promise<void> {
  await api.delete(`/admin/fishing-zones/${id}`);
}
