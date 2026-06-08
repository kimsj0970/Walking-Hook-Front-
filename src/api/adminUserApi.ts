import api from './authApi';
import type { PageResult } from './noticeApi';

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

export async function fetchAdminUsersPage(page: number, size = 20): Promise<PageResult<UserSummary>> {
  const { data } = await api.get('/admin/users', { params: { page, size } });
  return data.data as PageResult<UserSummary>;
}

export async function setSuspended(id: string, suspend: boolean): Promise<void> {
  await api.patch(`/admin/users/${id}/suspend`, { suspend });
}
