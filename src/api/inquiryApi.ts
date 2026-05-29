import api from './authApi';

export interface InquiryListItem {
  id: string;
  title: string;
  authorNickname: string;
  createdAt: string;
}

/** 관리자 전용 목록 — 닉네임 + 카카오 실명 포함 */
export interface AdminInquiryListItem {
  id: string;
  title: string;
  authorNickname: string;
  authorRealName: string;
  createdAt: string;
}

export interface InquiryDetail {
  id: string;
  title: string;
  content: string;
  authorNickname: string;
  /** 관리자에게만 반환. 일반 사용자는 null */
  authorRealName: string | null;
  createdAt: string;
}

/** 문의 등록 */
export async function createInquiry(title: string, content: string): Promise<string> {
  const { data } = await api.post('/inquiries', { title, content });
  return data.data as string;
}

/** 내 문의 목록 조회 */
export async function getMyInquiries(): Promise<InquiryListItem[]> {
  const { data } = await api.get('/inquiries');
  return data.data as InquiryListItem[];
}

/** 전체 문의 목록 조회 (관리자) — 닉네임 + 실명 모두 포함 */
export async function getAllInquiries(): Promise<AdminInquiryListItem[]> {
  const { data } = await api.get('/admin/inquiries');
  return data.data as AdminInquiryListItem[];
}

/** 문의 상세 조회 */
export async function getInquiryDetail(id: string): Promise<InquiryDetail> {
  const { data } = await api.get(`/inquiries/${id}`);
  return data.data as InquiryDetail;
}
