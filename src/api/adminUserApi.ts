import api from './authApi';

export interface UserSummary {
  id: string;
  name: string | null;
  nickName: string | null;
  email: string | null;
  provider: string;
  role: string;
  point: number;
  isSuspended: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export async function fetchAdminUsers(): Promise<UserSummary[]> {
  const { data } = await api.get('/admin/users');
  return (data.data ?? []) as UserSummary[];
}

export async function setSuspended(id: string, suspend: boolean): Promise<void> {
  await api.patch(`/admin/users/${id}/suspend`, { suspend });
}
