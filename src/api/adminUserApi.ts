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
  monthlyVisitCount: number;
  totalVisitCount: number;
}

export interface ReRegistrationRequest {
  requestId: string;
  userId: string;
  name: string | null;
  email: string | null;
  provider: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export async function fetchAdminUsersPage(page: number, size = 20): Promise<PageResult<UserSummary>> {
  const { data } = await api.get('/admin/users', { params: { page, size } });
  return data.data as PageResult<UserSummary>;
}

export async function setSuspended(id: string, suspend: boolean): Promise<void> {
  await api.patch(`/admin/users/${id}/suspend`, { suspend });
}

export async function setRole(id: string, role: 'USER' | 'MIDDLE_ADMIN'): Promise<void> {
  await api.patch(`/admin/users/${id}/role`, { role });
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/admin/users/${id}`);
}

/** 탈퇴 사용자 즉시 활성(복구) 처리 */
export async function activateUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/activate`);
}

export async function updateNickname(id: string, nickname: string): Promise<void> {
  await api.patch(`/admin/users/${id}/nickname`, { nickname });
}

export async function fetchReRegistrationRequests(): Promise<ReRegistrationRequest[]> {
  const { data } = await api.get('/admin/users/reregistrations');
  return data.data as ReRegistrationRequest[];
}

export async function approveReRegistration(requestId: string): Promise<void> {
  await api.patch(`/admin/users/reregistrations/${requestId}/approve`);
}

export async function rejectReRegistration(requestId: string): Promise<void> {
  await api.patch(`/admin/users/reregistrations/${requestId}/reject`);
}

export async function fetchActiveUserCount(): Promise<number> {
  const { data } = await api.get('/admin/users/active-count');
  return data.data as number;
}

export async function fetchRegisteredUserCount(): Promise<number> {
  const { data } = await api.get('/admin/users/registered-count');
  return data.data as number;
}

export interface UserVisitStats {
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  retentionRate: number;
}

export async function fetchUserVisitStats(): Promise<UserVisitStats> {
  const { data } = await api.get('/admin/users/visit-stats');
  return data.data as UserVisitStats;
}
