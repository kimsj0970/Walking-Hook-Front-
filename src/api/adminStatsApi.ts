import api from './authApi';

export type Granularity = 'YEAR' | 'MONTH' | 'WEEK' | 'DAY';

export interface StatsBucket {
  /** 버킷 시작 날짜 (yyyy-MM-dd). 리스트 key 와 드릴다운 기준으로 쓴다. */
  key: string;
  /** 칸에 쓰는 짧은 이름 — "2026", "10월", "3주", "19" */
  label: string;
  /** 주 단위에서만 채워진다 — "10/11 ~ 10/17" */
  subLabel: string | null;
  /** 이 버킷이 품은 날수. 주가 잘렸는지는 이 값으로만 알 수 있다(3일짜리 1주). */
  days: number;
  /** 아직 진행 중인 기간 */
  partial: boolean;
  /** null = 아직 오지 않은 기간. 0 = 아무도 안 왔음. 둘을 다르게 그려야 한다. */
  activeUsers: number | null;
  newUsers: number | null;
}

export interface StatsSummary {
  /** 기간 전체 중복 제거 값. buckets 의 합과 다른 게 정상이다. */
  activeUsers: number;
  newUsers: number;
  activeAvgPerDay: number;
  /** 현재 회원 수(탈퇴자 제외). 누적 가입자가 아니다. */
  currentMembers: number;
}

export interface UserStats {
  granularity: Granularity;
  range: { from: string; to: string };
  summary: StatsSummary;
  buckets: StatsBucket[];
}

export async function fetchUserStats(
  granularity: Granularity,
  year?: number,
  month?: number,
): Promise<UserStats> {
  const params: Record<string, string | number> = { granularity };
  if (year != null) params.year = year;
  if (month != null) params.month = month;
  const { data } = await api.get('/admin/stats/users', { params });
  return data.data as UserStats;
}
