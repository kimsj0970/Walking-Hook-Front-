import api from './authApi';

export interface ChatResponse {
  question: string;
  answer: string;
  usedChunks: number;
}

export async function askAdmin(question: string): Promise<ChatResponse> {
  const { data } = await api.post('/admin/chat', { question });
  return data.data as ChatResponse;
}
